import React from 'react';

import createReactClass from 'create-react-class';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';


// UI components
import TooltipEllipsis from 'ui/TooltipEllipsis';
import Icon from 'ui/Icon';

import PropTypes from 'prop-types';

import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';
import TablePlot from 'TablePlot';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';

let PropertyHeader = createReactClass({
  displayName: 'PropertyHeader',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    prefix: PropTypes.node,
    table: PropTypes.string.isRequired,
    propId: PropTypes.string.isRequired,
    tooltipPlacement: PropTypes.string.isRequired,
    tooltipTrigger: PropTypes.arrayOf(PropTypes.string),
    onClick: PropTypes.func
  },

  render() {
    const {table, propId, tooltipPlacement, tooltipTrigger, prefix, onClick, ...other} = this.props;
    const {name, description, isNumerical, isCategorical} = this.propertiesByColumn(propId);
    delete other.columnKey;
    const tooltip = <Tooltip placement={tooltipPlacement}
      trigger={tooltipTrigger}
      overlay={<div className="vertical stack">
        <div className="tooltip-description"><HTMLWithComponents>{description}</HTMLWithComponents></div>
        {isCategorical || isNumerical ?
        <div className="grow">Summary:
          <div className="tooltip-plot"><TablePlot
          table={table}
          plotType="histogram"
          // query={this.getDefinedQuery()}
          horizontal={propId}
          // randomSubsetSize={randomSubsetSize}
        /></div></div> : null }
      </div>
      }>
      <Icon className="info" name="info" style={{cursor: 'pointer'}} title="Click for more information"/>
    </Tooltip>;
    return (
      <span onClick={(event) => {
        if (onClick && event.target.className.indexOf('info') == -1)
          onClick(event);
      }}
      {...other}>
        {prefix}
        <TooltipEllipsis className="label">{name}</TooltipEllipsis>
        {tooltip}
      </span>
    );
  },
});

export default PropertyHeader;
