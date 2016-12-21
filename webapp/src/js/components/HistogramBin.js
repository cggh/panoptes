import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

// Credit: https://github.com/english/react-d3-histogram

let HistogramBin = React.createClass({

  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    x: React.PropTypes.number.isRequired,
    y: React.PropTypes.number.isRequired,
    dx: React.PropTypes.number.isRequired,
    scaledX: React.PropTypes.number.isRequired,
    scaledY: React.PropTypes.number.isRequired,
    scaledDx: React.PropTypes.number.isRequired,
    maxHeight: React.PropTypes.number.isRequired,
    unitNameSingle: React.PropTypes.string,
    unitNamePlural: React.PropTypes.string,
    valueName: React.PropTypes.string,
    fillColour: React.PropTypes.string,
    values: React.PropTypes.array
  },

  getDefaultProps() {
    return {
      fillColour: '#3d8bd5'
    };
  },

  render() {
    let {
      x, y, dx,
      scaledX, scaledY, scaledDx,
      maxHeight,
      unitNameSingle, unitNamePlural,
      valueName, values,
      fillColour
    } = this.props;

    return (
      <g transform={`translate(${scaledX}, ${scaledY})`}>
        <rect width={scaledDx} height={maxHeight - scaledY} fill={fillColour}>
          <title>{y} {y > 1 ? unitNamePlural : unitNameSingle} with {valueName} between {x} and {x + dx} <br /> {JSON.stringify(values)}</title>
        </rect>
      </g>
    );

  }

});

export default HistogramBin;
