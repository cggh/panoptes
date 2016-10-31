import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

import QueryConverter from 'util/QueryConverter';


let QueryString = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    StoreWatchMixin('PanoptesStore')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    prefix: React.PropTypes.string
  },

  getStateFromFlux() {
    return {
      subsets: this.getFlux().store('PanoptesStore').getStoredSubsetsFor(this.props.table)
    };
  },

  render() {
    let {query, prefix, table} = this.props;
    let {subsets} = this.state;
    return QueryConverter.tableQueryToReactComponent(
      {
        prefix,
        properties: this.tableConfig().properties,
        query,
        subsets,
        table
      }
    );
  }

});

export default QueryString;
