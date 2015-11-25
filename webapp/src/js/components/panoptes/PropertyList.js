const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

// Panoptes components
const PropertyListItem = require('panoptes/PropertyListItem');

let PropertyList = React.createClass({

  mixins: [
             PureRenderMixin,
             FluxMixin
  ],

  propTypes: {
        propertiesData: React.PropTypes.array.isRequired,
        title: React.PropTypes.string
  },

  title() {
    return this.props.title;
  },


  render: function() {

    let {propertiesData, title, className} = this.props;
    
    return (
      <table className={className}>
        <tbody>
          {
            propertiesData.map(
              function(propertyData, index)
              {
                return <PropertyListItem key={index} rowIndex={index} propertyData={propertyData} tooltipPlacement={"right"} tooltipTrigger={['click']} />
              }
            )
          }
        </tbody>
      </table>
    );


  }

});

module.exports = PropertyList;
