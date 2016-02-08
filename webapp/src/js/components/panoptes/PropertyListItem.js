import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import PropertyHeader from 'panoptes/PropertyHeader';
import PropertyCell from 'panoptes/PropertyCell';

let PropertyListItem = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    propertyData: React.PropTypes.object.isRequired,
    tooltipPlacement: React.PropTypes.string.isRequired,
    tooltipTrigger: React.PropTypes.arrayOf(React.PropTypes.string),
    rowIndex: React.PropTypes.number.isRequired
  },

  render: function() {
    let {propertyData, tooltipPlacement, tooltipTrigger, rowIndex} = this.props;

    let {name, description, value} = propertyData;

    let backgroundColor = 'inherit';

    let rowClass = 'table-col-row-odd';
    if (rowIndex % 2) {
      rowClass = 'table-col-row-even';
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
