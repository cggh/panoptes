import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import PropertyListItem from 'panoptes/PropertyListItem';

let PropertyList = createReactClass({
  displayName: 'PropertyList',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    table: PropTypes.string.isRequired,
    propertiesData: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        value: PropTypes.any
      }
    )).isRequired,
    className: PropTypes.string
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


  },
});

export default PropertyList;
