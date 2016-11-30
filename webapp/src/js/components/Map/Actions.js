import React from 'react';

import jsxToString from 'jsx-to-string';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'react-sidebar';

// Lodash
import _clone from 'lodash/clone';
import _filter from 'lodash/filter';
import _map from 'lodash/map';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';

// Material UI
import MenuItem from 'material-ui/MenuItem';
import SelectField from 'material-ui/SelectField';
import TextField from 'material-ui/TextField';

// Panoptes
import BaseLayer from 'Map/BaseLayer/Widget';
import FilterButton from 'panoptes/FilterButton';
import Icon from 'ui/Icon';
import ImageOverlay from 'Map/ImageOverlay/Widget';
import LayersControl from 'Map/LayersControl/Widget';
import Map from 'Map/Widget';
import Overlay from 'Map/Overlay/Widget';
import QueryString from 'panoptes/QueryString';
import SelectFieldWithNativeFallback from 'panoptes/SelectFieldWithNativeFallback';
import SidebarHeader from 'ui/SidebarHeader';
import SQL from 'panoptes/SQL';
import TableMap from 'Map/Table/Widget';
import TableMarkersLayer from 'Map/TableMarkersLayer/Widget';
import TileLayer from 'Map/TileLayer/Widget';
import PropertySelector from 'panoptes/PropertySelector';
import PropertyLegend from 'panoptes/PropertyLegend';

import 'map.scss';

import 'leaflet-providers/leaflet-providers.js';

const NULL_BASE_TILE_LAYER = '— Default —';
const NULL_MARKER_LAYER = '— None —';
const NULL_OVERLAY_LAYER = '— None —';

let MapActions = React.createClass({
  mixins: [
    ConfigMixin,
    FluxMixin,
    PureRenderMixin
  ],

  propTypes: {
    center: React.PropTypes.object,
    setProps: React.PropTypes.func,
    query: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    baseTileLayer: React.PropTypes.string,
    baseTileLayerProps: React.PropTypes.object,
    markerColourProperty: React.PropTypes.string,
    overlayLayer: React.PropTypes.string,
    table: React.PropTypes.string,
    title: React.PropTypes.string,
    zoom: React.PropTypes.number
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      query: undefined,
      baseTileLayer: NULL_BASE_TILE_LAYER,
      overlayLayer: NULL_OVERLAY_LAYER,
      sidebar: true,
      table: NULL_MARKER_LAYER
    };
  },

  componentDidMount() {

    // Process the Leaflet tile layer providers.

    // https://github.com/leaflet-extras/leaflet-providers
    // https://leaflet-extras.github.io/leaflet-providers/preview/
    this.attributions = {};
    this.baseTileLayers = {};
    this.baseTileLayersMenu = [];
    this.overlayLayers = {};
    this.overlayLayersMenu = [];

    // Add the default baseTileLayer option, so it can be re-selected.
    this.baseTileLayers[NULL_BASE_TILE_LAYER] = {};
    this.baseTileLayersMenu.push(<MenuItem key={NULL_BASE_TILE_LAYER} primaryText={NULL_BASE_TILE_LAYER} value={NULL_BASE_TILE_LAYER} />);

    this.overlayLayers[NULL_OVERLAY_LAYER] = {};
    this.overlayLayersMenu.push(<MenuItem key={NULL_OVERLAY_LAYER} primaryText={NULL_OVERLAY_LAYER} value={NULL_OVERLAY_LAYER} />);

    for (let mapLayerKey in this.config.mapLayers) {
      this.overlayLayersMenu.push(<MenuItem key={mapLayerKey} primaryText={this.config.mapLayers[mapLayerKey].name} value={mapLayerKey} />);
    }

    if (window.L.TileLayer.Provider.providers !== undefined) {

      let providerNames = Object.keys(window.L.TileLayer.Provider.providers);
      providerNames.sort();

      for (let i = 0, len = providerNames.length; i < len; i++) {

        let providerName = providerNames[i];
        let providerObj = window.L.TileLayer.Provider.providers[providerName];

        // TODO: Support providers that require registration
        if (providerName === 'HERE' || providerName === 'MapBox') {
          continue;
        }

        // FIXME: Providers not supported here yet
        // NASAGIBS requires {time}, {tilematrixset}
        if (providerName === 'NASAGIBS') {
          continue;
        }

        let attribution = providerObj.options !== undefined ? providerObj.options.attribution : undefined;
        this.attributions[providerName] = attribution;

        let providerTileLayerObj = {
          attribution: attribution,
          ext: providerObj.options !== undefined ? providerObj.options.ext : undefined,
          format: providerObj.options !== undefined ? providerObj.options.format : undefined,
          maxZoom: providerObj.options !== undefined ? providerObj.options.maxZoom : undefined,
          minZoom: providerObj.options !== undefined ? providerObj.options.minZoom : undefined,
          name: providerName,
          variant: providerObj.options !== undefined ? providerObj.options.variant : undefined,
          url: providerObj.url
        };

        // Add the default variant of this provider's tile layer to the menu and our memory.
        // Only if
        // - there is a URL
        // - AND there is either no {variant} placeholder in the URL, OR there is both a placeholder and a value for variant.
        if (
          providerTileLayerObj.url !== undefined
          && (!providerObj.url.includes('{variant}') || (providerObj.url.includes('{variant}') && providerTileLayerObj.variant !== undefined))
          && !providerName.match('BasemapAT|FreeMapSK|NLS|OpenSeaMap')
        ) {
          let baseTileLayerId = providerName;
          this.baseTileLayers[baseTileLayerId] = providerTileLayerObj;
          this.baseTileLayersMenu.push(<MenuItem key={i} primaryText={baseTileLayerId} value={baseTileLayerId} />);
        }

        // If this provider has variants...
        // FIXME: List of tile layer variants that don't work, e.g. BasemapAT
        if (
          providerObj.variants !== undefined
          && typeof providerObj.variants === 'object'
          && !providerName.match('BasemapAT')
        ) {

          let variantKeyNames = Object.keys(providerObj.variants);
          variantKeyNames.sort();

          for (let j = 0, len = variantKeyNames.length; j < len; j++) {

            let variantKeyName = variantKeyNames[j];
            let variantObj = providerObj.variants[variantKeyName];

            let variant = (variantObj.options !== undefined && variantObj.options.variant !== undefined) ? variantObj.options.variant : providerTileLayerObj.variant;
            if (typeof variantObj === 'string') {
              variant = variantObj;
            }

            let baseTileLayerId = providerName + '.' + variantKeyName;

            let variantTileLayerObj = {
              attribution: variantObj.options !== undefined && variantObj.options.attribution !== undefined ? variantObj.options.attribution : providerTileLayerObj.attribution,
              ext: variantObj.options !== undefined && variantObj.options.ext !== undefined ? variantObj.options.ext : providerTileLayerObj.ext,
              format: variantObj.options !== undefined && variantObj.options.format !== undefined ? variantObj.options.format : providerTileLayerObj.format,
              maxZoom: variantObj.options !== undefined && variantObj.options.maxZoom !== undefined ? variantObj.options.maxZoom : providerTileLayerObj.maxZoom,
              minZoom: variantObj.options !== undefined && variantObj.options.minZoom !== undefined ? variantObj.options.minZoom : providerTileLayerObj.minZoom,
              name: baseTileLayerId,
              variant: variant,
              url: (variantObj.options !== undefined && variantObj.options.url !== undefined) ? variantObj.options.url : providerTileLayerObj.url,
            };

            if (variantTileLayerObj.url === undefined) {
              console.warn('URL could not be determined for map tile layer: ' + baseTileLayerId);
              continue;
            }

            this.baseTileLayers[baseTileLayerId] = variantTileLayerObj;
            this.baseTileLayersMenu.push(<MenuItem key={i + '_' + j} primaryText={baseTileLayerId} value={baseTileLayerId} />);

          }

        }

      }

    }

  },

  // Event handlers
  handleQueryPick(query) {
    this.props.setProps({query});
  },
  handleChangeTable(table) {

    if (table === NULL_MARKER_LAYER) {
      this.props.setProps({table: undefined});
    } else {
      this.props.setProps({table});
    }

  },
  handleChangeBaseTileLayer(event, selectedIndex, selectedTileLayer) {
    // NB: Ideally wanted to use objects as the SelectField values, but that didn't seem to work.

    if (selectedTileLayer === NULL_BASE_TILE_LAYER) {
      this.props.setProps({baseTileLayer: undefined, baseTileLayerProps: undefined, zoom: undefined});
    } else {

      let selectedTileLayerProps = _clone(this.baseTileLayers[selectedTileLayer]);

      // Alter the existing zoom level so that it fits within the new layer's min/maxZoom values.
      let adaptedZoom = this.props.zoom;
      if (this.props.zoom > selectedTileLayerProps.maxZoom) {
        adaptedZoom = selectedTileLayerProps.maxZoom;
      }
      if (this.props.zoom < selectedTileLayerProps.minZoom) {
        adaptedZoom = selectedTileLayerProps.minZoom;
      }

      // Evaluate any embedded attributions.
      selectedTileLayerProps.attribution = this.attributionReplacer(selectedTileLayerProps.attribution);

      this.props.setProps({baseTileLayer: selectedTileLayer, baseTileLayerProps: selectedTileLayerProps, zoom: adaptedZoom});
    }

  },
  handleChangeMap(payload) {
    let {center, zoom} = payload;
    this.props.setProps({center, zoom});
  },
  handleChangeOverlayLayer(event, selectedIndex, selectedTileLayer) {

    if (selectedTileLayer === NULL_OVERLAY_LAYER) {
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
  attributionReplacer(attr) {

    if (attr == undefined) {
      return undefined;
    }

    /*
      CREDIT:
      https://github.com/leaflet-extras/leaflet-providers
      https://github.com/leaflet-extras/leaflet-providers/blob/bda94330c710d88fd1cf0ed2ba37749299fff57a/leaflet-providers.js
    */
    if (attr.indexOf('{attribution.') === -1) {
      return attr;
    }
    return attr.replace(/\{attribution.(\w*)\}/,
      (match, providerName) => this.attributionReplacer(this.attributions[providerName])
    );
  },

  // NB: the behaviour depends on whether this.props.table is defined.
  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      (((table || this.props.table) && (table || this.props.table) !== NULL_MARKER_LAYER) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  render() {
    let {center, setProps, baseTileLayer, baseTileLayerProps, markerColourProperty, overlayLayer, sidebar, table, zoom} = this.props;

    let tableOptions = _map(_filter(this.config.visibleTables, (table) => table.hasGeoCoord),
      (table) => ({
        value: table.id,
        leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
        label: table.capNamePlural
      })
    );

    // Add a "no table" option
    // NB: The value cannot be undefined or null or '',
    // because that apparently causes a problem with the SelectField presentation (label superimposed on floating label).
    tableOptions = [{value: NULL_MARKER_LAYER, leftIcon: undefined, label: NULL_MARKER_LAYER}].concat(tableOptions);


    // If no table has been selected, just show a map with the other selected layers (if any).

    let markersLayerComponent = null;
    let baseLayerComponent = null;
    let overlayLayerComponent = null;


    let adaptedMarkersLayerProps = {};

    if (table !== undefined && table !== NULL_MARKER_LAYER) {

      if (this.getDefinedQuery() !== SQL.nullQuery && this.getDefinedQuery() !== this.config.tablesById[table].defaultQuery) {
        adaptedMarkersLayerProps.query = this.getDefinedQuery();
      }

      // NB: This might not be used, if/when only a table has been selected.
      markersLayerComponent = (
        <Overlay
          checked={true}
          name={this.config.tablesById[table].capNamePlural}
        >
          <TableMarkersLayer table={table} {...adaptedMarkersLayerProps} />
        </Overlay>
      );
    }

    if (baseTileLayer !== undefined && baseTileLayer !== NULL_BASE_TILE_LAYER) {

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

    if (overlayLayer !== undefined && overlayLayer !== NULL_OVERLAY_LAYER) {

      let overlayLayerConfig = this.config.mapLayers[overlayLayer];

      // NB: Leaflet uses [[south, west], [north, east]] bounds.
      let bounds = overlayLayerConfig.bounds !== undefined ? [[overlayLayerConfig.bounds.southLat, overlayLayerConfig.bounds.westLng], [overlayLayerConfig.bounds.northLat, overlayLayerConfig.bounds.eastLng]] : undefined;
      let mapLayerServerPath = '/panoptes/Maps/' + this.config.dataset + '/' + overlayLayer + '/';
      let absoluteURLPattern = /^https?:\/\/|^\/\//i;

      let overlayLayerProps = {
        attribution: overlayLayerConfig.attribution,
        bounds: bounds,
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

        overlayLayerProps.url = mapLayerServerPath + 'data.png';

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
          {...adaptedMarkersLayerProps}
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
            <TileLayer zIndex="1" />
          </BaseLayer>
        );
      }

      map = (
        <Map
          center={center}
          setProps={setProps}
          onChange={this.handleChangeMap}
          zoom={zoom}
        >
          <LayersControl>
            {baseLayerComponent}
            {overlayLayerComponent}
            {markersLayerComponent}
          </LayersControl>
        </Map>
      );

    }


    // FIXME: jsxToString produces markup like: center={{"lat": -0.7031073524364783, "lng": 1.40625}}
    // Whereas we need markup like: center='{"lat": -0.7031073524364783, "lng": 1.40625}'

    // Wrap the map template code in a container with dimensions.
    let templateCode = '<div style="width:300px;height:300px">' + jsxToString(map, {ignoreProps: ['setProps', 'onChange']}) + '</div>';


    let sidebarContent = (
      <div className="sidebar map-sidebar">
        <SidebarHeader icon={this.icon()} description="View data geographically"/>
        <div className="map-controls vertical stack">
          <SelectFieldWithNativeFallback
            autoWidth={true}
            floatingLabelText="Markers:"
            onChange={this.handleChangeTable}
            options={tableOptions}
            value={table}
          />
          {
            table ?
              <FilterButton table={table} query={this.getDefinedQuery()} onPick={this.handleQueryPick}/>
            : null
          }
          <SelectField
            autoWidth={true}
            floatingLabelText="Base layer:"
            onChange={(e, i, v) => this.handleChangeBaseTileLayer(e, i, v)}
            value={baseTileLayer}
          >
            {this.baseTileLayersMenu}
          </SelectField>
          <SelectField
            autoWidth={true}
            floatingLabelText="Overlay:"
            onChange={(e, i, v) => this.handleChangeOverlayLayer(e, i, v)}
            value={overlayLayer}
          >
            {this.overlayLayersMenu}
          </SelectField>
          {table ?
            <PropertySelector
              table={table}
              value={markerColourProperty}
              label="Marker colour"
              onSelect={this.handleChangeMarkerColourProperty}
              allowNull={true}
            />
          : null }
          {
            this.config.user.isManager ?
              <TextField
                floatingLabelText="Template code:"
                multiLine={true}
                textareaStyle={{fontFamily: "'Courier New', Courier, monospace", fontSize: '8pt', lineHeight: '8pt'}}
                value={templateCode}
              />
            : null
          }
          <div className="legend">
          {markerColourProperty ?
            <div>
            <p>Marker colours</p>
            <PropertyLegend
              table={table}
              property={markerColourProperty}
            />
            </div>
          : null }
          </div>
        </div>
      </div>
    );

    // This title appears above the map, in the blue bar.
    let mapTitle = 'Map';
    if (baseTileLayer !== undefined && baseTileLayer != NULL_BASE_TILE_LAYER) {
      mapTitle = baseTileLayer + ' map';
    }
    if (table !== undefined && table !== NULL_MARKER_LAYER) {
      mapTitle =  mapTitle + ' of ' + this.config.tablesById[table].namePlural;
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
  }
});

export default MapActions;
