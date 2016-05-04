import React from 'react';

import _filter from 'lodash/filter';
import _map from 'lodash/map';
import _reduce from 'lodash/reduce';

import Plot from 'panoptes/Plot';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';
import Loading from 'ui/Loading';
import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';
import ErrorReport from 'panoptes/ErrorReporter';
import { plotTypes, allDimensions } from 'panoptes/plotTypes';

import "plot.scss";


let PlotContainer = React.createClass({

  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin.apply(this, ['table', 'query'].concat(allDimensions))
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func,
    table: React.PropTypes.string,
    query: React.PropTypes.string,
    ..._reduce(allDimensions, (props, dim) => { props[dim] = React.PropTypes.string; return props; }, {})
  },

  getDefaultProps() {
    return {
      query: SQL.NullQuery
    };
  },

  getInitialState() {
    return {
      loadStatus: 'loaded'
    };
  },

  fetchData(props, requestContext) {
    const {table, query} = props;
    const tableConfig = this.config.tables[table];
    const dimensions = _filter(allDimensions, (dim) => props[dim] && tableConfig.propertiesMap[props[dim]]);
    const columns = _map(dimensions, (dim) => props[dim]);
    let columnspec = {};
    _map(columns, (column) => columnspec[column] = tableConfig.propertiesMap[column].defaultFetchEncoding);
    if (columns.length > 0) {
      this.setState({loadStatus: 'loading'});
      let APIargs = {
        database: this.config.dataset,
        table: tableConfig.fetchTableName,
        columns: columnspec,
        query: query,
        transpose: false
      };

      requestContext.request((componentCancellation) =>
          LRUCache.get(
            'pageQuery' + JSON.stringify(APIargs),
            (cacheCancellation) =>
              API.pageQuery({cancellation: cacheCancellation, ...APIargs}),
            componentCancellation
          )
        )
        .then((data) => {
          this.setState(
            _reduce(allDimensions,
              (state, dim) => { state[dim] = data[props[dim]] || null; return state; },
              {loadStatus: 'loaded'})
          );
        })
        .catch((error) => {
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
          this.setState({loadStatus: 'error'});
        });
    } else {
      this.setState(
        _reduce(allDimensions,
          (state, dim) => {
            state[dim] = null;
            return state;
          },
          {loadStatus: 'loaded'})
      );
    }
  },

  render() {
    const { plotType } = this.props;
    const { loadStatus } = this.state;
    return (
      <div className="plot-container">
        { plotType ?
          <Plot className="plot"
                plotType={plotType}
                {...this.state}
          />
          : null }
        <Loading status={loadStatus} />
      </div>);
  }
});

module.exports = PlotContainer;
