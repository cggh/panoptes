import React from 'react';
import ComponentMarkerWidget from 'Map/ComponentMarker/Widget';

// Mixins
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Panoptes
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import FeatureGroupWidget from 'Map/FeatureGroup/Widget';
import LRUCache from 'util/LRUCache';

// Lodash
import _minBy from 'lodash/minBy';
import _maxBy from 'lodash/maxBy';

// TODO: This function is duplicated between TableMarkersLayer and PieChartMarkersLayer
function calcBounds(markers) {

  let L = window.L;
  let bounds = undefined;

  if (markers !== undefined && markers.length >= 1) {

    let northWest = L.latLng(_maxBy(markers, 'lat').lat, _minBy(markers, 'lng').lng);
    let southEast = L.latLng(_minBy(markers, 'lat').lat, _maxBy(markers, 'lng').lng);

    bounds = L.latLngBounds(northWest, southEast);
  }

  return bounds;
}

let PieChartMarkersLayerWidget = React.createClass({

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('geoTable', 'pieTable', 'primKey', 'highlight')
  ],

  contextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    onChangeBounds: React.PropTypes.func,
    onChangeLoadStatus: React.PropTypes.func
  },

  propTypes: {
    highlight: React.PropTypes.string,
    onChangeLoadStatus: React.PropTypes.func,
    pieTable: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired,
    geoTable: React.PropTypes.string.isRequired
  },

  childContextTypes: {
    onClickMarker: React.PropTypes.func
  },

  getChildContext() {
    return {
      onClickMarker: this.handleClickMarker
    };
  },

  getInitialState() {
    return {
      markers: []
    };
  },

  // Event handlers
  handleClickMarker(e, marker) {
console.log('e %o', e);
console.log('marker %o', marker);

    let {pieTable, primKey} = marker;
    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({table: pieTable, primKey: primKey.toString(), switchTo: !middleClick});
  },

  fetchData(props, requestContext) {

    let {highlight, geoTable, primKey, pieTable} = props;

    //FIXME
    primKey = undefined;


    let {onChangeBounds, onChangeLoadStatus} = this.context;
console.log('geoTable: ' + geoTable);
console.log('pieTable: ' + pieTable);
    let locationTableConfig = this.config.tablesById[geoTable];
    if (locationTableConfig === undefined) {
      console.error('locationTableConfig === undefined');
      return null;
    }
    // Check that the table specified for locations has geographic coordinates.
    if (locationTableConfig.hasGeoCoord === false) {
      console.error('locationTableConfig.hasGeoCoord === false');
      return null;
    }

    onChangeLoadStatus('loading');

    let locationPrimKeyProperty = locationTableConfig.primKey;

    // TODO: support lngProperty and latProperty props, to specify different geo columns.
    // If specified, use the lat lng properties from the props.
    // Otherwise, use the lat lng properties from the config.
    // let locationLongitudeProperty = lngProperty ? lngProperty : locationTableConfig.longitude;
    // let locationLatitudeProperty = latProperty ? latProperty : locationTableConfig.latitude;

    let locationLongitudeProperty = locationTableConfig.longitude;
    let locationLatitudeProperty = locationTableConfig.latitude;

    let locationColumns = [locationPrimKeyProperty, locationLongitudeProperty, locationLatitudeProperty];

    if (highlight) {
      let [highlightField] = highlight.split(':');
      if (highlightField) {
        locationColumns.push(highlightField);
      }
    }

    let locationColumnsColumnSpec = {};
    locationColumns.map((column) => locationColumnsColumnSpec[column] = locationTableConfig.propertiesById[column].defaultDisplayEncoding);

    requestContext.request(
      (componentCancellation) => {

        // If a primKey value has been specified, then fetch that single record,
        // Otherwise, do a page query.
        if (primKey) {

          // Fetch the single record for the specified primKey value.
          let APIargs = {
            database: this.config.dataset,
            table: geoTable,
            primKeyField: this.config.tablesById[geoTable].primKey,
            primKeyValue: primKey
          };

          return LRUCache.get(
            'fetchSingleRecord' + JSON.stringify(APIargs), (cacheCancellation) =>
              API.fetchSingleRecord({
                cancellation: cacheCancellation,
                ...APIargs
              }),
            componentCancellation
          );

        } else {

          // If no primKey is provided, then get all markers using the specified table.
          let locationAPIargs = {
            database: this.config.dataset,
            table: locationTableConfig.fetchTableName,
            columns: locationColumnsColumnSpec
          };

          return LRUCache.get(
            'pageQuery' + JSON.stringify(locationAPIargs), (cacheCancellation) =>
              API.pageQuery({
                cancellation: cacheCancellation,
                ...locationAPIargs
              }),
            componentCancellation
          );

        }

      })
      .then((data) => {

        let markers = [];

        // Translate the fetched locationData into markers.
        let locationTableConfig = this.config.tablesById[geoTable];
        let locationPrimKeyProperty = locationTableConfig.primKey;

        // If a primKey value has been specified then expect data to contain a single record.
        // Otherwise data should contain an array of records.
        if (primKey) {

          let locationDataPrimKey = data[locationPrimKeyProperty];

          markers.push({
            geoTable: geoTable,
            lat: parseFloat(data[locationTableConfig.latitude]),
            lng: parseFloat(data[locationTableConfig.longitude]),
            pieTable: pieTable,
            primKey: locationDataPrimKey,
            title: locationDataPrimKey,
          });

        } else {

          let highlightField, highlightValue = null;
          if (highlight) {
            [highlightField, highlightValue] = highlight.split(':');
          }

          for (let i = 0; i < data.length; i++) {

            let locationDataPrimKey = data[i][locationPrimKeyProperty];

            let isHighlighted = false;
            if (highlightField !== null && highlightValue !== null) {
              isHighlighted = (data[i][highlightField] === highlightValue ? true : false);
            }

            markers.push({
              isHighlighted: isHighlighted,
              geoTable: geoTable,
              lat: parseFloat(data[i][locationTableConfig.latitude]),
              lng: parseFloat(data[i][locationTableConfig.longitude]),
              pieTable: pieTable,
              primKey: locationDataPrimKey,
              title: locationDataPrimKey,
            });

          }

        }

        this.setState({
          markers: markers
        });

        onChangeBounds(calcBounds(markers));
        onChangeLoadStatus('loaded');
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));

        onChangeLoadStatus('error');
      });
  },

  render() {

    let {layerContainer, map} = this.context;
    let {markers} = this.state;

    if (!markers.length) {
      return null;
    }
console.log('PieChartMarkersLayer Markers: %o', markers);
    let markerWidgets = [];

    for (let i = 0, len = markers.length; i < len; i++) {

      let marker = markers[i];

      // TODO: Use PieChartWidget instead of svg
/*
<svg height="24" width="24">
  <circle cx="12" cy="12" r="10" stroke="#1E1E1E" strokeWidth="1" fill="#3D8BD5" />
</svg>
*/
      markerWidgets.push(
        <ComponentMarkerWidget
          key={i}
          position={[marker.lat, marker.lng]}
          title={marker.title}
          onClick={(e) => this.handleClickMarker(e, marker)}
        />
      );

    }

    return (
      <FeatureGroupWidget
        children={markerWidgets}
        layerContainer={layerContainer}
        map={map}
      />
    );

  }

});

module.exports = PieChartMarkersLayerWidget;
