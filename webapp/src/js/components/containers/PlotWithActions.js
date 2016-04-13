import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PureRenderMixin from 'mixins/PureRenderMixin';

import _map from 'lodash/map';

import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import Sidebar from 'react-sidebar';
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import PlotContainer from 'containers/PlotContainer';
import DropDownMenu from 'material-ui/lib/DropDownMenu';
import MenuItem from 'material-ui/lib/menus/menu-item';

import {FlatButton} from 'material-ui';

import "plot.scss";

let GenomeBrowserWithActions = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    table: React.PropTypes.string,
    horizontalDimension: React.PropTypes.string,
    verticalDimension: React.PropTypes.string,
    depthDimension: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      componentUpdate: null,
      sidebar: true,
      table: '__none__',
      horizontalDimension: '__none__',
      verticalDimension: '__none__',
      depthDimension: '__none__'
    };
  },

  componentWillMount() {
  },

  icon() {
    return 'bar-chart';
  },

  title() {
    return this.props.title || 'Plot';
  },

  handlePropertyChange() {
    this.props.componentUpdate({
      horizontalDimension: this.refs.horizontalDimension.value,
      verticalDimension: this.refs.verticalDimension.value,
      depthDimension: this.refs.depthDimension.value
    });
  },


  render() {
    let actions = this.getFlux().actions;
    let {sidebar, style, table, horizontalDimension, verticalDimension, depthDimension, componentUpdate} = this.props;

    let tables = _map(this.config.tables, (val, key) => {
      return {payload:key, text:(<div className="dropdown-option"><Icon fixedWidth={true} name={val.icon}/>{val.tableCapNamePlural}</div>)};
    });
    tables.unshift({payload:'__none__', text:'Pick a table...'});
    tables = tables.map(({payload, text}) => <MenuItem value={payload} key={payload} primaryText={text}/>);

    let propertyGroups = [];
    if (table !== '__none__') {
      propertyGroups = this.config.tables[table].propertyGroups;
    }

    let sidebar_content = (
      <div className="plot-controls vertical stack">
        <div className="sidebar">
          <SidebarHeader icon={this.icon()} description="Something here"/>
          <DropDownMenu className="dropdown"
                      value={table}
                      autoWidth={false}
                      onChange={(e, i, v) => componentUpdate({table: v})}>{tables}</DropDownMenu>

        {table !== '__none__' ?
          <div>
            <div>Horizontal dimension:</div>
            <select ref="horizontalDimension" value={horizontalDimension} onChange={this.handlePropertyChange}>
              <option value="__none__">Pick a column:</option>
              {_map(propertyGroups, (group) => {
                  return (
                    <optgroup key={group.id} label={group.name}>
                      {_map(group.properties, (property) => {
                        let {propid, disabled, name} = property;
                        return (
                          <option key={propid}
                                  value={propid}
                                  disabled={disabled}>
                            {name}
                          </option>
                        );
                      })
                      }
                    </optgroup>
                  );
                }
              )}
            </select>
            <div>Vertical dimension:</div>
            <select ref="verticalDimension" value={verticalDimension} onChange={this.handlePropertyChange}>
              <option value="__none__">Pick a column:</option>
              {_map(propertyGroups, (group) => {
                  return (
                    <optgroup key={group.id} label={group.name}>
                      {_map(group.properties, (property) => {
                        let {propid, disabled, name} = property;
                        return (
                          <option key={propid}
                                  value={propid}
                                  disabled={disabled}>
                            {name}
                          </option>
                        );
                      })
                      }
                    </optgroup>
                  );
                }
              )}
            </select>
            <div>Depth dimension:</div>
            <select ref="depthDimension" value={depthDimension} onChange={this.handlePropertyChange}>
              <option value="__none__">Pick a column:</option>
              {_map(propertyGroups, (group) => {
                  return (
                    <optgroup key={group.id} label={group.name}>
                      {_map(group.properties, (property) => {
                        let {propid, disabled, name} = property;
                        return (
                          <option key={propid}
                                  value={propid}
                                  disabled={disabled}>
                            {name}
                          </option>
                        );
                      })
                      }
                    </optgroup>
                  );
                }
              )}
            </select>

          </div>
          : null }
      </div>
    </div>
    );
    return (
      <Sidebar
        docked={sidebar}
        sidebar={sidebar_content}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrow-left' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
            <span className="text">Plot</span>
          </div>
          <div className="plot-container">
            <PlotContainer {...this.props} />
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = GenomeBrowserWithActions;
