const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');

const SQL = require('panoptes/SQL');


let QueryString = React.createClass({
  mixins: [PureRenderMixin],

  render() {
    let {query, table_config, ...other} = this.props;
    let qry = SQL.WhereClause.decode(query);

    if ((!qry) || (qry.isTrivial))
      return <span {...other}>
        All
      </span>;

    var nameMap = {};
    _.each(MetaData.customProperties,function(propInfo) {
      if (propInfo.tableid == table.id)
        nameMap[propInfo.propid] = {
          name: propInfo.name,
          toDisplayString: propInfo.toDisplayString
        };
    });


    var subsetMap = {};
    _.each(table.storedSubsets, function(subset) {
      subsetMap[subset.id] = {
        name: subset.name
      };
    });
    var queryData = {
      fieldInfoMap: whatevber,
      subsetMap: subsetMap
    };

    return (
      <span {...other}>
        { qry.toQueryDisplayString(queryData, 0) }
      </span>
    );
  }

});

module.exports = QueryString;
