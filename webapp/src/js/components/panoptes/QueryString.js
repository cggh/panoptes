import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import SQL from 'panoptes/SQL';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import queryToString from 'util/queryToString';

let QueryString = createReactClass({
  displayName: 'QueryString',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: PropTypes.string.isRequired,
    query: PropTypes.string.isRequired,
    prefix: PropTypes.string
  },

  getDefaultProps() {
    return {
      prefix: '',
      query: SQL.nullQuery
    };
  },

  render() {
    let {query, prefix} = this.props;
    let properties = this.tableConfig() !== undefined ? this.tableConfig().properties : undefined;
    return <span>
        {prefix + queryToString({properties, query})}
      </span>;
  },
});

export default QueryString;
