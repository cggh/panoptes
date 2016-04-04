import React from 'react';
import Immutable from 'immutable';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import Sidebar from 'react-sidebar';

// UI components
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

// Material UI components
import TextField from 'material-ui/lib/text-field';

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
    ConfigMixin,
    LinkedStateMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    selectedPrimKey: React.PropTypes.string,
    sidebar: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      table: null,
      sidebar: true
    };
  },

  getInitialState() {
    return {
      search: ''
    };
  },

  componentWillMount() {
    this.config = this.config.tables[this.props.table];
  },

  icon() {
    return this.config.icon;
  },

  title() {
    return this.props.title || this.config.tableCapNamePlural;
  },

  handleSelect(selectedPrimKey) {
    this.props.componentUpdate({selectedPrimKey});
  },

  render() {
    let {table, sidebar, componentUpdate, selectedPrimKey} = this.props;
    let {description} = this.config;
    let {search} = this.state;

    let sidebarContent = (
      <div className="sidebar">
        <div className="item-picker">
          <SidebarHeader icon={this.icon()} description={description}/>
          <div className="search">
            <TextField fullWidth={true} floatingLabelText="Search" valueLink={this.linkState('search')}/>
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

    let dataItemViews = this.config.dataItemViews;

    let views = Immutable.List();
    if (!dataItemViews) {
      // If there are no dataItemViews specified, then default to showing an Overview.
      views.push({
        view: 'Overview',
        props: {
          title: 'Overview'
        }
      });

      if (this.config.hasGeoCoord) {
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
        docked={sidebar}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'expand' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}
                  title={sidebar ? 'Expand' : 'Sidebar'}
            />
            {selectedPrimKey ?
              <ItemTemplate className="text" table={table} primKey={selectedPrimKey}>
                {this.config.settings.itemTitle || `{{${this.config.primkey}}}`}
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
