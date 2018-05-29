import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import scrollbarSize from 'scrollbar-size';
import Sidebar from 'ui/Sidebar';

// Lodash
import _clone from 'lodash.clone';
import _filter from 'lodash.filter';
import _map from 'lodash.map';
import _keys from 'lodash.keys';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';

// Panoptes
import BaseLayer from 'Map/BaseLayer';
import FilterButton from 'panoptes/FilterButton';
import Icon from 'ui/Icon';
import ImageOverlay from 'Map/ImageOverlay';
import LayersControl from 'Map/LayersControl';
import Map from 'Map/Map';
import Overlay from 'Map/Overlay';
import QueryString from 'panoptes/QueryString';
import SelectWithNativeFallback from 'panoptes/SelectWithNativeFallback';
import SidebarHeader from 'ui/SidebarHeader';
import SQL from 'panoptes/SQL';
import TableMap from 'Map/Table';
import TableMarkersLayer from 'Map/TableMarkersLayer';
import TileLayer from 'Map/TileLayer';
import PropertySelector from 'panoptes/PropertySelector';
import baseLayerProviders from 'util/baseLayerProviders';

import 'map.scss';


let MapActions = createReactClass({
  displayName: 'MapActions',

  mixins: [
    ConfigMixin,
    FluxMixin,
    PureRenderMixin
  ],

  propTypes: {
    center: PropTypes.object,
    setProps: PropTypes.func,
    query: PropTypes.string,
    sidebar: PropTypes.bool,
    baseTileLayer: PropTypes.string,
    baseTileLayerProps: PropTypes.object,
    markerColourProperty: PropTypes.string,
    overlayLayer: PropTypes.string,
    table: PropTypes.string,
    title: PropTypes.string,
    zoom: PropTypes.number
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      sidebar: true,
    };
  },

  componentWillMount() {

    // Process the Leaflet tile layer providers.

    // https://github.com/leaflet-extras/leaflet-providers
    // https://leaflet-extras.github.io/leaflet-providers/preview/
    this.baseTileLayersMenu = [];
    this.overlayLayers = {};
    this.overlayLayersMenu = [];

    for (let mapLayerKey in this.config.mapLayers) {
      this.overlayLayersMenu.push({label: this.config.mapLayers[mapLayerKey].name, value: mapLayerKey});
    }

    let baseLayers = _keys(baseLayerProviders);
    for (let i = 0; i < baseLayers.length; i++) {
      let name = baseLayers[i];
      this.baseTileLayersMenu.push({label: name, value: name});
    }
  },

  // Event handlers
  handleQueryPick(query) {
    this.props.setProps({query});
  },

  handleChangeTable(table) {

    if (table === '') {
      this.props.setProps({table: undefined});
    } else {
      this.props.setProps({table, markerColourProperty: undefined});
    }

  },

  handleChangeBaseTileLayer(selectedTileLayer) {
    // NB: Ideally wanted to use objects as the SelectField values, but that didn't seem to work.

    if (selectedTileLayer === '') {
      this.props.setProps({baseTileLayer: undefined, baseTileLayerProps: undefined, zoom: undefined});
    } else {

      let selectedTileLayerProps = _clone(baseLayerProviders[selectedTileLayer]);

      // Alter the existing zoom level so that it fits within the new layer's min/maxZoom values.
      let adaptedZoom = this.props.zoom;
      if (this.props.zoom > selectedTileLayerProps.maxZoom) {
        adaptedZoom = selectedTileLayerProps.maxZoom;
      }
      if (this.props.zoom < selectedTileLayerProps.minZoom) {
        adaptedZoom = selectedTileLayerProps.minZoom;
      }

      this.props.setProps({baseTileLayer: selectedTileLayer, baseTileLayerProps: selectedTileLayerProps, zoom: adaptedZoom});
    }

  },

  handleChangeMap(payload) {
    let {center, zoom} = payload;
    this.props.setProps({center, zoom}, true);
  },

  handleChangeOverlayLayer(selectedTileLayer) {

    if (selectedTileLayer === '') {
      this.props.setProps({overlayLayer: undefined});
    } else {
      this.props.setProps({overlayLayer: selectedTileLayer});
    }

  },

  handleChangeMarkerColourProperty(markerColourProperty) {
    this.props.setProps({markerColourProperty});
  },

  // Other functions
  icon() {
    return 'globe';
  },

  title() {
    return this.props.title || 'Map Composer';

  },

  // NB: the behaviour depends on whether this.props.table is defined.
  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  render() {
    let {
      center,
      setProps,
      baseTileLayer,
      baseTileLayerProps,
      markerColourProperty,
      overlayLayer,
      sidebar,
      table,
      zoom
    } = this.props;

    let tableOptions = _map(_filter(this.config.visibleTables, (table) => table.hasGeoCoord),
      (table) => ({
        value: table.id,
        leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
        label: table.capNamePlural
      })
    );

    // If no table has been selected, just show a map with the other selected layers (if any).
    let markersLayerComponent = null;
    let baseLayerComponent = null;
    let overlayLayerComponent = null;

    let query = undefined;

    if (table !== undefined) {

      if (this.getDefinedQuery() !== SQL.nullQuery && this.getDefinedQuery() !== this.config.tablesById[table].defaultQuery) {
        query = this.getDefinedQuery();
      }

      // NB: This might not be used, if/when only a table has been selected.
      markersLayerComponent = (
        <Overlay
          checked={true}
          name={this.config.tablesById[table].capNamePlural}
        >
          <TableMarkersLayer
            table={table}
            query={query}
            markerColourProperty={markerColourProperty}
          />
        </Overlay>
      );
    }

    if (baseTileLayer !== undefined) {

      // Place the base tile layer below the overlay layer tile layer.
      baseTileLayerProps.zIndex = baseTileLayerProps.zIndex !== undefined ? baseTileLayerProps.zIndex : 1;

      baseLayerComponent = (
        <BaseLayer
          checked={true}
          key={baseTileLayer}
          name={baseTileLayerProps.name}
        >
          <TileLayer {...baseTileLayerProps} />
        </BaseLayer>
      );
    }

    if (overlayLayer !== undefined) {

      let overlayLayerConfig = this.config.mapLayers[overlayLayer];

      // NB: Leaflet uses [[south, west], [north, east]] bounds.
      let bounds = overlayLayerConfig.bounds !== undefined ? [[overlayLayerConfig.bounds.southLat, overlayLayerConfig.bounds.westLng], [overlayLayerConfig.bounds.northLat, overlayLayerConfig.bounds.eastLng]] : undefined;
      let mapLayerServerPath = `/panoptes/Maps/${this.config.dataset}/${overlayLayer}/`;
      let absoluteURLPattern = /^https?:\/\/|^\/\//i;

      let overlayLayerProps = {
        attribution: overlayLayerConfig.attribution,
        bounds,
        maxNativeZoom: overlayLayerConfig.maxNativeZoom,
        opacity: overlayLayerConfig.opacity
      };

      // TODO: Convert to component with the mapLayers key as its prop.
      if (this.config.mapLayers[overlayLayer].format === 'tile') {

        overlayLayerProps.maxNativeZoom = overlayLayerConfig.maxNativeZoom;
        overlayLayerProps.tms = overlayLayerConfig.tms;
        overlayLayerProps.url = absoluteURLPattern.test(overlayLayerConfig.filePattern) ? overlayLayerConfig.filePattern : mapLayerServerPath + overlayLayerConfig.filePattern;

        // Place the overlay tile layer above the base layer tile layer.
        overlayLayerProps.zIndex = overlayLayerProps.zIndex !== undefined ? overlayLayerProps.zIndex : 2;

        overlayLayerComponent = (
          <Overlay
            checked={true}
            key={overlayLayer}
            name={this.config.mapLayers[overlayLayer].name}
          >
            <TileLayer {...overlayLayerProps} />
          </Overlay>
        );

      } else if (this.config.mapLayers[overlayLayer].format === 'image') {

        overlayLayerProps.url = `${mapLayerServerPath}data.png`;

        overlayLayerComponent = (
          <Overlay
            checked={true}
            name={this.config.mapLayers[overlayLayer].name}
          >
            <ImageOverlay {...overlayLayerProps} />
          </Overlay>
        );

      }

    }

    let map = (
      <Map
        center={center}
        setProps={setProps}
        onChange={this.handleChangeMap}
        zoom={zoom}
      />
    );

    if (markersLayerComponent) {

      map = (
        <TableMap
          query={query}
          markerColourProperty={markerColourProperty}
          center={center}
          setProps={setProps}
          table={table}
          onChange={this.handleChangeMap}
          zoom={zoom}
        />
      );

    }

    if (baseLayerComponent || overlayLayerComponent) {
      // Use a default baseLayer
      if (!baseLayerComponent) {
        baseLayerComponent = (
          <BaseLayer
            checked={true}
          >
            <TileLayer zIndex={1} />
          </BaseLayer>
        );
      }

      // NB: Setting the key to markerColourProperty avoids zombie layer options
      // appearing in the layerControl whenever the markerColourProperty changes.
      map = (
        <Map
          center={center}
          setProps={setProps}
          onChange={this.handleChangeMap}
          zoom={zoom}
        >
          <LayersControl key={markerColourProperty}>
            {baseLayerComponent}
            {overlayLayerComponent}
            {markersLayerComponent}
          </LayersControl>
        </Map>
      );

    }

    let sidebarContent = (
      <div className="sidebar map-sidebar">
        <SidebarHeader icon={this.icon()} description="View data geographically"/>
        <div className="map-controls vertical stack">
          <SelectWithNativeFallback
            fullWidth={true}
            helperText="Table for Markers"
            onChange={this.handleChangeTable}
            options={tableOptions}
            value={table}
            allowNone={true}
          />
          {
            table !== undefined ?
              <FilterButton table={table} query={this.getDefinedQuery()} onPick={this.handleQueryPick}/>
              : null
          }
          <SelectWithNativeFallback
            fullWidth={true}
            helperText="Base layer"
            onChange={this.handleChangeBaseTileLayer}
            value={baseTileLayer}
            options={this.baseTileLayersMenu}
            allowNone={true}
          />
          <SelectWithNativeFallback
            fullWidth={true}
            helperText="Overlay"
            onChange={this.handleChangeOverlayLayer}
            value={overlayLayer}
            options={this.overlayLayersMenu}
            allowNull={true}
          />
          {table !== undefined ?
            <PropertySelector
              table={table}
              value={markerColourProperty}
              label="Marker colour"
              onSelect={this.handleChangeMarkerColourProperty}
              allowNull={true}
            />
            : null }
        </div>
      </div>
    );

    // This title appears above the map, in the blue bar.
    let mapTitle = 'Map';
    if (baseTileLayer !== undefined) {
      mapTitle = `${baseTileLayer} map`;
    }
    if (table !== undefined) {
      mapTitle =  `${mapTitle} of ${this.config.tablesById[table].namePlural}`;
    }

    return (
      <Sidebar
        docked={sidebar}
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
              name={sidebar ? 'arrow-left' : 'bars'}
              title={sidebar ? 'Expand' : 'Sidebar'}
              onClick={() => setProps({sidebar: !sidebar})}/>
            <span className="text">{mapTitle}</span>
            {table ?
              <span className="block text">
                <QueryString prefix="Filter: " table={table} query={this.getDefinedQuery()}/>
              </span>
              : null}
          </div>
          <div className="grow map-content">
            {map}
          </div>
        </div>
      </Sidebar>
    );
  },
});

export default MapActions;
