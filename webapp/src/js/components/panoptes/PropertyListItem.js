import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Panoptes components
import PropertyHeader from 'panoptes/PropertyHeader';
import PropertyCell from 'panoptes/PropertyCell';

let PropertyListItem = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    propId: React.PropTypes.string.isRequired,
    value: React.PropTypes.any,
    tooltipPlacement: React.PropTypes.string.isRequired,
    tooltipTrigger: React.PropTypes.arrayOf(React.PropTypes.string),
  },

  render: function() {
    const {table, propId, value, tooltipPlacement, tooltipTrigger} = this.props;
    const propertyData = this.tableConfig().propertiesById[propId];

    return (
       <tr className="table-col-row">
         <th className="table-col-header">
           <PropertyHeader table={table} propId={propId} tooltipPlacement={tooltipPlacement} tooltipTrigger={tooltipTrigger} />
         </th>
         <td className="table-col-cell" style={{backgroundColor: 'inherit'}}><PropertyCell prop={propertyData} value={value}/></td>
       </tr>
    );


  }

});

export default PropertyListItem;
