import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import PropertyListItem from 'panoptes/PropertyListItem';

let PropertyList = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    propertiesData: React.PropTypes.array.isRequired
  },

  render: function() {

    let {propertiesData, className} = this.props;

    return (
      <table className={className}>
        <tbody>
          {
            propertiesData.map(
              (propertyData, index) =>
                <PropertyListItem key={index} rowIndex={index} propertyData={propertyData} tooltipPlacement={"right"} tooltipTrigger={['click']} />
            )
          }
        </tbody>
      </table>
    );


  }

});

module.exports = PropertyList;
