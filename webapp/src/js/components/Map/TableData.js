import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import FluxMixin from 'mixins/FluxMixin';
import SQL from 'panoptes/SQL';
import withAPIData from 'hoc/withAPIData';
import filterChildren from 'util/filterChildren';
import resolveJoins from 'panoptes/resolveJoins';
import {propertyColour} from 'util/Colours';
import _map from 'lodash.map';
import _keys from 'lodash.keys';

let TableData = createReactClass({
  displayName: 'TableData',

  mixins: [
    FluxMixin
  ],

  propTypes: {
    table: PropTypes.string.isRequired,
    groupBy: PropTypes.array, // FIXME: support PropTypes.arrayOf(PropTypes.string),
    joins: PropTypes.array, // FIXME: support PropTypes.arrayOf(PropTypes.object),
    query: PropTypes.string,
    start: PropTypes.number,
    stop: PropTypes.number,
    distinct: PropTypes.bool,
    randomSample: PropTypes.bool,
    cache: PropTypes.bool,
    children: PropTypes.node.isRequired, // Children receive `data` prop array or object, depending on `iterate` option.
    iterate: PropTypes.bool, // When true, passes either a data object or mapped props, to N copies of children, else passes entire data array to children.
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
      iterate: false,
    };
  },

  render() {
    let {children, config, table, iterate} = this.props;
    let {data} = this.props;

    if (data === undefined) {
      return null;
    }

    const filteredChildren = filterChildren(this, children); // Remove spaces.
    if (iterate) {
      return data.map((row) => React.cloneElement(filteredChildren, {...row}));
    } else {
      return React.cloneElement(filteredChildren, {...data});
    }
  },
});

TableData = withAPIData(TableData, ({config, props}) => {
  //Extract all the known props even if we don't need them as those left are columns
  let {
    children, table, query, orderBy, groupBy, start, stop, distinct,
    randomSample, cache, joins, iterate, ...columns
  } = props;

  columns = _map(columns, (expr, as) => ({expr, as}));

  let groupBySet = new Set(groupBy);

  const resolvedArgs = resolveJoins({
    database: config.dataset,
    table,
    columns: columns,
    query, orderBy,
    groupBy: Array.from(groupBySet),
    start, stop, distinct,
    randomSample, cache, joins,
    //We need individual rows as objects if we are interating so transpose here
    transpose: iterate
  }, config);
  return {
    requests: {
      data: {
        method: 'query',
        args: resolvedArgs,
      },
    }
  };
});

export default TableData;
