import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ColourPicker from 'ui/ColourPicker';
import FluxMixin from 'mixins/FluxMixin';
import {colours} from 'util/Colours';
import PropTypes from 'prop-types';
import Tooltip from 'rc-tooltip';
import TooltipEllipsis from 'ui/TooltipEllipsis';

let LegendElement = createReactClass({
  displayName: 'LegendElement',

  mixins: [
    FluxMixin,
    PureRenderMixin
  ],

  propTypes: {
    name: PropTypes.node,
    colour: PropTypes.string,
    onPickColour: PropTypes.func
  },

  handlePickColour(colour) {
    this.props.onPickColour(colour);
  },

  handleColourClick() {
    let actions = this.getFlux().actions;
    let {colour, onPickColour} = this.props;
    if (onPickColour) {
      actions.session.modalOpen(<ColourPicker
        colour={colour}
        colours={colours}
        onPick={this.handlePickColour}
      />);
    }
  },

  render() {
    const {name, colour, onPickColour} = this.props;
    return (
      <div className="legend-element" key={name}>
        <Tooltip placement={'bottom'}
          trigger={'click'}
          overlay={<ColourPicker
            colour={colour}
            colours={colours}
            onPick={this.handlePickColour}
          />}>
          <i className="fa fa-square" style={{color: colour, cursor: (onPickColour ? 'pointer' : 'inherit')}}/>
        </Tooltip>
        <TooltipEllipsis className="label">
          {name}
        </TooltipEllipsis>
      </div>
    );
  },
});

export default LegendElement;
