import React from 'react';

import jsxToString from 'jsx-to-string';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'react-sidebar';

// Lodash
import _cloneDeep from 'lodash/cloneDeep';
import _filter from 'lodash/filter';
import _isFunction from 'lodash/isFunction';
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
import BaseLayerWidget from 'Map/BaseLayer/Widget';
import FilterButton from 'panoptes/FilterButton';
import Icon from 'ui/Icon';
import ImageOverlayWidget from 'Map/ImageOverlay/Widget';
import LayersControlWidget from 'Map/LayersControl/Widget';
import MapWidget from 'Map/Widget';
import OverlayWidget from 'Map/Overlay/Widget';
import QueryString from 'panoptes/QueryString';
import SelectFieldWithNativeFallback from 'panoptes/SelectFieldWithNativeFallback';
import SidebarHeader from 'ui/SidebarHeader';
import SQL from 'panoptes/SQL';
import TableMapWidget from 'Map/Table/Widget';
import TableMarkersLayerWidget from 'Map/TableMarkersLayer/Widget';
import TileLayerWidget from 'Map/TileLayer/Widget';

import 'map.scss';

import 'leaflet-providers/leaflet-providers.js';

const DEFAULT_BASE_TILE_LAYER = '— Default —';
const DEFAULT_MARKER_LAYER = '— None —';
const DEFAULT_OVERLAY_TILE_LAYER = '— None —';
const DEFAULT_IMAGE_OVERLAY_LAYER = '— None —';

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
    imageOverlayLayer: React.PropTypes.string,
    imageOverlayLayerProps: React.PropTypes.object,
    overlayTileLayer: React.PropTypes.string,
    overlayTileLayerProps: React.PropTypes.object,
    table: React.PropTypes.string,
    title: React.PropTypes.string,
    zoom: React.PropTypes.number
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
      baseTileLayer: DEFAULT_BASE_TILE_LAYER,
      overlayTileLayer: DEFAULT_OVERLAY_TILE_LAYER,
      imageOverlayLayer: DEFAULT_IMAGE_OVERLAY_LAYER,
      sidebar: true,
      table: DEFAULT_MARKER_LAYER
    };
  },

  componentDidMount() {

    // Process the Leaflet tile layer providers.

    // https://github.com/leaflet-extras/leaflet-providers
    // https://leaflet-extras.github.io/leaflet-providers/preview/
    this.attributions = {};
    this.baseTileLayers = {};
    this.baseTileLayersMenu = [];
    this.imageOverlayLayers = {};
    this.imageOverlayLayersMenu = [];
    this.overlayTileLayers = {};
    this.overlayTileLayersMenu = [];

    // Add the default baseTileLayer option, so it can be re-selected.
    this.baseTileLayers[DEFAULT_BASE_TILE_LAYER] = {};
    this.baseTileLayersMenu.push(<MenuItem key={DEFAULT_BASE_TILE_LAYER} primaryText={DEFAULT_BASE_TILE_LAYER} value={DEFAULT_BASE_TILE_LAYER} />);

    this.imageOverlayLayers[DEFAULT_IMAGE_OVERLAY_LAYER] = {};
    this.imageOverlayLayersMenu.push(<MenuItem key={DEFAULT_IMAGE_OVERLAY_LAYER} primaryText={DEFAULT_IMAGE_OVERLAY_LAYER} value={DEFAULT_IMAGE_OVERLAY_LAYER} />);


    this.overlayTileLayers[DEFAULT_OVERLAY_TILE_LAYER] = {};
    this.overlayTileLayersMenu.push(<MenuItem key={DEFAULT_OVERLAY_TILE_LAYER} primaryText={DEFAULT_OVERLAY_TILE_LAYER} value={DEFAULT_OVERLAY_TILE_LAYER} />);

/*
Origin = (-18.000064799999990,37.541627650000002)
Pixel Size = (0.041666650000000,-0.041666650000000)
Metadata:
  AREA_OR_POINT=Area
Image Structure Metadata:
  COMPRESSION=LZW
  INTERLEAVE=BAND
Corner Coordinates:
Upper Left  ( -18.0000648,  37.5416277) ( 18d 0' 0.23"W, 37d32'29.86"N)
Lower Left  ( -18.0000648, -35.0000100) ( 18d 0' 0.23"W, 35d 0' 0.04"S)
Upper Right (  52.0415739,  37.5416277) ( 52d 2'29.67"E, 37d32'29.86"N)
Lower Right (  52.0415739, -35.0000100) ( 52d 2'29.67"E, 35d 0' 0.04"S)
Center      (  17.0207545,   1.2708088) ( 17d 1'14.72"E,  1d16'14.91"N)


bounds: [[-34.9904035897, 52.0257997896], [37.54162765, -18.0000648]],

*/

    // FIXME: Hard-coded MAP maps

    this.imageOverlayLayers['MAP_Prevalence_2000_IO'] = {
      attribution: '<a href="http://www.map.ox.ac.uk/">MAP</a> | <a href="http://www.nature.com/doifinder/10.1038/nature15535">MAP credits and acknowledgements</a>',
      bounds: [[-34.9904035897, 52.0257997896], [37.54162765, -18.0000648]],
      name: 'MAP_Prevalence_2000_IO',
      opacity: 0.7,
      url: '/dist/Maps/Samples_and_Variants/MAP/Prevalence/2000/MODEL43.2000.PR.rmean.stable.COLOUR.png'
    };
    this.imageOverlayLayersMenu.push(<MenuItem key="MAP_Prevalence_2000_IO" primaryText="MAP_Prevalence_2000_IO" value="MAP_Prevalence_2000_IO" />);

    this.overlayTileLayers['MAP_Prevalence_2000_TL'] = {
      attribution: '<a href="http://www.map.ox.ac.uk/">MAP</a> | <a href="http://www.nature.com/doifinder/10.1038/nature15535">MAP credits and acknowledgements</a>',
      bounds: [[-34.9904035897, 52.0257997896], [37.54162765, -18.0000648]],
      checked: true,
      maxNativeZoom: 8,
      name: 'MAP_Prevalence_2000_TL',
      tms: true,
      opacity: 0.7,
      url: '/dist/Maps/Samples_and_Variants/MAP/Prevalence/2000/{z}/{x}/{y}.png'
    };
    this.overlayTileLayersMenu.push(<MenuItem key="MAP_Prevalence_2000_TL" primaryText="MAP_Prevalence_2000_TL" value="MAP_Prevalence_2000_TL" />);

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
        // FIXME: List of default tile layers that don't work, e.g. BasemapAT
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

    if (table === DEFAULT_MARKER_LAYER) {
      this.props.setProps({table: undefined});
    } else {
      this.props.setProps({table});
    }

  },
  handleChangeBaseTileLayer(event, selectedIndex, selectedTileLayer) {
    // NB: Ideally wanted to use objects as the SelectField values, but that didn't seem to work.

    if (selectedTileLayer === DEFAULT_BASE_TILE_LAYER) {
      this.props.setProps({baseTileLayer: undefined, baseTileLayerProps: undefined, zoom: undefined});
    } else {

      let selectedTileLayerProps = _cloneDeep(this.baseTileLayers[selectedTileLayer]);

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
  // TODO: Refactor. This is identical to handleChangeBaseTileLayer()
  handleChangeImageOverlayLayer(event, selectedIndex, selectedLayer) {

    if (selectedLayer === DEFAULT_IMAGE_OVERLAY_LAYER) {
      this.props.setProps({imageOverlayLayer: undefined, imageOverlayLayerProps: undefined, zoom: undefined});
    } else {

      let selectedLayerProps = _cloneDeep(this.imageOverlayLayers[selectedLayer]);

      // Alter the existing zoom level so that it fits within the new layer's min/maxZoom values.
      let adaptedZoom = this.props.zoom;
      if (this.props.zoom > selectedLayerProps.maxZoom) {
        adaptedZoom = selectedLayerProps.maxZoom;
      }
      if (this.props.zoom < selectedLayerProps.minZoom) {
        adaptedZoom = selectedLayerProps.minZoom;
      }

      // Evaluate any embedded attributions.
      selectedLayerProps.attribution = this.attributionReplacer(selectedLayerProps.attribution);

      this.props.setProps({imageOverlayLayer: selectedLayer, imageOverlayLayerProps: selectedLayerProps, zoom: adaptedZoom});
    }

  },
  handleChangeMap(payload) {
    let {center, zoom} = payload;
    this.props.setProps({center, zoom});
  },
  // TODO: Refactor. This is identical to handleChangeBaseTileLayer()
  handleChangeOverlayTileLayer(event, selectedIndex, selectedTileLayer) {

    if (selectedTileLayer === DEFAULT_OVERLAY_TILE_LAYER) {
      this.props.setProps({overlayTileLayer: undefined, overlayTileLayerProps: undefined, zoom: undefined});
    } else {

      let selectedTileLayerProps = _cloneDeep(this.overlayTileLayers[selectedTileLayer]);

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

      this.props.setProps({overlayTileLayer: selectedTileLayer, overlayTileLayerProps: selectedTileLayerProps, zoom: adaptedZoom});
    }

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


  render() {
    let {center, setProps, query, baseTileLayer, baseTileLayerProps, imageOverlayLayer, imageOverlayLayerProps, overlayTileLayer, overlayTileLayerProps, sidebar, table, zoom} = this.props;

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
    tableOptions = [{value: DEFAULT_MARKER_LAYER, leftIcon: undefined, label: DEFAULT_MARKER_LAYER}].concat(tableOptions);


    // If no table has been selected, just show a map with the other selected layers (if any).

    let markersLayerComponent = null;
    let baseLayerComponent = null;
    let overlayTileLayerComponent = null;
    let imageOverlayLayerComponent = null;

    if (table !== undefined && table !== DEFAULT_MARKER_LAYER) {
      // NB: This might not be used, if/when only a table has been selected.
      markersLayerComponent = (
        <OverlayWidget
          checked={true}
          name={this.config.tablesById[table].capNamePlural}
        >
          <TableMarkersLayerWidget locationDataTable={table} />
        </OverlayWidget>
      );
    }

    if (baseTileLayer !== undefined && baseTileLayer !== DEFAULT_BASE_TILE_LAYER) {
      baseLayerComponent = (
        <BaseLayerWidget
          checked={true}
          name={baseTileLayerProps.name}
        >
          <TileLayerWidget {...baseTileLayerProps} />
        </BaseLayerWidget>
      );
    }

    if (overlayTileLayer !== undefined && overlayTileLayer !== DEFAULT_OVERLAY_TILE_LAYER) {
      overlayTileLayerComponent = (
        <OverlayWidget
          checked={true}
          name={overlayTileLayerProps.name}
        >
          <TileLayerWidget {...overlayTileLayerProps} />
        </OverlayWidget>
      );
    }

    if (imageOverlayLayer !== undefined && imageOverlayLayer !== DEFAULT_IMAGE_OVERLAY_LAYER) {
      imageOverlayLayerComponent = (
        <OverlayWidget
          checked={true}
          name={imageOverlayLayerProps.name}
        >
          <ImageOverlayWidget {...imageOverlayLayerProps} />
        </OverlayWidget>
      );
    }

    let mapWidget = (
      <MapWidget
        center={center}
        setProps={setProps}
        onChange={this.handleChangeMap}
        zoom={zoom}
      />
    );

    if (markersLayerComponent) {
      mapWidget = (
        <TableMapWidget
          center={center}
          setProps={setProps}
          table={table}
          onChange={this.handleChangeMap}
          zoom={zoom}
        />
      );
    }

    if (baseLayerComponent || overlayTileLayerComponent || imageOverlayLayerComponent) {
      mapWidget = (
        <MapWidget
          center={center}
          setProps={setProps}
          onChange={this.handleChangeMap}
          zoom={zoom}
        >
          <LayersControlWidget>
            {baseLayerComponent}
            {markersLayerComponent}
            {overlayTileLayerComponent}
            {imageOverlayLayerComponent}
          </LayersControlWidget>
        </MapWidget>
      );
    }


    // FIXME: jsxToString produces markup like: center={{"lat": -0.7031073524364783, "lng": 1.40625}}
    // Whereas we need markup like: center='{"lat": -0.7031073524364783, "lng": 1.40625}'

    // Wrap the map template code in a container with dimensions.
    let templateCode = '<div style="width:300px;height:300px">' + jsxToString(mapWidget, {ignoreProps: ['setProps', 'onChange']}) + '</div>';


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
              <FilterButton table={table} query={query} onPick={this.handleQueryPick}/>
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
            floatingLabelText="Tile overlay:"
            onChange={(e, i, v) => this.handleChangeOverlayTileLayer(e, i, v)}
            value={overlayTileLayer}
          >
            {this.overlayTileLayersMenu}
          </SelectField>
          <SelectField
            autoWidth={true}
            floatingLabelText="Image overlay:"
            onChange={(e, i, v) => this.handleChangeImageOverlayLayer(e, i, v)}
            value={imageOverlayLayer}
          >
            {this.imageOverlayLayersMenu}
          </SelectField>
          <TextField
            floatingLabelText="Template code:"
            multiLine={true}
            textareaStyle={{fontFamily: "'Courier New', Courier, monospace", fontSize: '8pt', lineHeight: '8pt'}}
            value={templateCode}
          />
        </div>
      </div>
    );

    // This title appears above the map, in the blue bar.
    let mapTitle = 'Map';
    if (baseTileLayer !== undefined && baseTileLayer != DEFAULT_BASE_TILE_LAYER) {
      mapTitle = baseTileLayer + ' map';
    }
    if (table !== undefined && table !== DEFAULT_MARKER_LAYER) {
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
                  name={sidebar ? 'arrows-h' : 'bars'}
                  title={sidebar ? 'Expand' : 'Sidebar'}
                  onClick={() => setProps({sidebar: !sidebar})}/>
            <span className="text">{mapTitle}</span>
            {table ?
              <span className="block text">
                <QueryString prepend="Filter:" table={table} query={query}/>
              </span>
              : null}
          </div>
          <div className="grow">
            {mapWidget}
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = MapActions;
