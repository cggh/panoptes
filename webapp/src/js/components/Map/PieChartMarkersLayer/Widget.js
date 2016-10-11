import React from 'react';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import API from 'panoptes/API';
import CalcMapBounds from 'util/CalcMapBounds';
import ComponentMarker from 'Map/ComponentMarker/Widget';
import ErrorReport from 'panoptes/ErrorReporter';
import FeatureGroup from 'Map/FeatureGroup/Widget';
import GeoLayouter from 'utils/GeoLayouter';
import {latlngToMercatorXY} from 'util/WebMercator'; // TODO: Is there a Leaflet equivalent?
import LRUCache from 'util/LRUCache';
import PieChart from 'Chart/Pie/Widget';

// Lodash
import _cloneDeep from 'lodash/cloneDeep';
import _sumBy from 'lodash/sumBy';
import _filter from 'lodash/filter';
import _map from 'lodash/map';
import _sum from 'lodash/sum';

let PieChartMarkersLayer = React.createClass({

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('locationDataTable', 'chartDataTable', 'primKey')
  ],

  contextTypes: {
    crs: React.PropTypes.object,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    changeLayerStatus: React.PropTypes.func
  },
  propTypes: {
    defaultResidualFractionName: React.PropTypes.string,
    defaultResidualSectorColor: React.PropTypes.string,
    chartDataTable: React.PropTypes.string.isRequired,
    componentColumns: React.PropTypes.array.isRequired,
    primKey: React.PropTypes.string.isRequired,
    locationDataTable: React.PropTypes.string.isRequired,
    locationNameProperty: React.PropTypes.string,
    locationSizeProperty: React.PropTypes.string,
    residualFractionName: React.PropTypes.string,
    residualSectorColor: React.PropTypes.string
  },
  childContextTypes: {
    onClickMarker: React.PropTypes.func
  },

  getChildContext() {
    return {
      onClickMarker: this.handleClickMarker
    };
  },
  getDefaultProps() {
    return {
      defaultResidualFractionName: 'Other',
      defaultResidualSectorColor: 'rgb(191,191,191)'
    };
  },
  getInitialState() {
    return {
      markers: []
    };
  },

  // Event handlers
  handleClickMarker(e, marker) {
    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({table: marker.chartDataTable, primKey: marker.primKey, switchTo: !middleClick});
  },


  // Functions
  adaptMarkerRadii(markers, bounds) {

    let adaptedMarkers = [];

    if (bounds && markers.length > 0) {

      adaptedMarkers = _cloneDeep(markers);

      ////Now we have bounds we can set some sensible radii

      //Filter pies to those in bounds and work out their area. (This is in lat/lng, but we only need to be rough.)
      let nw = bounds.getNorthWest();
      let se = bounds.getSouthEast();

      //if the map starts to loop we need to correct the bounds so things don't get clipped
      if (se.lng < nw.lng) {
        se.lng = 180, nw.lng = -180;
      }

      // NB: the markers' positions match the bounds exactly here,
      // since the bounds have been determined automatically using the marker positions.
      let pieAreaSum = _sum(_map(
        _filter(adaptedMarkers,
          (marker) => marker.lat >= se.lat &&
            marker.lat <= nw.lat &&
            marker.lng >= nw.lng &&
            marker.lng <= se.lng
          ),
        (marker) => marker.radius * marker.radius * 2 * Math.PI));

      let fudge = 0.01; // FIXME: was 75

      if (pieAreaSum > 0) {
        nw = latlngToMercatorXY(nw);
        se = latlngToMercatorXY(se);
        let mapArea = (nw.y - se.y) * (se.x - nw.x);
        let factor = fudge * Math.sqrt(mapArea / pieAreaSum);
        this.lastFactor = factor;
      }

      if (this.lastFactor) {
        adaptedMarkers.forEach((marker) => marker.radius = marker.radius * this.lastFactor);
      } else {
        adaptedMarkers = [];
      }

    }

    return adaptedMarkers;
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
      tableConfig: this.config.tablesById[chartDataTable],
      primKeyValue: primKey
    };

    requestContext.request(
      (componentCancellation) =>
        Promise.all([
          LRUCache.get(
            'query' + JSON.stringify(locationAPIargs), (cacheCancellation) =>
              API.query({
                cancellation: cacheCancellation,
                ...locationAPIargs
              }),
            componentCancellation
          ),
          LRUCache.get(
            'fetchSingleRecord' + JSON.stringify(chartAPIargs), (cacheCancellation) =>
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
              value: (chartData[chartDataColumnIndex] !== undefined && chartData[chartDataColumnIndex] !== null) ? chartData[chartDataColumnIndex] : 0,
              color: componentColumns[j].color
            });
          }

          let sum = _sumBy(markerChartData, 'value');
          if (sum < 1) {
            markerChartData.push({
              name: (residualFractionName !== undefined && residualFractionName !== null) ? residualFractionName : defaultResidualFractionName,
              value: (1 - sum).toFixed(2),
              color: (residualSectorColor !== undefined && residualSectorColor !== null) ? residualSectorColor : defaultResidualSectorColor
            });
          }

          markers.push({
            chartDataTable: chartDataTable,
            key: i,
            lat: locationData[i][locationTableConfig.latitude],
            lng: locationData[i][locationTableConfig.longitude],
            name: locationData[i][locationNameProperty],
            radius: Math.sqrt(locationData[i][locationSizeProperty]),
            chartData: markerChartData,
            locationTable: locationDataTable,
            locationPrimKey: locationDataPrimKey,
            primKey: primKey
          });

        }


        // NB: calcMapBounds is only based on lat lng positions, not radii.
        let bounds = CalcMapBounds.calcMapBounds(markers);

        markers = this.adaptMarkerRadii(markers, bounds);

        this.setState({markers});
        changeLayerStatus({loadStatus: 'loaded', bounds: bounds});

      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
        changeLayerStatus({loadStatus: 'error'});
        throw error;
      });
  },

  render() {

    let {crs, layerContainer, map} = this.context;
    let {markers} = this.state;

    if (!markers.length) {
      return null;
    }

    return (
      <GeoLayouter nodes={markers}>
        {
          (renderNodes) =>
          <FeatureGroup
            layerContainer={layerContainer}
            map={map}
          >
            {
              renderNodes.map(
                (marker, i) =>
                <ComponentMarker
                  key={i}
                  position={{lat: marker.lat, lng: marker.lng}}
                  onClick={(e) => this.handleClickMarker(e, marker)}
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
              )
            }
          </FeatureGroup>
        }
      </GeoLayouter>
    );

  }

});

module.exports = PieChartMarkersLayer;
