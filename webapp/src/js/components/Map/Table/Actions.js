import React from 'react';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'react-sidebar';

// Lodash
import _map from 'lodash/map';
import _filter from 'lodash/filter';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';

// Material UI
import MenuItem from 'material-ui/MenuItem';
import SelectField from 'material-ui/SelectField';

// Panoptes UI
import FilterButton from 'panoptes/FilterButton';
import Icon from 'ui/Icon';
import SidebarHeader from 'ui/SidebarHeader';

// Panoptes
import QueryString from 'panoptes/QueryString';
import SelectFieldWithNativeFallback from 'panoptes/SelectFieldWithNativeFallback';
import SQL from 'panoptes/SQL';
import TableMapWidget from 'Map/Table/Widget';

import 'map.scss';
// TODO: Map/Table/actions-styles.scss

import 'leaflet-providers/leaflet-providers.js';


let TableMapActions = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    query: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    table: React.PropTypes.string,
    tileLayerAttribution: React.PropTypes.string,
    tileLayerName: React.PropTypes.string,
    tileLayerURL: React.PropTypes.string,
    title: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
      componentUpdate: null,
      sidebar: true
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
    this.props.componentUpdate({query: query});
  },
  handleChangeTable(table) {
    this.props.componentUpdate({table});
  },

  render() {
    let {componentUpdate, query, sidebar, table, tileLayerAttribution, tileLayerName, tileLayerURL} = this.props;

    let tableOptions = _map(_filter(this.config.visibleTables, (table) => table.hasGeoCoord),
      (table) => ({
        value: table.id,
        leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
        label: table.capNamePlural
      })
    );


    // https://github.com/leaflet-extras/leaflet-providers
    // https://leaflet-extras.github.io/leaflet-providers/preview/
    let tileLayerMenu = [];

console.log('window.L.TileLayer.Provider.providers: %o', window.L.TileLayer.Provider.providers);

    if (table && window.L.TileLayer.Provider.providers) {

      let providerNames = Object.keys(window.L.TileLayer.Provider.providers);
      providerNames.sort();

      for (let i = 0, len = providerNames.length; i < len; i++) {

        let providerName = providerNames[i];
        let providerObj = window.L.TileLayer.Provider.providers[providerName];

        // TODO: Support providers requiring registration
        // Skip providers requiring registration
        if (providerName === 'HERE' || providerName === 'MapBox') {
          continue;
        }

        // FIXME: Providers not working
        // Skip providers not working
        // BasemapAT requires {format} -- trying but failing
        // NASAGIBS requires {time}, {tilematrixset}, {maxZoom}, {format}
        if (providerName === 'BasemapAT' || providerName === 'NASAGIBS') {
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
              tileLayerAttribution: providerObj.options.attribution,
              tileLayerName: providerObj.options.variant ? `${providerName} (${providerObj.options.variant})` : providerName,
              tileLayerURL: defaultUrl
            };

            tileLayerMenu.push(<MenuItem key={i} primaryText={defaultTileLayerObj.tileLayerName} value={defaultTileLayerObj} />);
          }

          //// Convert each variant into a tileLayerMenu with a tileLayerObj as a value.

          let variantKeyNames = Object.keys(providerObj.variants);
          variantKeyNames.sort();

          for (let j = 0, len = variantKeyNames.length; j < len; j++) {

            let variantKeyName = variantKeyNames[j];
            let variantObj = providerObj.variants[variantKeyName];

            let tileLayerObj = {
              tileLayerAttribution: providerObj.options.attribution,
              tileLayerName: providerName + '.' + variantKeyName
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
                console.warn('Could not determine URL for map tile option ' + tileLayerObj.tileLayerName + ': ' + variantObj);
              }

            } else if (typeof variantObj === 'object') {

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
                console.warn('Could not determine URL for map tile option ' + tileLayerObj.tileLayerName + ': %o', variantObj);
              }

            } else {
              console.warn('Unhandled variant type for option ' + tileLayerObj.tileLayerName + ': %o', variantObj);
            }

            if (tileLayerObj.tileLayerURL !== undefined && tileLayerObj.tileLayerURL !== null) {
              tileLayerMenu.push(<MenuItem key={i + '_' + j} primaryText={tileLayerObj.tileLayerName} value={tileLayerObj} />);
            } else {
              // Already warn
              //console.warn('tileLayerURL was not defined for option ' + tileLayerObj.tileLayerName + ': %o', tileLayerObj);
            }

          }
        } else {

          let tileLayerObj = {
            tileLayerAttribution: providerObj.options.attribution,
            tileLayerName: providerName,
            tileLayerURL: providerObj.url
          };

          tileLayerMenu.push(<MenuItem key={i} primaryText={tileLayerObj.tileLayerName} value={tileLayerObj} />);
        }


      }

    }

    // TODO: Auto select table when there is only one.
    // FIXME: Show selected tile layer.

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
          {table ? <FilterButton table={table} query={query} onPick={this.handleQueryPick}/>
            : null}
          {table ?
              <SelectField
                autoWidth={true}
                floatingLabelText="Map tiles:"
                onChange={(e, i, v) => componentUpdate({tileLayerAttribution: v.tileLayerAttribution, tileLayerName: v.tileLayerName, tileLayerURL: v.tileLayerURL})}
                value={tileLayerName}
              >
                {tileLayerMenu}
              </SelectField>
            : null }
        </div>
      </div>
    );
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
            <span className="text">{table ? `Map of ${this.config.tablesById[table].capNamePlural}` : 'Map'}</span>
            {table ?
              <span className="block text">
                <QueryString prepend="Filter:" table={table} query={query}/>
              </span>
              : null}
          </div>
          <div className="grow">
            {table ? <TableMapWidget geoTable={table} tileLayerAttribution={tileLayerAttribution} tileLayerURL={tileLayerURL} {...this.props} /> : null}
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = TableMapActions;
