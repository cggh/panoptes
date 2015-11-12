const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

// Panoptes components
const PropertyHeader = require('panoptes/PropertyHeader');
const PropertyCell = require('panoptes/PropertyCell');


let PropertyListItem = React.createClass({

    mixins: [
             PureRenderMixin,
             FluxMixin,
             ConfigMixin
           ],

   propTypes: {
        name: React.PropTypes.string.isRequired,
        value: React.PropTypes.string.isRequired
   },


      
      
  render: function() {
    let {name, value} = this.props;
    
    // TODO: prop (columnData) for PropertyCell
    //let tableConfig = this.config.tables[this.props.table];
    //let columnData = tableConfig.propertiesMap[column];
    
    return (
       <tr>
         <th><PropertyHeader propertyName={name}/></th>
         <td><PropertyCell prop={{}} value={value}/></td>
       </tr>
    );
    
  
  }

});

module.exports = PropertyListItem;
