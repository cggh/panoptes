const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

// UI components
const TooltipEllipsis = require('ui/TooltipEllipsis');
const Icon = require('ui/Icon');

const Tooltip = require('rc-tooltip');
import 'rc-tooltip/assets/bootstrap.css'

let PropertyHeader = React.createClass({

  mixins: [
             PureRenderMixin,
             FluxMixin,
             ConfigMixin
  ],

  propTypes: {
    name: React.PropTypes.string.isRequired,
    description: React.PropTypes.string.isRequired,
    tooltipPlacement: React.PropTypes.string.isRequired,
    tooltipTrigger: React.PropTypes.arrayOf(React.PropTypes.string)
  },


  render: function() {
    
    let {name, description, tooltipPlacement, tooltipTrigger} = this.props;
    
    return (
      <div>
        <TooltipEllipsis className="label">{name}</TooltipEllipsis>
        <Tooltip placement={tooltipPlacement}
                 trigger={tooltipTrigger}
                 overlay={<span>{description}</span>}>
          <Icon className="info" name="info-circle"/>
        </Tooltip>
      </div>
    );
  }

});

module.exports = PropertyHeader;
