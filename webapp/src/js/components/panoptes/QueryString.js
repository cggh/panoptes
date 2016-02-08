import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

import SQL from 'panoptes/SQL';
import Formatter from 'panoptes/Formatter';


let QueryString = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
    StoreWatchMixin('PanoptesStore')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    prepend: React.PropTypes.string.isRequired
  },

  componentWillMount() {
    this.config = this.config.tables[this.props.table];
  },

  getStateFromFlux() {
    return {
      subsets: this.getFlux().store('PanoptesStore').getStoredSubsetsFor(this.props.table)
    };
  },

  render() {
    let {query, prepend, ...other} = this.props;
    let qry = SQL.WhereClause.decode(query);

    if ((!qry) || (qry.isTrivial))
      return <span {...other}>
        {`${prepend} All`}
      </span>;

    let nameMap = {};
    this.config.properties.forEach((property) => {
      nameMap[property.propid] = {
        name: property.name,
        toDisplayString: Formatter.bind(this, property)
      };
    });

    let subsetMap = {};
    this.state.subsets.map((subset) => {
      subsetMap[subset.id] = {
        name: subset.name
      };
    });

    let queryData = {
      fieldInfoMap: nameMap,
      subsetMap: subsetMap
    };
    return (
      <span {...other}>
        { prepend + ' ' + qry.toQueryDisplayString(queryData, 0) }
      </span>
    );
  }

});

module.exports = QueryString;
