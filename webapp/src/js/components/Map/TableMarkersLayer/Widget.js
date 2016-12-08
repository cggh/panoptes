import React from 'react';
import d3 from 'd3';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

// Lodash
import _isEmpty from 'lodash/isEmpty';

import _sum from 'lodash/sum';
import _filter from 'lodash/filter';
import _map from 'lodash/map';
import _forEach from 'lodash/forEach';
import _size from 'lodash/size';

// Panoptes
import API from 'panoptes/API';
import CalcMapBounds from 'util/CalcMapBounds';
import ComponentMarker from 'Map/ComponentMarker/Widget';
import ErrorReport from 'panoptes/ErrorReporter';
import FeatureGroup from 'Map/FeatureGroup/Widget';
import LRUCache from 'util/LRUCache';
import SQL from 'panoptes/SQL';
import {propertyColour} from 'util/Colours';
import GeoLayouter from 'utils/GeoLayouter';
import Polyline from 'Map/Polyline';
import PieChart from 'Chart/Pie/Widget';
import DataTableView from 'panoptes/DataTableView';
import ListWithActions from 'containers/ListWithActions';

const DEFAULT_MARKER_FILL_COLOUR = '#3d8bd5';

let TableMarkersLayer = React.createClass({

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('highlight', 'primKey', 'query', 'table', 'markerColourProperty')
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
    crs: React.PropTypes.object,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    changeLayerStatus: React.PropTypes.func
  },
  propTypes: {
    highlight: React.PropTypes.string,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    primKey: React.PropTypes.string, // if not specified then all table records are used
    query: React.PropTypes.string,
    table: React.PropTypes.string,
    markerColourProperty: React.PropTypes.string
  },
  childContextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    onClickMarker: React.PropTypes.func
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map,
      onClickMarker: this.handleClickSingleMarker
    };
  },

  getInitialState() {
    return {
      markersGroupedByLocation: {}
    };
  },

  // Event handlers
  handleClickSingleMarker(e, payload) {
    let {table, primKey} = payload;
    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({table, primKey, switchTo: !middleClick});
  },
  handleClickClusterMarker(e, payload) {
    let {table, lat, lng, latProperty, lngProperty} = payload;

    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }

    let switchTo = !middleClick;

    if (this.config.tablesById[table].listView) {
      this.getFlux().actions.session.popupOpen(<ListWithActions table={table} />, switchTo);
    } else {

      let query = SQL.WhereClause.encode(SQL.WhereClause.AND([
        SQL.WhereClause.CompareFixed(latProperty, '=', lat),
        SQL.WhereClause.CompareFixed(lngProperty, '=', lng)
      ]));

      this.getFlux().actions.session.popupOpen(<DataTableView table={table} query={query} />, switchTo);
    }

  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  fetchData(props, requestContext) {

    let {highlight, primKey, table, query, markerColourProperty} = props;
    let {changeLayerStatus} = this.context;

    changeLayerStatus({loadStatus: 'loading'});

    let tableConfig = this.config.tablesById[table];
    if (tableConfig === undefined) {
      console.error('tableConfig === undefined');
      return null;
    }
    // Check that the table specified for locations has geographic coordinates.
    if (tableConfig.hasGeoCoord === false) {
      console.error('tableConfig.hasGeoCoord === false');
      return null;
    }

    let locationPrimKeyProperty = tableConfig.primKey;

    // TODO: support lngProperty and latProperty props, to specify different geo columns.
    // If specified, use the lat lng properties from the props.
    // Otherwise, use the lat lng properties from the config.
    // let locationLongitudeProperty = lngProperty ? lngProperty : locationTableConfig.longitude;
    // let locationLatitudeProperty = latProperty ? latProperty : locationTableConfig.latitude;

    let locationLongitudeProperty = tableConfig.longitude;
    let locationLatitudeProperty = tableConfig.latitude;

    let locationColumns = [locationPrimKeyProperty, locationLongitudeProperty, locationLatitudeProperty];

    // If no highlight has been specified, but a primKey has beem then convert primKey to a highlight.
    if (highlight === undefined && primKey !== undefined) {
      highlight =  locationPrimKeyProperty + ':' + primKey;
    }

    // TODO: check highlight looks like "highlightField:highlightValue"
    if (highlight !== undefined && typeof highlight === 'string' && highlight !== '') {
      let [highlightField] = highlight.split(':');
      if (highlightField !== undefined) {
        if (tableConfig.propertiesById[highlightField] === undefined) {
          console.error('The specified highlight field ' + highlightField + ' was not found in the table ' + table);
        } else {
          locationColumns.push(highlightField);
        }
      }
    }

    if (markerColourProperty !== undefined && typeof markerColourProperty === 'string' && markerColourProperty !== '') {
      if (tableConfig.propertiesById[markerColourProperty] === undefined) {
        console.error('The specified markerColourProperty field ' + markerColourProperty + ' was not found in the table ' + table);
      } else {
        locationColumns.push(markerColourProperty);
      }
    }

    requestContext.request(
      (componentCancellation) => {

        // Get all markers using the specified table.
        let locationAPIargs = {
          columns: locationColumns,
          database: this.config.dataset,
          query: this.getDefinedQuery(query, table),
          table: tableConfig.id,
          transpose: true
        };

        return LRUCache.get(
          'query' + JSON.stringify(locationAPIargs), (cacheCancellation) =>
            API.query({
              cancellation: cacheCancellation,
              ...locationAPIargs
            }),
          componentCancellation
        );

      })
      .then((data) => {

        let markers = []; // markers[] is only used for CalcMapBounds.calcMapBounds(markers)
        let markersGroupedByLocation = {};

        // Translate the fetched locationData into markers.
        let locationTableConfig = this.config.tablesById[table];
        let locationPrimKeyProperty = locationTableConfig.primKey;

        let highlightField, highlightValue = null;

        // TODO: check highlight looks like "highlightField:highlightValue"
        if (highlight !== undefined && typeof highlight === 'string' && highlight !== '') {
          [highlightField, highlightValue] = highlight.split(':');
        }

        for (let i = 0; i < data.length; i++) {

          let locationDataPrimKey = data[i][locationPrimKeyProperty];

          let isHighlighted = false;
          if (highlightField !== null && highlightValue !== null) {
            isHighlighted = (data[i][highlightField] === highlightValue ? true : false);
          }

          let fillColour = DEFAULT_MARKER_FILL_COLOUR;
          if (markerColourProperty !== undefined && markerColourProperty !== null) {
            let markerColourFunction = propertyColour(this.config.tablesById[table].propertiesById[markerColourProperty]);
            let nullifiedFillColourValue = (data[i][markerColourProperty] === '' ? null : data[i][markerColourProperty]);
            fillColour = markerColourFunction(nullifiedFillColourValue);
          }

          let lat = parseFloat(data[i][locationTableConfig.latitude]);
          let lng = parseFloat(data[i][locationTableConfig.longitude]);

          // Compose a unique key string using the location latLng
          let location = data[i][locationTableConfig.latitude] + '_' + data[i][locationTableConfig.longitude];

          let marker = {
            isHighlighted,
            table,
            lat,
            lng,
            primKey: locationDataPrimKey,
            title: locationDataPrimKey,
            fillColour,
            latProperty: locationTableConfig.latitude,
            lngProperty: locationTableConfig.longitude
          };

          markers.push({lat, lng}); // markers[] is only used for CalcMapBounds.calcMapBounds(markers)

          if (!(location in markersGroupedByLocation)) {
            markersGroupedByLocation[location] = [];
          }

          markersGroupedByLocation[location].push(marker);
        }

        this.setState({markersGroupedByLocation});
        changeLayerStatus({loadStatus: 'loaded', bounds: CalcMapBounds.calcMapBounds(markers)});

      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
        changeLayerStatus({loadStatus: 'error'});
      });
  },

  render() {

    let {crs, layerContainer, map} = this.context;
    let {markerColourProperty, table} = this.props;
    let {markersGroupedByLocation} = this.state;

    if (_isEmpty(markersGroupedByLocation)) {
      return null;
    }

    let singleMarkerWidgets = [];
    let clusterMarkers = [];

    const locationsCount = Object.keys(markersGroupedByLocation).length;
    const markersCount = _size(markersGroupedByLocation);

    for (let location in markersGroupedByLocation) {

      let markersAtLocationCount = markersGroupedByLocation[location].length;

      if (markersAtLocationCount === 1) {

        let marker = markersGroupedByLocation[location][0];

        if (marker.isHighlighted || (locationsCount === 1 && markersAtLocationCount === 1 && markerColourProperty === undefined)) {

          // FIXME: apply colour to the single pin style markers.

          singleMarkerWidgets.push(
            <ComponentMarker
              key={location}
              position={{lat: marker.lat, lng: marker.lng}}
              title={marker.title}
              onClick={(e) => this.handleClickSingleMarker(e, {table: marker.table, primKey: marker.primKey})}
              zIndexOffset={markersCount + 2}
              fillColour={marker.fillColour}
            />
          );

        } else {

          singleMarkerWidgets.push(
            <ComponentMarker
              key={location}
              position={{lat: marker.lat, lng: marker.lng}}
              title={marker.title}
              onClick={(e) => this.handleClickSingleMarker(e, {table: marker.table, primKey: marker.primKey})}
              opacity={0.8}
              zIndexOffset={1}
            >
              <svg height="12" width="12">
                <circle cx="6" cy="6" r="5" stroke="#1E1E1E" strokeWidth="1" fill={marker.fillColour} />
              </svg>
            </ComponentMarker>
          );

        }

      } else {

        // If the cluster contains markers of the same colour,
        // then use a cluster bubble (circled total number) rather than a pie chart.

        // Group markers by their colour.
        let markersGroupedByColour = {};

        for (let i = 0, len = markersGroupedByLocation[location].length; i < len; i++) {
          let colour = markersGroupedByLocation[location][i].fillColour;
          if (markersGroupedByColour[colour] === undefined) {
            markersGroupedByColour[colour] = [];
          }
          markersGroupedByColour[colour].push(markersGroupedByLocation[location][i]);
        }


        if (Object.keys(markersGroupedByColour).length > 1) {

          // If there is more than one marker colour, then use a pie chart.

          let markerChartData = [];

          // For each unique marker colour, create a pieChart sector
          for (let markerColour in markersGroupedByColour) {
            markerChartData.push({
              name: markersGroupedByColour[markerColour].map((obj) => obj.title).join(', '),
              value: markersGroupedByColour[markerColour].length,
              color: markerColour
            });
          }

          clusterMarkers.push({
            clusterType: 'pieChart',
            chartDataTable: table,
            key: location,
            lat: markersGroupedByLocation[location][0].lat,
            lng: markersGroupedByLocation[location][0].lng,
            originalRadius: Math.sqrt(markersGroupedByLocation[location].length),
            radius: 12 * Math.sqrt(markersGroupedByLocation[location].length),
            chartData: markerChartData,
            table,
            primKey: markersGroupedByLocation[location][0].primKey
          });

        } else if (Object.keys(markersGroupedByColour).length === 1) {

          // If there is only one colour, then use a cluster bubble.
          clusterMarkers.push({
            clusterType: 'bubble', // This is necessary due to object merging, although unused, to overwrite 'pieChart'.
            key: location,
            lat: markersGroupedByLocation[location][0].lat,
            lng: markersGroupedByLocation[location][0].lng,
            originalRadius: Math.sqrt(markersGroupedByLocation[location].length),
            radius: 5 * Math.sqrt(markersGroupedByLocation[location].length),
            table,
            primKey: markersGroupedByLocation[location][0].primKey,
            fillColour: markersGroupedByLocation[location][0].fillColour,
            count: markersGroupedByLocation[location].length,
            title: markersGroupedByLocation[location].map((obj) => obj.title).join(', ')
          });

        } else {
          console.error('Unhandled number of Object.keys(markersGroupedByColour): ' + Object.keys(markersGroupedByColour).length);
          console.info('markersGroupedByColour: %o', markersGroupedByColour);
          return null;
        }

      }

    }

    if (clusterMarkers.length > 0) {

      // NB: Copied from PieChartMarkersLayer
      let size = map.getSize();
      let bounds = map.getBounds();
      let pixelArea = size.x * size.y;
      let pieAreaSum = _sum(_map(
        _filter(clusterMarkers, (marker) => {
          let {lat, lng} = marker;
          return bounds.contains([lat, lng]);
        }),
        (marker) => marker.originalRadius * marker.originalRadius * 2 * Math.PI)
      );
      let lengthRatio = this.lastLengthRatio || 1;
      if (pieAreaSum > 0) {
        lengthRatio = Math.sqrt(0.005 / (pieAreaSum / pixelArea));
      }
      this.lastLengthRatio = lengthRatio;
      _forEach(clusterMarkers, (marker) => marker.radius = marker.originalRadius * lengthRatio);

      return (
        <FeatureGroup
          layerContainer={layerContainer}
          map={map}
        >
          <GeoLayouter nodes={clusterMarkers}>
            {
              (renderNodes) =>
                <FeatureGroup
                  layerContainer={layerContainer}
                  map={map}
                >
                  {
                    renderNodes.map(
                      (marker, i) => {

                        // NB: Code copied from PieChart and PieChartSector widgets
                        let pie = d3.layout.pie().sort(null);
                        let arcDescriptors = pie([1]);
                        let arc = d3.svg.arc().outerRadius(marker.radius).innerRadius(0);

                        let clusterComponent = (
                          <svg style={{overflow: 'visible'}} width="1" height="1">
                            <g className="panoptes-cluster-bubble" style={{fill: marker.fillColour}}>
                              <title>{marker.title}</title>
                              <path d={arc(arcDescriptors[0])}></path>
                              <text x="50%" y="50%" textAnchor="middle" alignmentBaseline="middle">{marker.count}</text>
                            </g>
                          </svg>
                        );

                        if (marker.clusterType === 'pieChart') {

                          clusterComponent = (
                              <PieChart
                                chartData={marker.chartData}
                                crs={crs}
                                hideValues={true}
                                lat={marker.lat}
                                lng={marker.lng}
                                originalLat={marker.lat}
                                originalLng={marker.lng}
                                radius={marker.radius}
                              />
                          );

                        }

                        let onClickPayload = {
                          table: marker.table,
                          lat: marker.lat,
                          lng: marker.lng,
                          latProperty: marker.latProperty,
                          lngProperty: marker.lngProperty
                        };

                        return (
                          <ComponentMarker
                            key={'ComponentMarker_' + i}
                            position={{lat: marker.lat, lng: marker.lng}}
                            onClick={(e) => this.handleClickClusterMarker(e, onClickPayload)}
                            opacity={0.8}
                            zIndexOffset={0}
                          >
                            {clusterComponent}
                          </ComponentMarker>
                        );


                      }
                    ).concat(
                      renderNodes.map(
                        (marker, i) =>
                          <Polyline
                            className="panoptes-table-markers-layer-polyline"
                            key={'Polyline_' + i}
                            positions={[[marker.lat, marker.lng], [marker.fixedNode.lat, marker.fixedNode.lng]]}
                          />
                      )
                    )
                  }
                </FeatureGroup>
            }
          </GeoLayouter>
          <FeatureGroup
            children={singleMarkerWidgets}
            layerContainer={layerContainer}
            map={map}
          />
        </FeatureGroup>
      );
    } else {
      return (
        <FeatureGroup
          children={singleMarkerWidgets}
          layerContainer={layerContainer}
          map={map}
        />
      );
    }

  }

});

export default TableMarkersLayer;
