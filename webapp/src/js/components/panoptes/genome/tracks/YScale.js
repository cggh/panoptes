import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import {scaleLinear} from 'd3-scale';

let YScale = createReactClass({
  displayName: 'YScale',
  mixins: [PureRenderMixin],

  propTypes: {
    min: PropTypes.number,
    max: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number
  },

  componentDidMount() {
    this.paint();
  },

  componentDidUpdate() {
    this.paint();
  },

  render() {
    const {width, height} = this.props;
    return (
      <canvas ref="canvas" width={width} height={height}/>
    );
  },

  paint() {
    const {min, max, width, height} = this.props;
    const canvas = this.refs.canvas;
    const scale = scaleLinear().domain([min, max]).range([height, 0]);
    const n = 4;
    const format = scale.tickFormat(n);

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 0.25;
    ctx.strokeStyle = 'darkgrey';
    ctx.textAlign = 'end';
    ctx.textBaseline = 'middle';
    ctx.font = '12px Roboto,sans-serif';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    scale.ticks(n).forEach((y) => {
      const Y = scale(y);
      if (Y > 12 && Y < height - 12) {
        ctx.fillText(format(y), width - 5, Y);
        ctx.moveTo(0, Y);
        ctx.lineTo(width, Y);
      }
    });
    ctx.stroke();
  },
});

export default YScale;


