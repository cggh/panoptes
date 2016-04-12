import React from 'react';

import _filter from 'lodash/filter';
import _map from 'lodash/map';

import Plot from 'panoptes/Plot';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';


import "plot.scss";

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
    horizontalDimension: React.PropTypes.string,
    verticalDimension: React.PropTypes.string,
    depthDimension: React.PropTypes.string
  },

  getDefaultProps() {
    return {
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
    };
  },


  fetchData(props) {
    let {table, horizontalDimension, verticalDimension, depthDimension} = props;
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

  render() {
    let {style, depthDimension} = this.props;

    return (
        <Plot className="plot" traces={[{
            x: this.state.x,
            y: this.state.y,
            z: this.state.z,
            opacity: 0.75,
            type: depthDimension !== '__none__' ? 'scatter3d' : 'scatter',
            mode: 'markers'
          }]}/>
      );
  }
});

module.exports = PlotContainer;
