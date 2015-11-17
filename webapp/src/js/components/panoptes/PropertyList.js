const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

// Panoptes components
const PropertyListItem = require('panoptes/PropertyListItem');

let PropertyList = React.createClass({

  mixins: [
             PureRenderMixin,
             FluxMixin,
             ConfigMixin
  ],

  propTypes: {
        propertiesData: React.PropTypes.object.isRequired,
        title: React.PropTypes.string
  },

  title() {
    return this.props.title;
  },
  
  
  
  render: function() {
    
    let {propertiesData, title} = this.props;
    
    return (
      <table>
        <tbody>
          {
            propertiesData.map(
              function(object, i){
                return <PropertyListItem key={i} propertyData={object} tooltipPlacement={"right"} tooltipTrigger={['hover']} />
              }
            )
          }
        </tbody>
      </table>
    );
    
    
  }

});

module.exports = PropertyList;
