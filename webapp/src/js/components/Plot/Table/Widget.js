import React from 'react';

import _filter from 'lodash/filter';
import _map from 'lodash/map';
import _reduce from 'lodash/reduce';
import _pickBy from 'lodash/pickBy';

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

import 'plot.scss';

let TablePlot = React.createClass({

  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin.apply(this, ['table', 'query', 'dimensionProperties'].concat(allDimensions))
  ],

  // ['table', 'query'].concat(_map(allDimensions, (dim) => 'dimensionProperties.' + dim))

  // NB: For template API, TablePlot also supports individual dimension props.
  // E.g. either dimensionProperties={horizontal: 'chromosome'} or horizontal="chromosome"
  propTypes: {
    plotType: React.PropTypes.string,
    setProps: React.PropTypes.func,
    table: React.PropTypes.string,
    query: React.PropTypes.string,
    dimensionProperties: React.PropTypes.shape(_reduce(allDimensions, (props, dim) => { props[dim] = React.PropTypes.string; return props; }, {})),
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
      loadStatus: 'loaded',
      dimensionData: {},
      dimensionMetadata: {}
    };
  },

  collectDimensionProperties(props) {
    // Get a list of all the props that have the same name as a recognised dimension, e.g. 'horizontal'
    let individualDimensionProps = _pickBy(props, (value, name) => allDimensions.indexOf(name) !== -1);
    // Combine that list of props with any others that are in the prop named 'dimensionProperties'
    // NB: individualDimensionProps override props.dimensionProperties
    return {...individualDimensionProps, ...props.dimensionProperties};
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  fetchData(props, requestContext) {

console.log('fetchData props: %o', props);

    const {table, query} = props;
    const dimensionProperties = this.collectDimensionProperties(props);
    const tableConfig = this.config.tablesById[table];

console.log('fetchData dimensionProperties: %o', dimensionProperties);

    // Get a list of all the recognised dimension names, e.g. horizontal, that:
    // - have been provided as props; and
    // - have a value, e.g. "Chromosome", is a recognised property of the table.
    const validDimensionNames = _filter(allDimensions, (dim) => dimensionProperties[dim] && tableConfig.propertiesById[dimensionProperties[dim]]);

    // Get a list of all the values, e.g. "Chromosome", for all the valid dimension names.
    const columns = _map(validDimensionNames, (validDimensionName) => dimensionProperties[validDimensionName]);

console.log('fetchData columns: %o', columns);

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

console.log('fetchData data: %o', data);

// console.log('TablePlot data: %o', data);
//
//           let dimensionData = _reduce(allDimensions, (state, dim) => {
//
// console.log('_reduce state: %o', state);
// console.log('_reduce dim: %o', dim);
//
//             state[dim] = data[dimensions[dim]] || null;
//             return state;
//           });
//
// console.log('nextDimensionData %o: ', nextDimensionData);

          // Need to convert {'Value1': [NaN, 0, ...], 'Value2': [0.5, NaN]}
          // to {'horizontal':  [NaN, 0, ...], 'vertical':[0.5, NaN] }
          // and metadata 'horizontal': 'Value1', 'vertical': 'Value2'

          this.setState({
            dimensionData: {'horizontal': data['chromosome'], 'vertical': data['position']},
            dimensionMetadata: {'horizontal': 'chromosome', 'vertical': 'position'},
            loadStatus: 'loaded'
          });

        })
        .catch((error) => {
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
          this.setState({loadStatus: 'error'});
        });

    } else {

      // let nextDimensionData = _reduce(allDimensions, (state, dim) => {
      //   state[dim] = null;
      //   return state;
      // });

console.log('fetchData no columns');

      this.setState({
        dimensionData: {'horizontal': null, 'vertical': null},
        dimensionMetadata: {'horizontal': 'chromosome', 'vertical': 'position'},
        loadStatus: 'loaded'
      });

    }
  },

  render() {
    const {plotType} = this.props;

    return (
      <div className="plot-container">
        {
          plotType ?
          <Plot
            className="plot"
            plotType={plotType}
            dimensionData={this.state.dimensionData}
            dimensionMetadata={this.state.dimensionMetadata}
          />
          : null
        }
        <Loading status={this.state.loadStatus} />
      </div>);
  }
});

export default TablePlot;
