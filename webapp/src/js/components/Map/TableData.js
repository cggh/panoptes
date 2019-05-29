import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import FluxMixin from 'mixins/FluxMixin';
import SQL from 'panoptes/SQL';
import withAPIData from 'hoc/withAPIData';
import filterChildren from 'util/filterChildren';
import resolveJoins from 'panoptes/resolveJoins';
import _map from 'lodash.map';
import _keys from 'lodash.keys';
import _values from 'lodash.values';
import _pick from 'lodash.pick';
import _includes from 'lodash.includes';
import _isFunction from 'lodash.isfunction';
import _pickBy from 'lodash.pickby';

let TableData = createReactClass({
  displayName: 'TableData',

  mixins: [
    FluxMixin
  ],

  propTypes: {
    table: PropTypes.string.isRequired,
    groupBy: PropTypes.array, // FIXME: support PropTypes.arrayOf(PropTypes.string),
    clientGroupBy: PropTypes.array, // FIXME: support PropTypes.arrayOf(PropTypes.string),
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
    let {
      children, table, query, orderBy, groupBy, clientGroupBy, start, stop, distinct,
      randomSample, cache, joins, iterate, ...columns
    } = this.props;
    let {data} = this.props;

    if (data === undefined) {
      return null;
    }

    //Resolve any functional props TODO This, but for non-grouped or iterated, we do this in render as they may contain closures that have changed after fetch which the logic of withAPIdata will not see as a change, so a recalc will not be triggered
    _keys(_pickBy(columns, (func, column) => _isFunction(func))).forEach((column) => {
      data[column] = columns[column](data);
    });


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
    children, table, query, orderBy, groupBy, clientGroupBy, start, stop, distinct,
    randomSample, cache, joins, iterate, ...columns
  } = props;

  let requestColumns = _map(_pickBy(columns, (expr, as) => !_isFunction(expr)), (expr, as) => ({expr, as}));
  let groupBySet = new Set(groupBy);

  const resolvedArgs = resolveJoins({
    database: config.dataset,
    table,
    columns: requestColumns,
    query, orderBy,
    groupBy: Array.from(groupBySet),
    start, stop, distinct,
    randomSample, cache, joins,
    //We need individual rows as objects if we are interating so transpose here
    transpose: iterate || clientGroupBy
  }, config);
  return {
    requests: {
      data: {
        method: 'query',
        args: resolvedArgs,
      },
    },
    postProcess: ({data}) => {
      if (!clientGroupBy)
        return data;
      let sets = {};
      let setOrder = [];
      let getKey = (row) => {
        let a = _values(_pick(row, clientGroupBy));
        return a.toString();
      };
      for (let i = 0; i < data.length; i++) {
        let key = getKey(data[i]);
        if (!sets[key]) {
          sets[key] = [];
          setOrder.push(key);
        }
        sets[key].push(data[i]);
      }
      let groups = _values(_pick(sets, setOrder));
      if (iterate)
        return groups;
      let returnColumns = {};
      _keys(columns).forEach((column) =>
        returnColumns[column] = []
      );
      for (let i = 0; i < groups.length; i++) {
        _keys(columns).forEach((column) => {
          if (_includes(clientGroupBy, column))
            returnColumns[column].push(groups[i][0][column]);
          else {
            returnColumns[column].push(_map(groups[i], (group) => group[column]));
          }
        });
      }
      return {data: returnColumns};
    }
  };
});

export default TableData;
