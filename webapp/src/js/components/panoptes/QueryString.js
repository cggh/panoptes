const _ = require('lodash');
const React = require('react');

const PureRenderMixin = require('mixins/PureRenderMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const FluxMixin = require('mixins/FluxMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

const SQL = require('panoptes/SQL');
const Formatter = require('panoptes/Formatter');


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

    var nameMap = {};
    _.each(this.config.properties, (property) => {
      nameMap[property.propid] = {
        name: property.name,
        toDisplayString: Formatter.bind(this, property)
      };
    });

    var subsetMap = {};
    this.state.subsets.map((subset) => {
      subsetMap[subset.id] = {
        name: subset.name
      };
    });

    var queryData = {
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
