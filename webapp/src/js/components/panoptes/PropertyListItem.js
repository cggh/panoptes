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
        propId: React.PropTypes.string.isRequired,
        value: React.PropTypes.string.isRequired,
        columnData: React.PropTypes.object.isRequired,
        tooltipPlacement: React.PropTypes.string.isRequired,
        tooltipTrigger: React.PropTypes.arrayOf(React.PropTypes.string)
   },


      
      
  render: function() {
    let {propId, value, columnData, tooltipPlacement, tooltipTrigger} = this.props;
    let {description, name} = columnData;
    
    console.log("columnData: " + JSON.stringify(columnData));
    
    return (
       <tr>
         <th><PropertyHeader name={name} description={description} tooltipPlacement={tooltipPlacement} tooltipTrigger={tooltipTrigger} /></th>
         <td><PropertyCell prop={columnData} value={value}/></td>
       </tr>
    );
    
  
  }

});

module.exports = PropertyListItem;
