import React from 'react';

import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
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
import FilterButton from 'panoptes/FilterButton';
import Icon from 'ui/Icon';
import MapWidget from 'Map/Widget';
import QueryString from 'panoptes/QueryString';
import SelectFieldWithNativeFallback from 'panoptes/SelectFieldWithNativeFallback';
import SidebarHeader from 'ui/SidebarHeader';
import SQL from 'panoptes/SQL';
import TableMapWidget from 'Map/Table/Widget';

import 'map.scss';

import 'leaflet-providers/leaflet-providers.js';

const DEFAULT_TILE_LAYER = '— Default —';

// http://gis.stackexchange.com/questions/8650/measuring-accuracy-of-latitude-and-longitude
const COORDINATES_PRECISION_IN_TEMPLATE_CODE = 5;


let TableMapActions = React.createClass({
  mixins: [
    ConfigMixin,
    FluxMixin,
    PureRenderMixin
  ],

  propTypes: {
    center: React.PropTypes.array,
    componentUpdate: React.PropTypes.func.isRequired,
    query: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    tileLayer: React.PropTypes.string,
    tileLayerProps: ImmutablePropTypes.map,
    table: React.PropTypes.string,
    title: React.PropTypes.string,
    zoom: React.PropTypes.number
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
      tileLayer: DEFAULT_TILE_LAYER,
      sidebar: true,
      table: '_NONE_'
    };
  },

  componentDidMount() {

    // Process the Leaflet tile layer providers.

    // https://github.com/leaflet-extras/leaflet-providers
    // https://leaflet-extras.github.io/leaflet-providers/preview/
    this.attributions = {};
    this.tileLayers = {};
    this.tileLayersMenu = [];

    // Add the default tileLayer options, so it can be re-selected.

    this.tileLayers[DEFAULT_TILE_LAYER] = {};
    this.tileLayersMenu.push(<MenuItem key="__DEFAULT__" primaryText={"— Default —"} value={"— Default —"} />);

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
          let tileLayerId = providerName;
          this.tileLayers[tileLayerId] = providerTileLayerObj;
          this.tileLayersMenu.push(<MenuItem key={i} primaryText={tileLayerId} value={tileLayerId} />);
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

            let variantTileLayerObj = {
              attribution: variantObj.options !== undefined && variantObj.options.attribution !== undefined ? variantObj.options.attribution : providerTileLayerObj.attribution,
              ext: variantObj.options !== undefined && variantObj.options.ext !== undefined ? variantObj.options.ext : providerTileLayerObj.ext,
              format: variantObj.options !== undefined && variantObj.options.format !== undefined ? variantObj.options.format : providerTileLayerObj.format,
              maxZoom: variantObj.options !== undefined && variantObj.options.maxZoom !== undefined ? variantObj.options.maxZoom : providerTileLayerObj.maxZoom,
              minZoom: variantObj.options !== undefined && variantObj.options.minZoom !== undefined ? variantObj.options.minZoom : providerTileLayerObj.minZoom,
              variant: variant,
              url: (variantObj.options !== undefined && variantObj.options.url !== undefined) ? variantObj.options.url : providerTileLayerObj.url,
            };

            let tileLayerId = providerName + '.' + variantKeyName;

            if (variantTileLayerObj.url === undefined) {
              console.warn('URL could not be determined for map tile layer: ' + tileLayerId);
              continue;
            }

            this.tileLayers[tileLayerId] = variantTileLayerObj;
            this.tileLayersMenu.push(<MenuItem key={i + '_' + j} primaryText={tileLayerId} value={tileLayerId} />);

          }

        }

      }

    }

  },

  // Event handlers
  handleQueryPick(query) {
    this.props.componentUpdate({query});
  },
  handleChangeTable(table) {
    this.props.componentUpdate({table});
  },
  handleChangeTileLayer(event, selectedIndex, selectedTileLayer) {
    // NB: Ideally wanted to use objects as the SelectField values, but that didn't seem to work.

    if (selectedTileLayer === DEFAULT_TILE_LAYER) {
      this.props.componentUpdate({tileLayer: undefined, tileLayerProps: undefined, zoom: undefined});
    } else {

      let selectedTileLayerProps = _cloneDeep(this.tileLayers[selectedTileLayer]);

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

      // NB: tileLayerProps will get converted from a plain object to an Immutable map.
      this.props.componentUpdate({tileLayer: selectedTileLayer, tileLayerProps: selectedTileLayerProps, zoom: adaptedZoom});
    }

  },
  handleChangeMap(payload) {
    let {center, zoom} = payload;
    this.props.componentUpdate({center, zoom});
  },

  // Other functions
  icon() {
    return 'globe';
  },
  title() {
    return this.props.title || 'Table Mapper';

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
    let {center, componentUpdate, query, tileLayer, tileLayerProps, sidebar, table, zoom} = this.props;

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
    tableOptions = [{value: '_NONE_', leftIcon: undefined, label: '— None —'}].concat(tableOptions);



    // TODO: Persist current tile layer through marker onClick event?

    // FIXME: attribution replacement not working as per:
    // https://github.com/leaflet-extras/leaflet-providers/blob/c5bdc5f30629215c5c9c189cd2cccd533515383a/leaflet-providers.js#L73

    // TODO: make pretty

    // TODO: truncate center lat & lng decimals to fewer places.

    let adaptedCenterForTemplate = undefined;



    if (center instanceof Array) {
      // TODO: check the array looks like [0, 0]
      adaptedCenterForTemplate = JSON.stringify(center);
    } else if (center !== undefined && typeof center === 'object') {
      // TODO: check the object looks like {lat: 50, lng: 30} or {lat: 50, lon: 30}
      if (center.lat !== undefined) {
        adaptedCenterForTemplate = JSON.stringify([center.lat.toFixed(COORDINATES_PRECISION_IN_TEMPLATE_CODE), center.lng.toFixed(COORDINATES_PRECISION_IN_TEMPLATE_CODE)]);
      } else if (_isFunction(center.get)) {
        // TODO: check the object is a Map
        adaptedCenterForTemplate = JSON.stringify([center.get('lat').toFixed(COORDINATES_PRECISION_IN_TEMPLATE_CODE), center.get('lng').toFixed(COORDINATES_PRECISION_IN_TEMPLATE_CODE)]);
      } else {
        console.error('center is an unhandled object: %o', center);
      }
    } else if (center !== undefined && typeof center === 'string') {
      // TODO: check the string looks like OK before accepting.
      adaptedCenterForTemplate = center;
    }

    let centerAttribute = adaptedCenterForTemplate !== undefined ? ' center=\'' + adaptedCenterForTemplate + '\'' : '';
    let zoomAttribute = zoom !== undefined ? ' zoom=\'' + zoom + '\'' : '';

    // Default to just a Map
    let templateCode = '<Map />';

    if (table !== undefined && table !== '_NONE_' && tileLayerProps !== undefined && tileLayerProps.size !== 0) {

      if (query !== undefined && query !== SQL.nullQuery) {
        // A table, a query and a tileLayer have been specified.
        templateCode = '<TableMap' + centerAttribute + zoomAttribute + ' query=\'' + query + '\' table="' + table + '" tileLayerProps=\'' + JSON.stringify(tileLayerProps.toObject()) + '\' /></div>';
      } else {
        // A table and a tileLayer have been specified.
        templateCode = '<TableMap' + centerAttribute + zoomAttribute + '  table="' + table + '" tileLayerProps=\'' + JSON.stringify(tileLayerProps.toObject()) + '\' /></div>';
      }

    } else if (table !== undefined && table !== '_NONE_') {

      if (query !== undefined && table !== '_NONE_' && query !== SQL.nullQuery) {
        // A table and a query have been specified.
        templateCode = '<TableMap' + centerAttribute + zoomAttribute + ' query=\'' + query + '\' table="' + table + '" /></div>';
      } else {
        // Only a table has been specified.
        templateCode = '<TableMap' + centerAttribute + zoomAttribute + ' table="' + table + '" /></div>';
      }

    } else if (tileLayerProps !== undefined && tileLayerProps.size !== 0) {
      // Only a tileLayer has been specified.
      templateCode = '<Map' + centerAttribute + zoomAttribute + ' tileLayerProps=\'' + JSON.stringify(tileLayerProps.toObject()) + '\' /></div>';
    }

    // Wrap the map template code in a container with dimensions.
    templateCode = '<div style="width:300px;height:300px">' + templateCode + '</div>';


    let sidebarContent = (
      <div className="sidebar map-sidebar">
        <SidebarHeader icon={this.icon()} description="View table data geographically"/>
        <div className="map-controls vertical stack">
          <SelectFieldWithNativeFallback
            autoWidth={true}
            floatingLabelText="Geographic table:"
            onChange={this.handleChangeTable}
            options={tableOptions}
            value={table}
          />
          {
            table ?
              <FilterButton table={table} query={query} onPick={this.handleQueryPick}/>
            :
              null
          }
          <SelectField
            autoWidth={true}
            floatingLabelText="Map tile layer:"
            onChange={(e, i, v) => this.handleChangeTileLayer(e, i, v)}
            value={tileLayer}
          >
            {this.tileLayersMenu}
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
    // Could use tileLayerObj.get('providerName') or tileLayerObj.get('tileLayerUniqueName') instead
    let mapTitle = 'Map';
    if (tileLayer !== undefined) {
      mapTitle = tileLayer + ' map';
    }
    if (table !== undefined && table !== '_NONE_') {
      mapTitle =  mapTitle + ' of ' + this.config.tablesById[table].namePlural;
    }

    // If no table has been selected, just show a map with the selected tileLayer (if any).
    let mapWidget = (
      <MapWidget
        center={center}
        componentUpdate={componentUpdate}
        onChange={this.handleChangeMap}
        tileLayerProps={tileLayerProps}
        zoom={zoom}
      />
    );

    if (table !== undefined && table !== '_NONE_') {
      mapWidget = (
        <TableMapWidget
          center={center}
          componentUpdate={componentUpdate}
          locationDataTable={table}
          onChange={this.handleChangeMap}
          query={query}
          tileLayerProps={tileLayerProps}
          zoom={zoom}
        />
      );
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
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
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

module.exports = TableMapActions;
