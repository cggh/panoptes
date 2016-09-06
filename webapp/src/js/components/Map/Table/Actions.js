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
import ArrowDropRight from 'material-ui/svg-icons/navigation-arrow-drop-right';
import Divider from 'material-ui/Divider';
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
    tileLayerProviderName: React.PropTypes.string,
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
    let {componentUpdate, query, sidebar, table, tileLayerAttribution, tileLayerProviderName, tileLayerURL} = this.props;
console.log('TableMapActions props %o', this.props);
    let tableOptions = _map(_filter(this.config.visibleTables, (table) => table.hasGeoCoord),
      (table) => ({
        value: table.id,
        leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
        label: table.capNamePlural
      })
    );


    // https://github.com/leaflet-extras/leaflet-providers
    // https://leaflet-extras.github.io/leaflet-providers/preview/
    let tileLayerProviderMenu = [];

console.log('window.L.TileLayer.Provider.providers: %o', window.L.TileLayer.Provider.providers);

    if (table && window.L.TileLayer.Provider.providers) {

      let providerNames = Object.keys(window.L.TileLayer.Provider.providers);
      providerNames.sort();

      for (let i = 0, len = providerNames.length; i < len; i++) {
        let providerName = providerNames[i];
        let providerObj = window.L.TileLayer.Provider.providers[providerName];
        providerObj.name = providerName;

        let subMenuItems = undefined;
        let rightIcon = undefined;
        if (providerObj.variants) {

          rightIcon = <ArrowDropRight />;

          let variantNames = Object.keys(providerObj.variants);
          variantNames.sort();

          subMenuItems = [];
          for (let j = 0, len = variantNames.length; j < len; j++) {

            let variantName = variantNames[i];
            let variantObj = providerObj.variants[variantName];

            if (variantObj !== undefined && typeof variantObj === 'object') {
              variantObj.name = variantName;
            } else {
              variantObj = {name: variantObj};
            }

            subMenuItems.push(<MenuItem key={i + '_' + j} primaryText={variantName} value={variantObj} />);
          }
        }

        tileLayerProviderMenu.push(<MenuItem key={i} menuItems={subMenuItems} primaryText={providerName} rightIcon={rightIcon} value={providerObj} />);




      }

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
          {table ? <FilterButton table={table} query={query} onPick={this.handleQueryPick}/>
            : null}
          {table ?
              <SelectField
                autoWidth={true}
                floatingLabelText="Map tiles:"
                onChange={(e, i, v) => componentUpdate({tileLayerAttribution: v.options.attribution, tileLayerProviderName: v.name, tileLayerURL: v.url})}
                value={tileLayerProviderName}
              >
                {tileLayerProviderMenu}
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
            {table ? <TableMapWidget geoTable={table} {...this.props} /> : null}
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = TableMapActions;
