import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';

import SQL from 'panoptes/SQL';
import withAPIData from 'hoc/withAPIData';
import {format, precisionFixed} from 'd3-format';
import _isUndefined from 'lodash.isundefined';
import filterChildren from 'util/filterChildren';

let PercentMatching = createReactClass({
  displayName: 'PercentMatching',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    numQuery: PropTypes.string,
    domQuery: PropTypes.string,
    table: PropTypes.string.isRequired,
    childNumeratorProp: PropTypes.string,
    childDenominatorProp: PropTypes.string,
    children: PropTypes.node,
    all: PropTypes.number, // Supplied by withAPIData
    matching: PropTypes.number, // Supplied by withAPIDataper
  },

  getDefaultProps() {
    return {
      numQuery: SQL.nullQuery,
      domQuery: SQL.nullQuery,
      childNumeratorProp: 'numerator',
      childDenominatorProp: 'denominator',
    };
  },

  render() {
    let {all, matching, childNumeratorProp, childDenominatorProp, children, loadStatus} = this.props;
    children = filterChildren(this, children);
    if (children !== undefined && children !== null && childNumeratorProp !== undefined) {
      return React.Children.map(children,
        (child) => {
          const numerator = matching !== undefined ? matching.result[0] : undefined;
          const denominator = all !== undefined && all.result[0] !== 0 ? all.result[0] : undefined;
          return React.cloneElement(child, {
            [childNumeratorProp]: numerator,
            [childDenominatorProp]: denominator,
            loadStatus
          });
        }
      );
    } else {
      if (_isUndefined(all) || _isUndefined(matching)) {
        return <span>...</span>;
      }
      all = all.result[0];
      matching = matching.result[0];
      if (all === 0) {
        return <span>div/0!</span>;
      } else {
        let p = Math.max(0, precisionFixed(0.05) - 2);
        let f = format(`.${p}%`);
        return <span>{f(matching / all)}</span>;
      }
    }
  },
});

PercentMatching = withAPIData(PercentMatching, ({config, props}) => (
  {
    requests: {
      matching: {
        method: 'query',
        args: {
          database: config.dataset,
          table: props.table,
          columns: [{expr: ['count', ['*']], as: 'result'}],
          query: props.numQuery
        }
      },
      all: {
        method: 'query',
        args: {
          database: config.dataset,
          table: props.table,
          columns: [{expr: ['count', ['*']], as: 'result'}],
          query: props.domQuery
        }
      }
    }
  })
);

export default PercentMatching;
