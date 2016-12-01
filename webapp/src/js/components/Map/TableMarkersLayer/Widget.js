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
import LRUCache from 'util/LRUCache';
import SQL from 'panoptes/SQL';
import {propertyColour} from 'util/Colours';

let TableMarkersLayer = React.createClass({

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('highlight', 'primKey', 'query', 'table', 'markerColourProperty')
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
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
    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (!middleClick) {
      e.originalEvent.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({table: marker.table, primKey: marker.primKey, switchTo: !middleClick});
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

        let markers = [];

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

          let fillColour = '#3D8BD5';
          if (markerColourProperty !== undefined) {
            let markerColourFunction = propertyColour(this.config.tablesById[table].propertiesById[markerColourProperty]);
            let nullifiedFillColourValue = (data[i][markerColourProperty] === '' ? null : data[i][markerColourProperty]);
            fillColour = markerColourFunction(nullifiedFillColourValue);
          }

          markers.push({
            isHighlighted: isHighlighted,
            table,
            lat: parseFloat(data[i][locationTableConfig.latitude]),
            lng: parseFloat(data[i][locationTableConfig.longitude]),
            primKey: locationDataPrimKey,
            title: locationDataPrimKey,
            fillColour
          });

        }

        this.setState({markers});
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

    let {layerContainer, map} = this.context;
    let {markers} = this.state;

    if (!markers.length) {
      return null;
    }

    let markerWidgets = [];

    for (let i = 0, len = markers.length; i < len; i++) {

      let marker = markers[i];

      if (marker.isHighlighted || len === 1) {

        markerWidgets.push(
          <ComponentMarker
            key={i}
            position={{lat: marker.lat, lng: marker.lng}}
            title={marker.title}
            onClick={(e) => this.handleClickMarker(e, marker)}
            zIndexOffset={len}
          />
        );

      } else {

        markerWidgets.push(
          <ComponentMarker
            key={i}
            position={{lat: marker.lat, lng: marker.lng}}
            title={marker.title}
            onClick={(e) => this.handleClickMarker(e, marker)}
            zIndexOffset={i}
          >
            <svg height="12" width="12">
              <circle cx="6" cy="6" r="5" stroke="#1E1E1E" strokeWidth="1" fill={marker.fillColour} />
            </svg>
          </ComponentMarker>
        );

      }

    }

    return (
      <FeatureGroup
        children={markerWidgets}
        layerContainer={layerContainer}
        map={map}
      />
    );

  }

});

export default TableMarkersLayer;
