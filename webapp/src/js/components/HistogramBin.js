import PropTypes from 'prop-types';
import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

// Credit: https://github.com/english/react-d3-histogram

let HistogramBin = React.createClass({

  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    title: PropTypes.string,
    fill: PropTypes.string
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
