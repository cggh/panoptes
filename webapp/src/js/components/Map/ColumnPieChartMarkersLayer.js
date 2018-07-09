import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

// Lodash
import _isEmpty from 'lodash.isempty';

import _sum from 'lodash.sum';
import _filter from 'lodash.filter';
import _map from 'lodash.map';
import _forEach from 'lodash.foreach';

// Panoptes
import API from 'panoptes/API';
import CalcMapBounds from 'util/CalcMapBounds';
import ComponentMarker from 'Map/ComponentMarker';
import ErrorReport from 'panoptes/ErrorReporter';
import FeatureGroup from 'Map/FeatureGroup';
import LRUCache from 'util/LRUCache';
import SQL from 'panoptes/SQL';
import ForceLayouter from 'utils/ForceLayouter';
import Polyline from 'Map/Polyline';
import PieChart from 'PieChart';
import {categoryColours} from 'util/Colours';
import MapControlComponent from 'Map/MapControlComponent';
import PropertyPrefixLegend from 'panoptes/PropertyPrefixLegend';

let ColumnPieChartMarkersLayer = createReactClass({
  displayName: 'ColumnPieChartMarkersLayer',

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('primKey', 'query', 'table')
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
    crs: PropTypes.object,
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    changeLayerStatus: PropTypes.func
  },

  propTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    primKey: PropTypes.string, // if not specified then all table records are used
    query: PropTypes.string,
    table: PropTypes.string,
    markerSizeProperty: PropTypes.string,
    prefix: PropTypes.string.isRequired,
    showLegend: PropTypes.bool,
    disableOnClickMarker: PropTypes.bool,
    maxLegendItems: PropTypes.number
  },

  childContextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    onClickMarker: PropTypes.func
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
      clusterMarkers: {}
    };
  },

  getDefaultProps() {
    return {
      showLegend: true,
      disableOnClickMarker: false
    };
  },

  // Event handlers
  handleClickClusterMarker(e, primKey) {
    let {table} = this.props;

    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({table, primKey, switchTo: !middleClick});
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  fetchData(props, requestContext) {

    let {table, query, markerSizeProperty, prefix} = props;
    let {changeLayerStatus} = this.context;

    // Invalidate state if the table has changed.
    if (table !== this.props.table) {
      this.setState({clusterMarkers: {}});
    }
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

    // Get the list of properties that have the specfied prefix.
    let propertiesWithPrefix = Object.keys(tableConfig.propertiesById).filter((key) => key.startsWith(prefix));
    locationColumns = locationColumns.concat(propertiesWithPrefix);

    if (markerSizeProperty !== undefined) {
      if (tableConfig.propertiesById[markerSizeProperty] === undefined) {
        console.error(`The specified markerSizeProperty ${markerSizeProperty} was not found in the table ${table}`);
      } else {
        locationColumns.push(markerSizeProperty);
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
          `query${JSON.stringify(locationAPIargs)}`, (cacheCancellation) =>
            API.query({
              cancellation: cacheCancellation,
              ...locationAPIargs
            }),
          componentCancellation
        );

      })
      .then((data) => {

        let markers = []; // markers[] is only used for CalcMapBounds.calcMapBounds(markers)
        let clusterMarkers = [];

        // Translate the fetched locationData into markers.
        let locationTableConfig = this.config.tablesById[table];
        let locationPrimKeyProperty = locationTableConfig.primKey;

        const colourFunction = categoryColours('__default__');

        for (let i = 0; i < data.length; i++) {

          let locationDataPrimKey = data[i][locationPrimKeyProperty];

          let lat = parseFloat(data[i][locationTableConfig.latitude]);
          let lng = parseFloat(data[i][locationTableConfig.longitude]);

          markers.push({lat, lng}); // markers[] is only used for CalcMapBounds.calcMapBounds(markers)

          let clusterMarker = {
            chartDataTable: table,
            key: locationDataPrimKey,
            primKey: locationDataPrimKey,
            name: `${locationTableConfig.propertiesById[locationPrimKeyProperty].name}: ${locationDataPrimKey}`,
            chartData: [],
            table,
            lat,
            lng,
            originalLat: lat,
            originalLng: lng,
            sum: 0
          };

          // Make pie slices for all of the values in the prefixed columns of this row.
          for (let j = 0; j < propertiesWithPrefix.length; j++) {

            let propertyWithPrefix = propertiesWithPrefix[j];
            let value = data[i][propertyWithPrefix];

            let pieChartSector = {
              name: `${locationTableConfig.propertiesById[propertyWithPrefix].name}: ${value}`,
              value,
              color: colourFunction(propertyWithPrefix)
            };

            clusterMarker.chartData.push(pieChartSector);
            clusterMarker.sum += value;
          }

          if (markerSizeProperty !== undefined) {
            clusterMarker.size = data[i][markerSizeProperty];
          } else {
            clusterMarker.size = clusterMarker.sum;
          }
          clusterMarker.originalRadius = Math.sqrt(clusterMarker.size);

          clusterMarkers.push(clusterMarker);

        }

        this.setState({clusterMarkers});
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

    let {table, prefix, showLegend, disableOnClickMarker, maxLegendItems} = this.props;
    let {crs, layerContainer, map} = this.context;
    let {clusterMarkers} = this.state;

    if (_isEmpty(clusterMarkers)) {
      return null;
    }

    if (clusterMarkers.length > 0) {

      // TODO: Extract this code to a common place.
      // NB: Copied from TableMarkersLayer; copied from PieChartMarkersLayer
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
          {showLegend ?
            <MapControlComponent position="bottomleft">
              <PropertyPrefixLegend table={table} prefix={prefix} maxLegendItems={maxLegendItems} />
            </MapControlComponent>
            : null
          }
          <ForceLayouter nodes={clusterMarkers}>
            {
              (renderNodes) =>
                <FeatureGroup>
                  {
                    renderNodes.map(
                      (marker, i) => {

                        let clusterComponent = (
                          <PieChart
                            chartData={marker.chartData}
                            crs={crs}
                            hideValues={true}
                            lat={marker.lat}
                            lng={marker.lng}
                            originalLat={marker.originalLat}
                            originalLng={marker.originalLng}
                            radius={marker.radius}
                            faceText={(marker.size).toFixed(0)}
                            name={marker.name}
                          />
                        );

                        return (
                          <ComponentMarker
                            key={`ComponentMarker_${i}`}
                            position={{lat: marker.lat, lng: marker.lng}}
                            onClick={!disableOnClickMarker ? (e) => this.handleClickClusterMarker(e, marker.primKey) : undefined}
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
                            key={`Polyline_${i}`}
                            positions={[[marker.lat, marker.lng], [marker.fixedNode.lat, marker.fixedNode.lng]]}
                          />
                      )
                    )
                  }
                </FeatureGroup>
            }
          </ForceLayouter>
        </FeatureGroup>
      );
    }

  },
});

export default ColumnPieChartMarkersLayer;
