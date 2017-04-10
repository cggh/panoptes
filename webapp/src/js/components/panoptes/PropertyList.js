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
    table: React.PropTypes.string.isRequired,
    propertiesData: React.PropTypes.arrayOf(
      React.PropTypes.shape({
        id: React.PropTypes.string.isRequired,
        value: React.PropTypes.any
      }
    )).isRequired,
    className: React.PropTypes.string
  },

  render: function() {

    let {propertiesData, className, table} = this.props;

    return (
      <table className={className}>
        <tbody>
          {
            propertiesData.map(
              ({id, value}) =>
                <PropertyListItem key={id} table={table} propId={id} value={value} tooltipPlacement={'right'} tooltipTrigger={['click']} />
            )
          }
        </tbody>
      </table>
    );


  }

});

export default PropertyList;
