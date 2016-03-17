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

import DataItem from 'containers/DataItem';


let ListWithActions = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin, LinkedStateMixin],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    sidebar: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      table: null,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
      order: null,
      ascending: true,
      sidebar: true,
      initialSelectedIndex: 0
    };
  },

  getInitialState() {
    return {
      selectedIndex: this.props.initialSelectedIndex,
      primKey: null,
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

  handleSelect(primKey, selectedIndex) {
    this.props.componentUpdate({primKey: primKey, selectedIndex});
    this.setState({primKey: primKey, selectedIndex: selectedIndex});
  },

  render() {
    let {table, query, columns, order, ascending, sidebar, componentUpdate} = this.props;
    let {description} = this.config;
    let {primKey} = this.state;

    // If columns have not been set, then use showByDefault && showInTable to determine which to show.
    if (!columns)
      columns = Immutable.List(this.config.properties)
        .filter((prop) => prop.showByDefault && prop.showInTable)
        .map((prop) => prop.propid);

    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description={description}/>
        <div className="search">
          <TextField floatingLabelText="Search" valueLink={this.linkState('search')}/>
        </div>
        <ListView
           table={table}
           query={query}
           order={order}
           ascending={ascending}
           columns={columns}
           onSelect={(primKey, selectedIndex) => this.handleSelect(primKey, selectedIndex)}
          />
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
              content: dataItemView.content,
              childTablesAsArrayOfMaps: this.config.relationsParentOf
            }
          })
        };
        if (viewTypes[dataItemView.type])
          views = views.push(Immutable.fromJS(viewTypes[dataItemView.type]()));
      });
    }

///////////////

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
            <span className="text">{primKey}</span>
          </div>
          <div>
            <DataItem table={table} primKey={primKey} componentUpdate={componentUpdate} views={views} />
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = ListWithActions;
