import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import PropTypes from 'prop-types';
import RAF from 'raf';
import now from 'performance-now';
import classnames from 'classnames';
const HEIGHT = 20;

let LoadingIndicator = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    animate: PropTypes.bool,
    width: PropTypes.number
  },

  componentDidMount() {
    this.paint(this.refs.canvas, now() / 100 % 100);
    if (this.props.animate)
      this.raf = RAF(this.onTick);
  },

  componentWillReceiveProps(nextProps) {
    if (!this.raf && nextProps.animate)
      this.raf = RAF(this.onTick);
    if (!nextProps.animate && this.raf) {
      RAF.cancel(this.raf);
      this.raf = null;
    }
  },

  componentWillUnmount() {
    if (this.raf)
      RAF.cancel(this.raf);
  },

  onTick() {
    this.paint(this.refs.canvas, now() / 100 % 100);
    this.raf = RAF(this.onTick);
  },

  paint(canvas, state) {
    let ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#3d8bd5';
    ctx.fillStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.fillRect(0, 0, 101, 21);
    ctx.beginPath();
    ctx.moveTo(0, 10 + (10 * Math.sin(state)));
    for (let i = 0; i <= 100; i += 4) {
      ctx.lineTo(i, 10 + (10 * Math.sin(((i * Math.PI * 4) / 100) + state)));
    }
    ctx.moveTo(0, 10 + (10 * Math.cos(state)));
    for (let i = 0; i <= 100; i += 4) {
      ctx.lineTo(i, 10 + (10 * Math.cos(((i * Math.PI * 4) / 100) + state)));
    }
    for (let i = 0; i <= 100; i += 10) {
      ctx.moveTo(i, 10 + (10 * Math.cos(((i * Math.PI * 4) / 100) + state)));
      ctx.lineTo(i, 10 + (10 * Math.sin(((i * Math.PI * 4) / 100) + state)));
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgb(255,50,50)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 10 + (10 * Math.cos(((20 * Math.PI * 4) / 100) + state)));
    ctx.lineTo(20, 10 + (10 * Math.sin(((20 * Math.PI * 4) / 100) + state)));
    ctx.stroke();
    ctx.strokeStyle = 'rgb(255,170,50)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, 10 + (10 * Math.cos(((30 * Math.PI * 4) / 100) + state)));
    ctx.lineTo(30, 10 + (10 * Math.sin(((30 * Math.PI * 4) / 100) + state)));
    ctx.stroke();
    ctx.strokeStyle = 'rgb(0,128,192)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, 10 + (10 * Math.cos(((40 * Math.PI * 4) / 100) + state)));
    ctx.lineTo(40, 10 + (10 * Math.sin(((40 * Math.PI * 4) / 100) + state)));
    ctx.stroke();
    ctx.strokeStyle = 'rgb(0,192,120)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 10 + (10 * Math.cos(((50 * Math.PI * 4) / 100) + state)));
    ctx.lineTo(50, 10 + (10 * Math.sin(((50 * Math.PI * 4) / 100) + state)));
    ctx.stroke();

  },

  render() {
    return <canvas ref="canvas"
                   className={classnames({
                     'loading-canvas': true,
                     'loading': this.props.animate
                   })}
                   width={this.props.width}
                   height={HEIGHT}/>;
  }
});

export default LoadingIndicator;
