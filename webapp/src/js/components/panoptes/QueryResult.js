import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

import SQL from 'panoptes/SQL';
import withAPIData from 'hoc/withAPIData';
import {format} from 'd3-format';
import _isUndefined from 'lodash/isUndefined';

let QueryResult = React.createClass({
  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    query: React.PropTypes.string,
    expression: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    formatNumber: React.PropTypes.string,
    distinct: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
      expression: JSON.stringify(['count', ['*']])
    };
  },

  render() {
    let {formatNumber, data} = this.props;
    if (!_isUndefined(data) && !_isUndefined(formatNumber)) {
      data = format(formatNumber)(data.result[0]);
    } else if (!_isUndefined(data)) {
      data = data.result[0];
    }
    return <span>{data ? data : '...'}</span>;
  }
});

QueryResult = withAPIData(QueryResult, ({config, props}) => (
  {
    data: {
      method: 'query',
      args: {
        database: config.dataset,
        table: props.table,
        columns: [{expr: JSON.parse(props.expression), as: 'result'}],
        query: props.query,
        distinct: props.distinct
      }
    }
  })
);

export default QueryResult;
