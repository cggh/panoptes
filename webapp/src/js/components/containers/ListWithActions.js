import React from 'react';
import Immutable from 'immutable';
import scrollbarSize from 'scrollbar-size';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import Sidebar from 'react-sidebar';

// UI components
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

// Material UI components
import TextField from 'material-ui/TextField';

// Panoptes components
import SQL from 'panoptes/SQL';
import ListView from 'panoptes/ListView';
import ItemTemplate from 'panoptes/ItemTemplate';

// Panoptes widgets
import DataItem from 'containers/DataItem';


let ListWithActions = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    selectedPrimKey: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    initialSearchFocus: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      table: null,
      sidebar: true,
      initialSearchFocus: false
    };
  },

  getInitialState() {
    return {
      search: ''
    };
  },

  componentWillMount() {
    this.tableConfig = this.config.tables[this.props.table];
  },

  componentDidUpdate(prevProps, prevState) {
    if (this.props.initialSearchFocus) {
      this.refs.search.focus();
    }
  },

  icon() {
    return this.tableConfig.icon;
  },

  title() {
    return this.props.title || this.tableConfig.tableCapNamePlural;
  },

  handleSelect(selectedPrimKey) {
    this.props.componentUpdate({selectedPrimKey});
  },

  handleSearchChange(event) {
    this.setState({'search': event.target.value});
  },

  render() {
    let {table, sidebar, componentUpdate, selectedPrimKey} = this.props;
    let {description} = this.tableConfig;
    let {search} = this.state;

    let sidebarContent = (
      <div className="sidebar">
        <div className="item-picker">
          <SidebarHeader icon={this.icon()} description={description}/>
          <div className="search">
            <TextField ref="search"
                       fullWidth={true}
                       floatingLabelText="Search"
                       value={search}
                       onChange={this.handleSearchChange}
            />
          </div>
          <ListView
             search={search}
             table={table}
             selectedPrimKey={selectedPrimKey}
             onSelect={this.handleSelect}
             icon={this.icon()}
             autoSelectIfNoneSelected
            />
        </div>
      </div>
    );


/////////////// TODO: Adapted from PanoptesActions.js
// TODO: Put const viewTypes into constants file?

    let dataItemViews = this.tableConfig.dataItemViews;

    let views = Immutable.List();
    if (!dataItemViews) {
      // If there are no dataItemViews specified, then default to showing an Overview.
      views.push({
        view: 'Overview',
        props: {
          title: 'Overview'
        }
      });

      if (this.tableConfig.hasGeoCoord) {
        // If there are no dataItemViews specified and this table hasGeoCoord, then default to showing an ItemMap
        views.push({
          view: 'ItemMap',
          props: {
            title: 'Location'
          }
        });
      }
    } else {
      dataItemViews.forEach((dataItemView) => {
        // Compose a tabPane for each of the specified dataItemViews
        const viewTypes = {
          Overview: () => ({
            view: 'Overview',
            props: {
              title: 'Overview'
            }
          }),
          PieChartMap: () => ({
            view: 'PieChartMap',
            props: {
              title: dataItemView.name,
              chartConfig: dataItemView
            }
          }),
          ItemMap: () => ({
            view: 'ItemMap',
            props: {
              title: dataItemView.name
            }
          }),
          FieldList: () => ({
            view: 'FieldList',
            props: {
              title: dataItemView.name,
              fields: dataItemView.fields
            }
          }),
          PropertyGroup: () => ({
            view: 'PropertyGroup',
            props: {
              title: dataItemView.name || dataItemView.groupId, //TODO This should be name from group config
              propertyGroupId: dataItemView.groupId
            }
          }),
          Template: () => ({
            view: 'Template',
            props: {
              title: dataItemView.name, //TODO This should be name from group config
              content: dataItemView.content
            }
          })
        };
        if (viewTypes[dataItemView.type])
          views = views.push(Immutable.fromJS(viewTypes[dataItemView.type]()));
      });
    }

///////////////

    let dataItem = '';
    if (selectedPrimKey) {
      dataItem = <DataItem views={views} primKey={selectedPrimKey} {...this.props}/>; //We pass along all props as currently selected tab etc are stored here
    }

    return (
      <Sidebar
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        docked={sidebar}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrows-h' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}
                  title={sidebar ? 'Expand' : 'Sidebar'}
            />
            {selectedPrimKey ?
              <ItemTemplate className="text" table={table} primKey={selectedPrimKey}>
                {this.tableConfig.settings.itemTitle || `{{${this.tableConfig.primkey}}}`}
              </ItemTemplate> :
            null}
          </div>
          <div>
            {dataItem}
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = ListWithActions;
