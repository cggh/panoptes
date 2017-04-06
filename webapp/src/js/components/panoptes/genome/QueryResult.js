import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

import SQL from 'panoptes/SQL';
import API from "panoptes/API";
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';

import {format} from 'd3-format';

let QueryResult = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('query', 'expression', 'table')
  ],

  propTypes: {
    query: React.PropTypes.string,
    expression: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    formatNumber: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
      expression: JSON.stringify(['count', ['*']])
    };
  },

  getInitialState() {
    return {
      result: null
    };
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(nextProps, requestContext) {
    let {query, expression, table} = nextProps;
    if (this.props.query !== query ||
      this.props.expression !== expression ||
      this.props.table !== table
    ) {
      this.setState({result: null});
    }
    let queryAPIargs = {
        database: this.config.dataset,
        table,
        columns: [{expr: JSON.parse(expression), as: 'result'}],
        query
    };
    requestContext.request((componentCancellation) =>
          LRUCache.get(
            'query' + JSON.stringify(queryAPIargs),
            (cacheCancellation) =>
              API.query({cancellation: cacheCancellation, ...queryAPIargs}),
            componentCancellation
          )
    )
    .then(({result}) => {
       this.setState({
          result: result[0],
        });
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((xhr) => {
        ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
        this.setState({result: 'ERROR'});
      });
  },

  render() {
    let {formatNumber} = this.props;
    let {result} = this.state;
    if (result && formatNumber) {
      result = format(formatNumber)(result);
    }
    return <span>{result ? result : '...'}</span>;
  }

});

export default QueryResult;
