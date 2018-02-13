import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';

import SQL from 'panoptes/SQL';
import withAPIData from 'hoc/withAPIData';
import {format} from 'd3-format';
import _isUndefined from 'lodash.isundefined';

let QueryResult = createReactClass({
  displayName: 'QueryResult',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    query: PropTypes.string,
    expression: PropTypes.string,
    table: PropTypes.string.isRequired,
    formatNumber: PropTypes.string,
    distinct: PropTypes.bool,
    singular: PropTypes.string,
    plural: PropTypes.string,
    boldNumber: PropTypes.bool,
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
      expression: JSON.stringify(['count', ['*']]),
      boldNumber: true
    };
  },

  render() {
    let {formatNumber, data, plural, singular, boldNumber} = this.props;
    if (!_isUndefined(data) && !_isUndefined(formatNumber)) {
      data = format(formatNumber)(data.result[0]);
    } else if (!_isUndefined(data) && data) {
      data = data.result[0];
    }
    if (!plural || !singular) {
      return boldNumber ? <strong>{data ? data : '...'}</strong> : <span>{data ? data : '...'}</span>;
    } else {
      return <span>
        {boldNumber ? <strong>{data ? data : '...'}</strong> : <span>{data ? data : '...'}</span>} {data === 1 ? singular : plural}
      </span>
    }
  },
});

QueryResult = withAPIData(QueryResult, ({config, props}) => (
  {
    requests: {
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
    }
  })
);

export default QueryResult;
