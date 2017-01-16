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
import Histogram from 'Histogram';
import {scaleColour} from 'util/Colours';

const DEFAULT_MARKER_FILL_COLOUR = '#3d8bd5';
const HISTOGRAM_WIDTH_PIXELS = 100;
const MINIMUM_BUBBLE_RADIUS = 10;

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
    let {table, originalLat, originalLng, latProperty, lngProperty} = payload;
    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    let switchTo = !middleClick;

    if (this.config.tablesById[table].listView) {
      this.getFlux().actions.session.popupOpen(<ListWithActions table={table} />, switchTo);
    } else {

      // Don't show a table that has no showable columns.
      let showableColumns = _map(_filter(this.config.tablesById[table].properties, (prop) => prop.showByDefault && prop.showInTable), (prop) => prop.id);

      if (showableColumns instanceof Array && showableColumns.length > 0) {

        let whereClause = SQL.WhereClause.AND([
          SQL.WhereClause.CompareFixed(latProperty, '=', originalLat),
          SQL.WhereClause.CompareFixed(lngProperty, '=', originalLng)
        ]);
        whereClause.isRoot = true;
        let query = SQL.WhereClause.encode(whereClause);

        this.getFlux().actions.session.popupOpen(<DataTableView key={table + '_' + query} table={table} query={query} columns={showableColumns} />, switchTo);
      }


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

    // If no highlight has been specified, but a primKey has been then convert primKey to a highlight.
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

          let valueAsColour = DEFAULT_MARKER_FILL_COLOUR;
          let value = undefined;
          if (markerColourProperty !== undefined && markerColourProperty !== null) {
            let markerColourFunction = propertyColour(this.config.tablesById[table].propertiesById[markerColourProperty]);
            let nullifiedValue = (data[i][markerColourProperty] === '' ? null : data[i][markerColourProperty]);
            valueAsColour = markerColourFunction(nullifiedValue);
            value = nullifiedValue;
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
            valueAsColour,
            value,
            latProperty: locationTableConfig.latitude,
            lngProperty: locationTableConfig.longitude,
            originalLat: lat,
            originalLng: lng
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

    let markerColourPropertyIsNumerical = false;
    let markerColourPropertyIsCategorical = false;

    if (markerColourProperty !== undefined && markerColourProperty !== null) {
      markerColourPropertyIsNumerical = this.config.tablesById[table].propertiesById[markerColourProperty].isNumerical;
      markerColourPropertyIsCategorical = this.config.tablesById[table].propertiesById[markerColourProperty].isCategorical;
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

          // NB: Don't give highlighted markers the default colour,
          // because it might lose its highlighted-ness amongst other (non-highlighted) default-coloured markers.

          singleMarkerWidgets.push(
            <ComponentMarker
              key={location}
              position={{lat: marker.lat, lng: marker.lng}}
              title={marker.title}
              onClick={(e) => this.handleClickSingleMarker(e, {table: marker.table, primKey: marker.primKey})}
              zIndexOffset={2 * markersCount}
              fillColour={marker.valueAsColour !== DEFAULT_MARKER_FILL_COLOUR ? marker.valueAsColour : undefined}
            />
          );

        } else {

          let title = marker.title;
          if (markerColourProperty !== undefined && markerColourProperty !== null) {
            if (marker.value !== undefined) {
              title = `${this.config.tablesById[table].propertiesById[markerColourProperty].name}: ${marker.value}`;
            }
            if (markerColourProperty !== this.config.tablesById[table].primKey) {
              title = `${this.config.tablesById[table].propertiesById[this.config.tablesById[table].primKey].name}: ${marker.primKey}\n` + title;
            }
          }

          singleMarkerWidgets.push(
            <ComponentMarker
              key={title}
              position={{lat: marker.lat, lng: marker.lng}}
              title={title}
              onClick={(e) => this.handleClickSingleMarker(e, {table: marker.table, primKey: marker.primKey})}
              opacity={0.8}
              zIndexOffset={markersCount}
            >
              <svg height="12" width="12">
                <circle cx="6" cy="6" r="5" stroke="#1E1E1E" strokeWidth="1" fill={marker.valueAsColour} />
              </svg>
            </ComponentMarker>
          );

        }

      } else {

        // If the cluster contains markers of the same value,
        // then use a cluster bubble (circled total number) rather than a pie chart.

        // Group markers by their value.
        let markersGroupedByValue = {};

        for (let i = 0, len = markersGroupedByLocation[location].length; i < len; i++) {
          let value = markersGroupedByLocation[location][i].value;
          if (markersGroupedByValue[value] === undefined) {
            markersGroupedByValue[value] = [];
          }
          markersGroupedByValue[value].push(markersGroupedByLocation[location][i]);
        }


        if (Object.keys(markersGroupedByValue).length > 1) {

          // If there is more than one unique marker value at this location, then:
          //   if the markerColourPropertyIsNumerical or both numerical && categorical, then use a histogram.
          //   otherwise if the markerColourPropertyIsCategorical or neither, then use a pie chart;

          if (markerColourPropertyIsNumerical || (markerColourPropertyIsNumerical && markerColourPropertyIsCategorical)) {

            //// Prepare a histogram

            // Create a chart item (histogram bin) for each unique marker value.
            // NB: all markers that have the same value also have the same valueAsColour.
            let markerChartData = [];
            let minValue = undefined;
            let maxValue = undefined;
            for (let value in markersGroupedByValue) {
              markerChartData.push({
                name: markersGroupedByValue[value].map((obj) => obj.title).join(', '),
                value: markersGroupedByValue[value][0].value,
                color: markersGroupedByValue[value][0].valueAsColour
              });
              minValue = (minValue === undefined || markersGroupedByValue[value][0].value < minValue) ? minValue = markersGroupedByValue[value][0].value : minValue;
              maxValue = (maxValue === undefined || markersGroupedByValue[value][0].value > maxValue) ? maxValue = markersGroupedByValue[value][0].value : maxValue;
            }

            // NB: The originalRadius is for the GeoLayouter collision detection.
            const histogramRadius = Math.sqrt(2 * Math.pow((HISTOGRAM_WIDTH_PIXELS / 2), 2));

            // NB: The colours associated with the individual values
            // can not be applied to the histogram,
            // at least not to the fillColour of the bins,
            // because each bin represents a range of values.

            clusterMarkers.push({
              clusterType: 'histogram',
              chartDataTable: table,
              key: location,
              lat: markersGroupedByLocation[location][0].lat,
              lng: markersGroupedByLocation[location][0].lng,
              originalRadius: histogramRadius,
              chartData: markerChartData,
              table,
              primKey: markersGroupedByLocation[location][0].primKey,
              colourScaleFunction: scaleColour([minValue, maxValue]),
              latProperty: markersGroupedByLocation[location][0].latProperty,
              lngProperty: markersGroupedByLocation[location][0].lngProperty,
              originalLat: markersGroupedByLocation[location][0].originalLat,
              originalLng: markersGroupedByLocation[location][0].originalLng
            });

          } else {

            // Includes markerColourPropertyIsCategorical
            // as well as neither isCategorical nor isNumerical

            // NB: This includes that case when a primary key is selected as markerColourProperty.
            // The primary key property (isPrimKey) should not be categorical, if it is to be unique,
            // but showing a pieChart is more visually useful than showing a histogram.

            //// Prepare a pie chart

            // Create a chart item (pie chart sector) for each unique marker value.
            // NB: all markers that have the same value also have the same colour.
            let markerChartData = [];
            for (let value in markersGroupedByValue) {
              markerChartData.push({
                name: markersGroupedByValue[value].length + ' ' + this.config.tablesById[table].namePlural + '\n' + markersGroupedByValue[value].map((obj) => obj.title).join(', '),
                value: markersGroupedByValue[value].length,
                color: markersGroupedByValue[value][0].valueAsColour
              });
            }

            clusterMarkers.push({
              clusterType: 'pieChart',
              chartDataTable: table,
              key: location,
              lat: markersGroupedByLocation[location][0].lat,
              lng: markersGroupedByLocation[location][0].lng,
              originalRadius: Math.sqrt(markersGroupedByLocation[location].length),
              chartData: markerChartData,
              table,
              primKey: markersGroupedByLocation[location][0].primKey,
              latProperty: markersGroupedByLocation[location][0].latProperty,
              lngProperty: markersGroupedByLocation[location][0].lngProperty,
              originalLat: markersGroupedByLocation[location][0].originalLat,
              originalLng: markersGroupedByLocation[location][0].originalLng
            });

          }

        } else if (Object.keys(markersGroupedByValue).length === 1) {

          // If there is only one colour, then use a cluster bubble.
          clusterMarkers.push({
            clusterType: 'bubble', // This is necessary due to object merging, although unused, to overwrite 'pieChart' or 'histogram', etc.
            key: location,
            lat: markersGroupedByLocation[location][0].lat,
            lng: markersGroupedByLocation[location][0].lng,
            originalRadius: Math.sqrt(markersGroupedByLocation[location].length),
            table,
            primKey: markersGroupedByLocation[location][0].primKey,
            valueAsColour: markersGroupedByLocation[location][0].valueAsColour,
            count: markersGroupedByLocation[location].length,
            title: markersGroupedByLocation[location].length + ' ' + this.config.tablesById[table].namePlural + '\n' + markersGroupedByLocation[location].map((obj) => obj.title).join(', '),
            latProperty: markersGroupedByLocation[location][0].latProperty,
            lngProperty: markersGroupedByLocation[location][0].lngProperty,
            originalLat: markersGroupedByLocation[location][0].originalLat,
            originalLng: markersGroupedByLocation[location][0].originalLng
          });

        } else {
          console.error('Unhandled number of Object.keys(markersGroupedByValue): ' + Object.keys(markersGroupedByValue).length);
          console.info('markersGroupedByValue: %o', markersGroupedByValue);
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
        lengthRatio = Math.sqrt(0.15 / (pieAreaSum / pixelArea));
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

                        let bubbleRadius = marker.radius > MINIMUM_BUBBLE_RADIUS ? marker.radius : MINIMUM_BUBBLE_RADIUS;

                        // Default to using a bubble cluster marker.valueAsColour
                        let clusterComponent = (
                          <svg style={{overflow: 'visible'}} width={bubbleRadius} height={bubbleRadius}>
                            <g className="panoptes-cluster-bubble" style={{fill: marker.valueAsColour}}>
                              <title>{marker.title}</title>
                              <circle cx={bubbleRadius / 2} cy={bubbleRadius / 2} r={bubbleRadius} />
                              <text x="50%" y="50%" textAnchor="middle" alignmentBaseline="middle" fontSize="10">{marker.count}</text>
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
                                originalLat={marker.originalLat}
                                originalLng={marker.originalLng}
                                radius={marker.radius}
                              />
                          );

                        } else if (marker.clusterType === 'histogram') {

                          const histogramWidth = Math.sqrt(Math.pow(marker.radius, 2) / 2) * 2;

                          clusterComponent = (
                              <Histogram
                                chartData={marker.chartData}
                                width={histogramWidth}
                                height={histogramWidth}
                                radius={marker.radius}
                                lat={marker.lat}
                                lng={marker.lng}
                                originalLat={marker.originalLat}
                                originalLng={marker.originalLng}
                                unitNameSingle={this.config.tablesById[table].nameSingle}
                                unitNamePlural={this.config.tablesById[table].namePlural}
                                valueName={this.config.tablesById[table].propertiesById[markerColourProperty].name}
                                colourScaleFunction={marker.colourScaleFunction}
                              />
                          );

                        }

                        let onClickPayload = {
                          table: marker.table,
                          originalLat: marker.originalLat,
                          originalLng: marker.originalLng,
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
