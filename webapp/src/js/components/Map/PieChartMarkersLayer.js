import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import API from 'panoptes/API';
import CalcMapBounds from 'util/CalcMapBounds';
import ComponentMarker from 'Map/ComponentMarker';
import ErrorReport from 'panoptes/ErrorReporter';
import FeatureGroup from 'Map/FeatureGroup';
import Polyline from 'Map/Polyline';
import ForceLayouter from 'utils/ForceLayouter';
import LRUCache from 'util/LRUCache';
import PieChart from 'PieChart';
import MapControlComponent from 'Map/MapControlComponent';
import ColoursLegend from 'panoptes/ColoursLegend';

// Lodash
import _sumBy from 'lodash.sumby';
import _filter from 'lodash.filter';
import _map from 'lodash.map';
import _forEach from 'lodash.foreach';
import _sum from 'lodash.sum';

let PieChartMarkersLayer = createReactClass({
  displayName: 'PieChartMarkersLayer',

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('locationDataTable', 'chartDataTable', 'primKey')
  ],

  contextTypes: {
    crs: PropTypes.object,
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    changeLayerStatus: PropTypes.func
  },

  propTypes: {
    defaultResidualFractionName: PropTypes.string,
    defaultResidualSectorColor: PropTypes.string,
    chartDataTable: PropTypes.string.isRequired,
    componentColumns: PropTypes.array.isRequired,
    primKey: PropTypes.string.isRequired,
    locationDataTable: PropTypes.string.isRequired,
    locationNameProperty: PropTypes.string,
    locationSizeProperty: PropTypes.string,
    residualFractionName: PropTypes.string,
    residualSectorColor: PropTypes.string,
    showLegend: PropTypes.bool,
    disableOnClickMarker: PropTypes.bool,
    maxLegendItems: PropTypes.number
  },

  childContextTypes: {
    onClickMarker: PropTypes.func
  },

  getChildContext() {
    return {
      onClickMarker: this.handleClickMarker
    };
  },

  getDefaultProps() {
    return {
      defaultResidualFractionName: 'Other',
      defaultResidualSectorColor: 'rgb(191,191,191)',
      showLegend: true,
      disableOnClickMarker: false
    };
  },

  getInitialState() {
    return {
      markers: [],
      colours: {}
    };
  },

  // Event handlers
  handleClickMarker(e, marker) {
    const middleClick = e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({
      table: marker.locationTable,
      primKey: marker.locationPrimKey,
      switchTo: !middleClick
    });
  },

  fetchData(props, requestContext) {
    let {
      defaultResidualFractionName,
      defaultResidualSectorColor,
      locationDataTable,
      locationNameProperty,
      locationSizeProperty,
      primKey,
      chartDataTable,
      componentColumns,
      residualFractionName,
      residualSectorColor
    } = props;

    let {changeLayerStatus} = this.context;

    let locationTableConfig = this.config.tablesById[locationDataTable];
    if (locationTableConfig === undefined) {
      console.error('locationTableConfig === undefined');
      return null;
    }
    // Check that the table specified for locations has geographic coordinates.
    if (locationTableConfig.hasGeoCoord === false) {
      console.error('locationTableConfig.hasGeoCoord === false');
      return null;
    }

    changeLayerStatus({loadStatus: 'loading'});

    let locationPrimKeyProperty = locationTableConfig.primKey;

    // TODO: support lngProperty and latProperty props, to specify different geo columns.
    // If specified, use the lat lng properties from the props.
    // Otherwise, use the lat lng properties from the config.
    // let locationLongitudeProperty = lngProperty ? lngProperty : locationTableConfig.longitude;
    // let locationLatitudeProperty = latProperty ? latProperty : locationTableConfig.latitude;

    let locationLongitudeProperty = locationTableConfig.longitude;
    let locationLatitudeProperty = locationTableConfig.latitude;

    let locationColumns = [locationPrimKeyProperty, locationLongitudeProperty, locationLatitudeProperty];

    if (locationNameProperty) {
      locationColumns.push(locationNameProperty);
    } // Otherwise, the pie charts will remain nameless (prop default)

    if (locationSizeProperty) {
      locationColumns.push(locationSizeProperty);
    } // Otherwise, the pie charts will have a fixed size (prop default)


    let locationAPIargs = {
      database: this.config.dataset,
      table: locationTableConfig.id,
      columns: locationColumns,
      transpose: true
    };

    let chartAPIargs = {
      database: this.config.dataset,
      table: chartDataTable,
      columns: _map(this.config.tablesById[chartDataTable].properties, 'id'),
      primKey: this.config.tablesById[chartDataTable].primKey,
      primKeyValue: primKey
    };

    requestContext.request(
      (componentCancellation) =>
        Promise.all([
          LRUCache.get(
            `query${JSON.stringify(locationAPIargs)}`, (cacheCancellation) =>
              API.query({
                cancellation: cacheCancellation,
                ...locationAPIargs
              }),
            componentCancellation
          ),
          LRUCache.get(
            `fetchSingleRecord${JSON.stringify(chartAPIargs)}`, (cacheCancellation) =>
              API.fetchSingleRecord({
                cancellation: cacheCancellation,
                ...chartAPIargs
              }),
            componentCancellation
          )
        ])
    )
      .then(([locationData, chartData]) => {

        let markers = [];
        let colours = {};

        // Translate the fetched locationData and chartData into markers.
        let locationTableConfig = this.config.tablesById[locationDataTable];
        let locationPrimKeyProperty = locationTableConfig.primKey;

        for (let i = 0; i < locationData.length; i++) {
          let markerChartData = [];
          let locationDataPrimKey = locationData[i][locationPrimKeyProperty];

          for (let j = 0; j < componentColumns.length; j++) {
            let chartDataColumnIndex = componentColumns[j].pattern.replace('{locid}', locationDataPrimKey);
            markerChartData.push({
              name: componentColumns[j].name,
              value: (chartData[chartDataColumnIndex] !== undefined && chartData[chartDataColumnIndex] !== null) ? (chartData[chartDataColumnIndex]).toFixed(2) : 0,
              color: componentColumns[j].color
            });

            if (componentColumns[j].color in colours
              && colours[componentColumns[j].color].name !== undefined
              && colours[componentColumns[j].color].name !== componentColumns[j].name
            ) {
              console.warn('Colour %o has more than one name: 1) %o 2) %o', componentColumns[j].color, colours[componentColumns[j].color].name, componentColumns[j].name);
            }

            colours[componentColumns[j].color] = {name: componentColumns[j].name};
          }

          let sum = _sumBy(markerChartData, 'value');
          if (sum < 1) {

            let name = (residualFractionName !== undefined && residualFractionName !== null) ? residualFractionName : defaultResidualFractionName;
            let color = (residualSectorColor !== undefined && residualSectorColor !== null) ? residualSectorColor : defaultResidualSectorColor;

            markerChartData.push({
              name,
              value: (1 - sum).toFixed(2),
              color
            });

            if (color in colours
              && colours[color].name !== undefined
              && colours[color].name !== name
            ) {
              console.warn('residualSectorColor %o already has another name: 1) %o 2) %o', color, colours[color].name, name);
            }

            colours[color] = {name};
          }

          markers.push({
            chartDataTable,
            key: locationDataPrimKey,
            lat: locationData[i][locationTableConfig.latitude],
            lng: locationData[i][locationTableConfig.longitude],
            name: locationData[i][locationNameProperty],
            originalRadius: Math.sqrt(locationData[i][locationSizeProperty]),
            chartData: markerChartData,
            locationTable: locationDataTable,
            locationPrimKey: locationDataPrimKey,
            primKey
          });

        }


        // NB: calcMapBounds is only based on lat lng positions, not radii.
        let bounds = CalcMapBounds.calcMapBounds(markers);
        this.setState({markers, colours});
        changeLayerStatus({loadStatus: 'loaded', bounds});

      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        console.error(error);
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
        changeLayerStatus({loadStatus: 'error'});
      });
  },

  render() {

    let {showLegend, maxLegendItems, disableOnClickMarker} = this.props;
    let {crs, layerContainer, map} = this.context;
    let {markers, colours} = this.state;

    let size = map.getSize();
    let bounds = map.getBounds();
    let pixelArea = size.x * size.y;
    let pieAreaSum = _sum(_map(
      _filter(markers, (marker) => {
        let {lat, lng} = marker;
        return bounds.contains([lat, lng]);
      }),
      (marker) => marker.originalRadius * marker.originalRadius * 2 * Math.PI)
    );
    let lengthRatio = this.lastLengthRatio || 1;
    if (pieAreaSum > 0) {
      lengthRatio = Math.sqrt(0.15 / (pieAreaSum / pixelArea)); //Make charts cover about 15% of the map
    }
    this.lastLengthRatio = lengthRatio;
    _forEach(markers, (marker) => marker.radius = marker.originalRadius * lengthRatio);
    if (!markers.length) {
      return null;
    }

    return (
      <FeatureGroup
        layerContainer={layerContainer}
        map={map}
      >
        {showLegend ?
          <MapControlComponent position="bottomleft">
            <ColoursLegend colours={colours} maxLegendItems={maxLegendItems} />
          </MapControlComponent>
          : null
        }
        <ForceLayouter nodes={markers}>
          {
            (renderNodes) =>
              <FeatureGroup
                layerContainer={layerContainer}
                map={map}
              >
                {renderNodes.map(
                  (marker, i) =>
                    <ComponentMarker
                      key={i}
                      position={{lat: marker.lat, lng: marker.lng}}
                      onClick={!disableOnClickMarker ? (e) => this.handleClickMarker(e, marker) : undefined}
                    >
                      <PieChart
                        chartData={marker.chartData}
                        crs={crs}
                        key={i}
                        lat={marker.lat}
                        lng={marker.lng}
                        name={marker.name}
                        originalLat={marker.lat}
                        originalLng={marker.lng}
                        radius={marker.radius}
                      />
                    </ComponentMarker>
                ).concat(
                  renderNodes.map(
                    (marker, i) =>
                      <Polyline
                        className="panoptes-pie-chart-markers-layer-polyline"
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

  },
});

export default PieChartMarkersLayer;
