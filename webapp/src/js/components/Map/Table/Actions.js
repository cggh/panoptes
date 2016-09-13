import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import React from 'react';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'react-sidebar';

// Lodash
import _cloneDeep from 'lodash/cloneDeep';
import _map from 'lodash/map';
import _filter from 'lodash/filter';

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

//import 'Map/Table/actions-styles.css';

import 'leaflet-providers/leaflet-providers.js';

const DEFAULT_TILE_LAYER_OBJ = Immutable.Map(Immutable.fromJS({
  tileLayerAttribution: undefined,
  tileLayerMaxZoom: undefined,
  tileLayerMinZoom: undefined,
  tileLayerUniqueName: '— Default —',
  tileLayerURL: undefined
}));

let TableMapActions = React.createClass({
  mixins: [
    ConfigMixin,
    FluxMixin,
    PureRenderMixin
  ],

  propTypes: {
    center: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.array, React.PropTypes.object]),
    componentUpdate: React.PropTypes.func.isRequired,
    query: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    selectedTileLayerObj: ImmutablePropTypes.map,
    table: React.PropTypes.string,
    title: React.PropTypes.string,
    zoom: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number])
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
      selectedTileLayerObj: DEFAULT_TILE_LAYER_OBJ,
      sidebar: true,
      table: '_NONE_'
    };
  },

  icon() {
    return 'globe';
  },

  title() {
    return this.props.title || 'Table Mapper';

  },

  // Event handlers
  handleQueryPick(query) {
    this.props.componentUpdate({query});
  },
  handleChangeTable(table) {
    this.props.componentUpdate({table});
  },
  handleChangeTileLayer(event, selectedIndex, selectedValue) {
    // NB: Ideally wanted to use objects as the SelectField values, but that didn't seem to work.

    let selectedTileLayerObj = _cloneDeep(this.tileLayerObjects[selectedValue]);

    let adaptedZoom = this.props.zoom;
    if (
      selectedTileLayerObj.get('tileLayerMaxZoom') !== undefined
      && this.props.zoom > selectedTileLayerObj.get('tileLayerMaxZoom')
    ) {
      adaptedZoom = selectedTileLayerObj.get('tileLayerMaxZoom');
    }

    if (
      selectedTileLayerObj.get('tileLayerMinZoom') !== undefined
      && this.props.zoom < selectedTileLayerObj.get('tileLayerMinZoom')
    ) {
      adaptedZoom = selectedTileLayerObj.get('tileLayerMinZoom');
    }

    this.props.componentUpdate({selectedTileLayerObj: selectedTileLayerObj, zoom: adaptedZoom});
  },
  handleChangeMap(payload) {
    let {center, zoom} = payload;
    this.props.componentUpdate({center, zoom});
  },

  render() {
    let {center, componentUpdate, query, selectedTileLayerObj, sidebar, table, zoom} = this.props;

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


    // https://github.com/leaflet-extras/leaflet-providers
    // https://leaflet-extras.github.io/leaflet-providers/preview/
    this.tileLayerObjects = {};
    let tileLayerMenu = [];

    // Add the default tileLayer options, so it can be re-selected.

    this.tileLayerObjects['— Default —'] = DEFAULT_TILE_LAYER_OBJ;
    tileLayerMenu.push(<MenuItem key="__DEFAULT__" primaryText={"— Default —"} value={"— Default —"} />);

    if (window.L.TileLayer.Provider.providers !== undefined) {

      let mapProviderNames = Object.keys(window.L.TileLayer.Provider.providers);
      mapProviderNames.sort();

      for (let i = 0, len = mapProviderNames.length; i < len; i++) {

        let mapProviderName = mapProviderNames[i];
        let providerObj = window.L.TileLayer.Provider.providers[mapProviderName];

        // TODO: Support providers requiring registration
        // Skip providers requiring registration
        if (mapProviderName === 'HERE' || mapProviderName === 'MapBox') {
          continue;
        }

        // FIXME: Providers not working
        // Skip providers not working
        // BasemapAT requires {format} -- trying but failing
        // NASAGIBS requires {time}, {tilematrixset}, {maxZoom}, {format}
        if (mapProviderName === 'BasemapAT' || mapProviderName === 'NASAGIBS') {
          continue;
        }

        if (
          providerObj.variants !== undefined
          && typeof providerObj.variants === 'object'
          && Object.keys(providerObj.variants).length > 0
        ) {

          // If this provider has variants...

          let variantTemplateUrl = undefined;
          let defaultUrl = undefined;
          let defaultFormat = providerObj.options.format;

          if (
            providerObj.options.variant !== undefined
            && !providerObj.url.includes('{variant}')
            && providerObj.url.includes(`/${providerObj.options.variant}/`)
          ) {
            // If this provider has a default variant, but its URL doesn't have the variant placeholder
            // but the default variant does appear in the URL
            // Then replace the first occurrence of the default variant with the variant placeholder
            // to make the _variantTemplateUrl
            // TODO: Use a more Leaflet-esque method, i.e. http://leafletjs.com/reference.html#url-template

            variantTemplateUrl = providerObj.url.replace(`/${providerObj.options.variant}/`, '/{variant}/');
            defaultUrl = providerObj.url;
          } else if (
            providerObj.options.variant !== undefined
            && providerObj.url.includes('{variant}')
          ) {
            // If this provider has a default variant, and its URL has the variant placeholder
            variantTemplateUrl = providerObj.url;
            defaultUrl = providerObj.url.replace('/{variant}/', `/${providerObj.options.variant}/`);
          } else if (
            providerObj.options.variant === undefined
            && providerObj.url.includes('{variant}')
          ) {
            // If this provider has no default variant, but its URL has the variant placeholder
            variantTemplateUrl = providerObj.url;
            defaultUrl = null;
          } else if (
            providerObj.options.variant === undefined
            && providerObj.url !== undefined
            && !providerObj.url.includes('{variant}')
          ) {
            // If this provider has no default variant and its URL does not have the variant placeholder
            // but it does have a URL, and its variants *might* have a URL
            variantTemplateUrl = null;
            defaultUrl = providerObj.url;
          } else {
            console.warn('Unhandled map tile provider variants: %o', providerObj);
            continue;
          }

          if (variantTemplateUrl !== undefined && variantTemplateUrl !== null) {
            if (variantTemplateUrl.includes('{ext}')) {
              variantTemplateUrl = variantTemplateUrl.replace('{ext}', 'png');
            }
          }

          if (defaultUrl !== undefined && defaultUrl !== null) {

            if (defaultUrl.includes('{format}') && defaultFormat !== undefined) {
              defaultUrl = defaultUrl.replace('{format}', defaultFormat);
            }

            if (defaultUrl.includes('{ext}')) {
              defaultUrl = defaultUrl.replace('{ext}', 'png');
            }

            // If there is no defaultUrl (perhaps only variant URLs)
            // then don't create a default menu option for this tile provider.

            // If this provider has a default variant, then show the variant name in the menu option.
            // Otherwise, just show the provider name.

            let defaultTileLayerObj = {
              mapProviderName: mapProviderName,
              tileLayerAttribution: providerObj.options.attribution,
              tileLayerMaxZoom: providerObj.options.maxZoom,
              tileLayerMinZoom: providerObj.options.minZoom,
              tileLayerUniqueName: providerObj.options.variant !== undefined ? `${mapProviderName} (${providerObj.options.variant})` : mapProviderName,
              tileLayerVariantName: mapProviderName,
              tileLayerURL: defaultUrl
            };

            this.tileLayerObjects[defaultTileLayerObj.tileLayerUniqueName] = Immutable.fromJS(defaultTileLayerObj);
            tileLayerMenu.push(<MenuItem key={i} primaryText={defaultTileLayerObj.tileLayerUniqueName} value={defaultTileLayerObj.tileLayerUniqueName} />);
          }

          //// Convert each variant into a tileLayerMenu with a tileLayerObj as a value.

          let variantKeyNames = Object.keys(providerObj.variants);
          variantKeyNames.sort();

          for (let j = 0, len = variantKeyNames.length; j < len; j++) {

            let variantKeyName = variantKeyNames[j];
            let variantObj = providerObj.variants[variantKeyName];

            let tileLayerObj = {
              mapProviderName: mapProviderName,
              tileLayerAttribution: providerObj.options.attribution,
              tileLayerMaxZoom: providerObj.options.maxZoom,
              tileLayerMinZoom: providerObj.options.minZoom,
              tileLayerUniqueName: mapProviderName + '.' + variantKeyName,
              tileLayerVariantName: variantKeyName
            };

            // NB: Variants either have their own URL specified in options,
            // or their URL is composed using the variantTemplateUrl and the variant name.

            // NB: The value of a variant is either a string, specifying the variant name
            // or the value is an object with options.

            if (variantObj === undefined) {
              // Skip if the variant object is undefined (i.e. we only have the key name)
              continue;
            }

            if (typeof variantObj === 'string' && variantObj !== '') {

              if (variantTemplateUrl !== undefined && variantTemplateUrl !== null) {
                tileLayerObj.tileLayerURL = variantTemplateUrl.replace('{variant}', variantObj);

                if (tileLayerObj.tileLayerURL.includes('{format}')) {
                  if (defaultFormat !== undefined && defaultFormat !== null) {
                    tileLayerObj.tileLayerURL = tileLayerObj.tileLayerURL.replace('{format}', defaultFormat);
                  }
                }

              } else {
                console.warn('Could not determine URL for map tile option ' + tileLayerObj.tileLayerUniqueName + ': ' + variantObj);
              }

            } else if (typeof variantObj === 'object') {


              if (variantObj.options !== undefined && variantObj.options !== null) {

                if (variantObj.options.maxZoom !== undefined && variantObj.options.maxZoom !== null) {
                  tileLayerObj.tileLayerMaxZoom = variantObj.options.maxZoom;
                }
                if (variantObj.options.minZoom !== undefined && variantObj.options.minZoom !== null) {
                  tileLayerObj.tileLayerMinZoom = variantObj.options.minZoom;
                }
              }


              if (
                variantTemplateUrl !== undefined
                && variantTemplateUrl !== null
                && variantObj.options !== undefined
                && variantObj.options !== null
                && variantObj.options.variant !== undefined
                && variantObj.options.variant !== null
              ) {

                tileLayerObj.tileLayerURL = variantTemplateUrl.replace('{variant}', variantObj.options.variant);

                if (tileLayerObj.tileLayerURL.includes('{format}')) {
                  if (variantObj.options.format !== undefined && variantObj.options.format !== null) {
                    tileLayerObj.tileLayerURL = tileLayerObj.tileLayerURL.replace('{format}', variantObj.options.format);
                  } else if (defaultFormat !== undefined && defaultFormat !== null) {
                    tileLayerObj.tileLayerURL = tileLayerObj.tileLayerURL.replace('{format}', defaultFormat);
                  }
                }

              } else if (
                variantObj.url !== undefined
                && variantObj.url !== null
              ) {
                tileLayerObj.tileLayerURL = variantObj.url;
              } else {
                console.warn('Could not determine URL for map tile option ' + tileLayerObj.tileLayerUniqueName + ': %o', variantObj);
              }

            } else {
              console.warn('Unhandled variant type for option ' + tileLayerObj.tileLayerUniqueName + ': %o', variantObj);
            }

            if (tileLayerObj.tileLayerURL !== undefined && tileLayerObj.tileLayerURL !== null) {
              this.tileLayerObjects[tileLayerObj.tileLayerUniqueName] = Immutable.fromJS(tileLayerObj);
              tileLayerMenu.push(<MenuItem key={i + '_' + j} primaryText={tileLayerObj.tileLayerUniqueName} value={tileLayerObj.tileLayerUniqueName} />);
            } else {
              // Already warned, "Could not determine URL for map tile option"
              //console.warn('tileLayerURL was not defined for option ' + tileLayerObj.tileLayerUniqueName + ': %o', tileLayerObj);
            }

          }
        } else {

          let tileLayerObj = {
            mapProviderName: mapProviderName,
            tileLayerAttribution: providerObj.options.attribution,
            tileLayerMaxZoom: providerObj.options.maxZoom,
            tileLayerMinZoom: providerObj.options.minZoom,
            tileLayerUniqueName: mapProviderName,
            tileLayerVariantName: mapProviderName,
            tileLayerURL: providerObj.url
          };

          this.tileLayerObjects[tileLayerObj.tileLayerUniqueName] = Immutable.fromJS(tileLayerObj);
          tileLayerMenu.push(<MenuItem key={i} primaryText={tileLayerObj.tileLayerUniqueName} value={tileLayerObj.tileLayerUniqueName} />);
        }


      }

    }

    // TODO: Persist current tile layer through marker onClick event?

    // FIXME: attribution replacement not working as per:
    // https://github.com/leaflet-extras/leaflet-providers/blob/c5bdc5f30629215c5c9c189cd2cccd533515383a/leaflet-providers.js#L73

    // TODO: make pretty

    // TODO: truncate center lat & lng decimals to fewer places.

    let adaptedCenterForTemplate = center !== undefined ? ' center=\'' + JSON.stringify(center) + '\'' : '';
    let adaptedZoomForTemplate = zoom !== undefined ? ' zoom="' + zoom.toString() + '"' : '';

    let templateWrap = '<div style="width:300px;height:300px">';

    let templateCode = templateWrap + '<Map /></div>';
    if (table !== undefined && table !== '_NONE_' && selectedTileLayerObj.size !== 0) {

      if (query !== undefined && query !== SQL.nullQuery) {
        // A table, a query and a tileLayer have been specified.
        templateCode = templateWrap + '<TableMap' + adaptedCenterForTemplate + adaptedZoomForTemplate + ' query=\'' + query + '\' table="' + table + '" tileLayerAttribution="' + selectedTileLayerObj.get('tileLayerAttribution') + '" tileLayerURL="' + selectedTileLayerObj.get('tileLayerURL') + '" /></div>';
      } else {
        // A table and a tileLayer have been specified.
        templateCode = templateWrap + '<TableMap' + adaptedCenterForTemplate + adaptedZoomForTemplate + '  table="' + table + '" tileLayerAttribution="' + selectedTileLayerObj.get('tileLayerAttribution') + '" tileLayerURL="' + selectedTileLayerObj.get('tileLayerURL') + '" /></div>';
      }

    } else if (table !== undefined && table !== '_NONE_') {

      if (query !== undefined && table !== '_NONE_' && query !== SQL.nullQuery) {
        // A table and a query have been specified.
        templateCode = templateWrap + '<TableMap' + adaptedCenterForTemplate + adaptedZoomForTemplate + ' query=\'' + query + '\' table="' + table + '" /></div>';
      } else {
        // Only a table has been specified.
        templateCode = templateWrap + '<TableMap' + adaptedCenterForTemplate + adaptedZoomForTemplate + ' table="' + table + '" /></div>';
      }

    } else if (selectedTileLayerObj.size !== 0) {
      // Only a tileLayer has been specified.
      templateCode = templateWrap + '<Map' + adaptedCenterForTemplate + adaptedZoomForTemplate + ' tileLayerAttribution="' + selectedTileLayerObj.get('tileLayerAttribution') + '" tileLayerURL="' + selectedTileLayerObj.get('tileLayerURL') + '" /></div>';
    }


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
            value={selectedTileLayerObj.get('tileLayerUniqueName')}
          >
            {tileLayerMenu}
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
    // Could use tileLayerObj.get('mapProviderName') or tileLayerObj.get('tileLayerUniqueName') instead
    let mapTitle = 'Map';
    if (selectedTileLayerObj.get('tileLayerVariantName') !== undefined) {
      mapTitle = selectedTileLayerObj.get('tileLayerVariantName') + ' map';
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
        tileLayerAttribution={selectedTileLayerObj.get('tileLayerAttribution')}
        tileLayerMaxZoom={selectedTileLayerObj.get('tileLayerMaxZoom')}
        tileLayerMinZoom={selectedTileLayerObj.get('tileLayerMinZoom')}
        tileLayerURL={selectedTileLayerObj.get('tileLayerURL')}
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
          tileLayerAttribution={selectedTileLayerObj.get('tileLayerAttribution')}
          tileLayerMaxZoom={selectedTileLayerObj.get('tileLayerMaxZoom')}
          tileLayerMinZoom={selectedTileLayerObj.get('tileLayerMinZoom')}
          tileLayerURL={selectedTileLayerObj.get('tileLayerURL')}
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
