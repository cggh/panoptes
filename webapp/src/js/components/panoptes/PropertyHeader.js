const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');


let PropertyHeader = React.createClass({

  mixins: [
             PureRenderMixin,
             FluxMixin,
             ConfigMixin
  ],

  propTypes: {
    propertyName: React.PropTypes.string.isRequired
  },


  render: function() {
    
    let {propertyName} = this.props;
    
    return <div>
        {propertyName}
    </div>
    
  }

});

module.exports = PropertyHeader;
