import React from 'react';

import _filter from 'lodash/filter';
import _map from 'lodash/map';
import _reduce from 'lodash/reduce';

import Plot from 'Plot/Widget';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';
import Loading from 'ui/Loading';
import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';
import ErrorReport from 'panoptes/ErrorReporter';
import {allDimensions} from 'panoptes/plotTypes';
import {propertyColour} from 'util/Colours';


import 'plot.scss';

let TablePlot = React.createClass({

  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin.apply(this, ['table', 'query'].concat(allDimensions))
  ],

  propTypes: {
    setProps: React.PropTypes.func,
    table: React.PropTypes.string,
    query: React.PropTypes.string,
    ..._reduce(allDimensions, (props, dim) => { props[dim] = React.PropTypes.string; return props; }, {})
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      query: undefined
    };
  },

  getInitialState() {
    return {
      loadStatus: 'loaded'
    };
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  fetchData(props, requestContext) {
    const {table, query} = props;
    const tableConfig = this.config.tablesById[table];
    const dimensions = _filter(allDimensions, (dim) => props[dim] && tableConfig.propertiesById[props[dim]]);
    const columns = _map(dimensions, (dim) => props[dim]);

    if (columns.length > 0) {
      this.setState({loadStatus: 'loading'});
      let APIargs = {
        database: this.config.dataset,
        table: tableConfig.id,
        columns: columns,
        query: this.getDefinedQuery(query, table),
        transpose: false,
        randomSample: 20000
      };

      requestContext.request((componentCancellation) =>
          LRUCache.get(
            'query' + JSON.stringify(APIargs),
            (cacheCancellation) =>
              API.query({cancellation: cacheCancellation, ...APIargs}),
            componentCancellation
          )
        )
        .then((data) => {
          this.setState(
            _reduce(allDimensions,
              (state, dim) => {
                state[dim] = data[props[dim]] || null;
                let prop = tableConfig.propertiesById[props[dim]];
                if (dim == 'colour' && state[dim] && !prop.isNumerical && prop.isCategorical) {
                  state[dim] = _map(state[dim], propertyColour(prop));
                }
                return state;
              },
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
    const {plotType} = this.props;
    const {loadStatus} = this.state;
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

module.exports = TablePlot;
