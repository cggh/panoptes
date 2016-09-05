import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// UI components
import TooltipEllipsis from 'ui/TooltipEllipsis';
import Icon from 'ui/Icon';

import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';

let PropertyHeader = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    prefix: React.PropTypes.node,
    name: React.PropTypes.string.isRequired,
    html: React.PropTypes.string,
    description: React.PropTypes.string.isRequired,
    tooltipPlacement: React.PropTypes.string.isRequired,
    tooltipTrigger: React.PropTypes.arrayOf(React.PropTypes.string),
    onClick: React.PropTypes.func
  },


  render: function() {

    let {name, html, description, tooltipPlacement, tooltipTrigger, prefix, onClick, ...other} = this.props;
    delete other.columnKey;

    let tooltip = '';
    if (description) {
      tooltip = <Tooltip placement={tooltipPlacement}
                 trigger={tooltipTrigger}
                 overlay={<span>{description}</span>}>
          <Icon className="info" name="info-circle"/>
        </Tooltip>;
    }


    return (
      <span onClick={(event) => {
        if (onClick && event.target.className.indexOf('info') == -1)
          onClick(event);
      }}
		style={{cursor:(onClick?"pointer":"auto")}}
        {...other}>
        {prefix}
        <TooltipEllipsis className="label">
	        { typeof html != 'undefined' && html != '' ? <span dangerouslySetInnerHTML={{__html:html}}></span> : name }
        </TooltipEllipsis>
        {tooltip}
      </span>
    );
  }

});

module.exports = PropertyHeader;
