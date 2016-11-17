import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ColourPicker from 'ui/ColourPicker';
import FluxMixin from 'mixins/FluxMixin';
import {colours} from 'util/Colours';
import Tooltip from 'rc-tooltip';

let LegendElement = React.createClass({
  mixins: [
    FluxMixin,
    PureRenderMixin
  ],

  propTypes: {
    colour: React.PropTypes.string,
    onPickColour: React.PropTypes.func
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
      />)
    }
  },

  render() {
    const {name, colour, onPickColour} = this.props;
    let actions = this.getFlux().actions;
    return (
      <div className="legend-element" key={name}>
        <Tooltip placement={'bottom'}
                 trigger={'click'}
                 overlay={<ColourPicker
                   colour={colour}
                   colours={colours}
                   onPick={this.handlePickColour}
                   />}>
          <svg width="14" height="26" style={{cursor: onPickColour ? 'pointer' : 'inherit'}}>
            <rect x="0" y="6" width="14" height="14" style={{fill: colour}}/>
          </svg>
        </Tooltip>
        <div className="label">
          {name}
        </div>
      </div>
    );
  }
});

export default LegendElement;
