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
        data: React.PropTypes.object.isRequired
  },

  render: function() {
    
    let {data} = this.props;
    
    return (
      <table>
        <tbody>
          {Object.keys(data).map(function(key, i){return <PropertyListItem key={i} name={key} value={data[key]}/>})}
        </tbody>
      </table>
    );
    
    
  }

});

module.exports = PropertyList;
