const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

// UI components
const TooltipEllipsis = require('ui/TooltipEllipsis');
const Icon = require('ui/Icon');

const Tooltip = require('rc-tooltip');
import 'rc-tooltip/assets/bootstrap.css'

let PropertyHeader = React.createClass({

  mixins: [
             PureRenderMixin,
             FluxMixin
  ],

  propTypes: {
    prefix: React.PropTypes.node,
    name: React.PropTypes.string.isRequired,
    description: React.PropTypes.string.isRequired,
    tooltipPlacement: React.PropTypes.string.isRequired,
    tooltipTrigger: React.PropTypes.arrayOf(React.PropTypes.string),
    onClick: React.PropTypes.func
  },


  render: function() {

    let {name, description, tooltipPlacement, tooltipTrigger, prefix, onClick, ...other} = this.props;

    var tooltip = "";
    if (description)
    {
      tooltip = <Tooltip placement={tooltipPlacement}
                 trigger={tooltipTrigger}
                 overlay={<span>{description}</span>}>
          <Icon className="info" name="info-circle"/>
        </Tooltip>;
    }



    return (
      <span onClick={(event) => {
              if (onClick && event.target.className.indexOf("info") == -1)
                onClick(event);
                }}
        {...other}>
        {prefix}
        <TooltipEllipsis className="label">{name}</TooltipEllipsis>
        {tooltip}
      </span>
    );
  }

});

module.exports = PropertyHeader;
