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
      propertyData: React.PropTypes.object.isRequired,
      tooltipPlacement: React.PropTypes.string.isRequired,
      tooltipTrigger: React.PropTypes.arrayOf(React.PropTypes.string),
      rowIndex: React.PropTypes.number.isRequired
  },
  
  render: function() {
    let {propertyData, tooltipPlacement, tooltipTrigger, rowIndex} = this.props;
    
    let name = propertyData.name;
    let description = propertyData.description;
    let value = propertyData.value;
    
    let {maxVal, minVal, categoryColors, showBar} = propertyData;
    let backgroundColor = "inherit";
    
    let rowClass = "table-col-row-odd";
    if (rowIndex % 2)
    {
      rowClass = "table-col-row-even";
    }
    
    return (
       <tr className={rowClass}>
         <th className="table-col-header">
           <PropertyHeader name={name} description={description} tooltipPlacement={tooltipPlacement} tooltipTrigger={tooltipTrigger} />
         </th>
         <td className="table-col-cell" style={{backgroundColor: backgroundColor}}><PropertyCell prop={propertyData} value={value}/></td>
       </tr>
    );
    
  
  }

});

module.exports = PropertyListItem;
