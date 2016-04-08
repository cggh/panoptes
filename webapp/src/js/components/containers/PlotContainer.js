import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Sidebar from 'react-sidebar';
import DropDownMenu from 'material-ui/lib/DropDownMenu';
import MenuItem from 'material-ui/lib/menus/menu-item';

import _filter from "lodash/filter";
import _map from "lodash/map";

import Icon from "ui/Icon";
import Plot from "panoptes/Plot";

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';


import "plot.scss"

let PlotContainer = React.createClass({

  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('table', 'horizontalDimension', 'verticalDimension', 'depthDimension')
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    table: React.PropTypes.string,
    sidebar: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      sidebar: true,
      table: 'variants',
      horizontalDimension: '__none__',
      verticalDimension: '__none__',
      depthDimension: '__none__'
    };
  },

  getInitialState() {
    return {
      loadStatus: 'loaded',
      x: [],
      y: [],
      z: []
    }
  },


  fetchData(props) {
    let { table, horizontalDimension, verticalDimension, depthDimension } = props;
    let tableConfig = this.config.tables[table];
    let columns = _filter([horizontalDimension, verticalDimension, depthDimension], (col) => col !== '__none__');
    let columnspec = {};
    _map(columns, column => columnspec[column] = tableConfig.propertiesMap[column].defaultFetchEncoding);
    if (columns.length > 0) {
      this.setState({loadStatus: 'loading'});
      API.pageQuery({
          database: this.config.dataset,
          table: tableConfig.fetchTableName,
          columns: columnspec,
          query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
          transpose: false
        })
        .then((data) => {
          //Check our data is still relavent
          //if (Immutable.is(props, this.props)) {
          let state = {loadStatus: 'loaded'};
          if (horizontalDimension !== '__none__')
            state.x = data[horizontalDimension];
          if (verticalDimension !== '__none__')
            state.y = data[verticalDimension];
          if (depthDimension !== '__none__')
            state.z = data[depthDimension];
          this.setState(state);
          //}
        })
        .catch((error) => {
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
          this.setState({loadStatus: 'error'});
        });
    }
    else
      this.setState({x: [], y:[], z:[]});
  },


  handlePropertyChange() {
    this.props.componentUpdate({
      horizontalDimension: this.refs.horizontalDimension.value,
      verticalDimension: this.refs.verticalDimension.value,
      depthDimension: this.refs.depthDimension.value
    })
  },

  render() {
    let { sidebar, style, table, horizontalDimension, verticalDimension, depthDimension, componentUpdate } = this.props;

    let tables = _map(this.config.tables, (val, key) => {
      return {payload:key, text:(<div className="dropdown-option"><Icon fixedWidth={true} name={val.icon}/>{val.tableCapNamePlural}</div>)}
    });
    tables.unshift({payload:'__none__', text:"Pick a table..."});
    tables = tables.map(({payload, text}) => <MenuItem value={payload} key={payload} primaryText={text}/>);

    let propertyGroups = [];
    if (table !== '__none__') {
      propertyGroups = this.config.tables[table].propertyGroups;
    }

    let sidebar_content = (
      <div className="plot-controls vertical stack">
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
    );
    return (
      <div style={Object.assign({position:'absolute'}, style || {})} >
        <Sidebar
          docked={sidebar}
          sidebar={sidebar_content}>
          <Plot className="plot" traces={[{
            x: this.state.x,
            y: this.state.y,
            z: this.state.z,
            opacity: 0.75,
            type: depthDimension !== '__none__' ? 'scatter3d' : 'scatter',
            mode: 'markers'
          }]}/>
        </Sidebar>
      </div>
      );
  }
});

module.exports = PlotContainer;
