import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

let LegendElement = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    name: React.PropTypes.string,
    colour: React.PropTypes.string
  },

  render() {
    const {name, colour} = this.props;
    return (
      <div className="legend-element" key={name}>
        <svg width="14" height="26">
          <rect x="0" y="6" width="14" height="14" style={{fill: colour}}/>
        </svg>
        <div className="label">
          {name}
        </div>
      </div>
    );
  }
});

export default LegendElement;
