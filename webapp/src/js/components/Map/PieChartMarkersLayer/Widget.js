import Immutable from 'immutable';
import React from 'react';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import API from 'panoptes/API';
import CalcMapBounds from 'utils/CalcMapBounds';
import ComponentMarkerWidget from 'Map/ComponentMarker/Widget';
import ErrorReport from 'panoptes/ErrorReporter';
import FeatureGroupWidget from 'Map/FeatureGroup/Widget';
import GeoLayouter from 'utils/GeoLayouter';
import {latlngToMercatorXY} from 'util/WebMercator'; // TODO: Is there a Leaflet equivalent?
import LRUCache from 'util/LRUCache';
import PieChartWidget from 'Chart/Pie/Widget';

// Lodash
import _cloneDeep from 'lodash/cloneDeep';
import _sumBy from 'lodash/sumBy';

let PieChartMarkersLayerWidget = React.createClass({

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
    componentColumns: React.PropTypes.object.isRequired,
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
      markers: Immutable.List()
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

    let adaptedMarkers = _cloneDeep(markers);

    if (bounds && adaptedMarkers.size > 0) {

      ////Now we have bounds we can set some sensible radii

      //Filter pies to those in bounds and work out their area. (This is in lat/lng, but we only need to be rough.)
      let nw = bounds.getNorthWest();
      let se = bounds.getSouthEast();

      //if the map starts to loop we need to correct the bounds so things don't get clipped
      if (se.lng < nw.lng) {
        se.lng = 180, nw.lng = -180;
      }

      // FIXME: pieAreaSum is always 0
      let pieAreaSum = adaptedMarkers.filter(
        (marker) =>
          marker.get('lat') > se.lat &&
          marker.get('lat') < nw.lat &&
          marker.get('lng') > nw.lng &&
          marker.get('lng') < se.lng
      )
      .map((marker) => marker.get('radius') * marker.get('radius') * 2 * Math.PI)
      .reduce((sum, val) => sum + val, 0);

      let fudge = 75; // FIXME: was 75

      if (pieAreaSum > 0) {
        nw = latlngToMercatorXY(nw);
        se = latlngToMercatorXY(se);
        let mapArea = (nw.y - se.y) * (se.x - nw.x);
        let factor = fudge * Math.sqrt(mapArea / pieAreaSum);
        this.lastFactor = factor;
      }

      if (this.lastFactor) {
        adaptedMarkers = adaptedMarkers.map((marker) => marker.set('radius', marker.get('radius') * this.lastFactor));
      } else {
        adaptedMarkers = Immutable.List();
      }

    } else {
      adaptedMarkers = Immutable.List();
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

    let locationColumnsColumnSpec = {};
    locationColumns.map((column) => locationColumnsColumnSpec[column] = locationTableConfig.propertiesById[column].defaultDisplayEncoding);

    let locationAPIargs = {
      database: this.config.dataset,
      table: locationTableConfig.fetchTableName,
      columns: locationColumnsColumnSpec
    };

    let chartAPIargs = {
      database: this.config.dataset,
      table: chartDataTable,
      primKeyField: this.config.tablesById[chartDataTable].primKey,
      primKeyValue: primKey
    };

    requestContext.request(
      (componentCancellation) =>
        Promise.all([
          LRUCache.get(
            'pageQuery' + JSON.stringify(locationAPIargs), (cacheCancellation) =>
              API.pageQuery({
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

        let markers = Immutable.List();

        // Translate the fetched locationData and chartData into markers.
        let locationTableConfig = this.config.tablesById[locationDataTable];
        let locationPrimKeyProperty = locationTableConfig.primKey;

        for (let i = 0; i < locationData.length; i++) {
          let markerChartData = [];
          let locationDataPrimKey = locationData[i][locationPrimKeyProperty];

          // FIXME: ???
          let componentColumnsArray = componentColumns.toArray();

          for (let j = 0; j < componentColumnsArray.length; j++) {
            let chartDataColumnIndex = componentColumnsArray[j].get('pattern').replace('{locid}', locationDataPrimKey);
            markerChartData.push({
              name: componentColumnsArray[j].get('name'),
              value: chartData[chartDataColumnIndex] !== null ? chartData[chartDataColumnIndex] : 0,
              color: componentColumnsArray[j].get('color')
            });
          }

          // NB: undefined == null, undefined !== null
          let sum = _sumBy(markerChartData, 'value');
          if (sum < 1)
            markerChartData.push({
              name: residualFractionName != null ? residualFractionName : defaultResidualFractionName,
              value: (1 - sum).toFixed(2),
              color: residualSectorColor != null ? residualSectorColor : defaultResidualSectorColor
            });

          // TODO FIXME: base radius on locationData[i][locationSizeProperty], e.g. Math.sqrt(locationData[i][locationSizeProperty])

          markers = markers.push(Immutable.fromJS({
            chartDataTable: chartDataTable,
            key: i,
            lat: locationData[i][locationTableConfig.latitude],
            lng: locationData[i][locationTableConfig.longitude],
            name: locationData[i][locationNameProperty],
            radius: 0.0005,
            chartData: markerChartData,
            locationTable: locationDataTable,
            locationPrimKey: locationDataPrimKey,
            primKey: primKey
          }));

        }


        // FIXME: adaptMarkerRadii always returns no markers.
        //markers = this.adaptMarkerRadii(markers, bounds);

        this.setState({markers});
        changeLayerStatus({loadStatus: 'loaded', bounds: CalcMapBounds.calcMapBounds(markers)});

      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
        changeLayerStatus({loadStatus: 'error'});
      });
  },

  render() {

    let {crs, layerContainer, map} = this.context;
    let {markers} = this.state;

    if (!markers.size) {
      return null;
    }

    return (
      <GeoLayouter nodes={markers}>
        {
          (renderNodes) =>
          <FeatureGroupWidget
            layerContainer={layerContainer}
            map={map}
          >
            {
              renderNodes.map(
                (marker, i) =>
                <ComponentMarkerWidget
                  key={i}
                  position={[marker.lat, marker.lng]}
                  onClick={(e) => this.handleClickMarker(e, marker)}
                >
                  <PieChartWidget
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
                </ComponentMarkerWidget>
              )
            }
          </FeatureGroupWidget>
        }
      </GeoLayouter>
    );

  }

});

module.exports = PieChartMarkersLayerWidget;
