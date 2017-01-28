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
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    title: React.PropTypes.string,
    fill: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      fill: '#3d8bd5'
    };
  },

  render() {
    let {
      x, y, width, height, fill, title
    } = this.props;

    return (
      <rect x={x} y={y}
            width={width} height={height}
            fill={fill}>
        <title>{title}</title>
      </rect>
    );
  }

});

export default HistogramBin;
