import React from 'react';
import SQL from 'panoptes/SQL';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import queryToString from 'util/queryToString';

let QueryString = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    prefix: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      prefix: '',
      query: SQL.nullQuery
    }
  },

  render() {
    let {query, prefix} = this.props;
    let properties = this.tableConfig().properties;
    return <span>
        { prefix + queryToString({properties, query})}
      </span>;
  }
});

export default QueryString;
