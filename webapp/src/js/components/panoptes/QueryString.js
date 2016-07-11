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
    FluxMixin,
    ConfigMixin,
    StoreWatchMixin('PanoptesStore')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    prepend: React.PropTypes.string.isRequired
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
        {`${prepend} No filter`}
      </span>;

    let nameMap = {};
    this.tableConfig().properties.forEach((property) => {
      nameMap[property.id] = {
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
