const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const tickWidth = require('panoptes/TickWidth.js');

const d3 = require('d3');


let Background = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    sideWidth: React.PropTypes.number
  },

  render() {
    let { start, end, width, height, sideWidth, ...other } = this.props;
    let scale = d3.scale.linear().domain([start, end]).range([sideWidth, width]);
    if (width == 0 || height == 0)
      return null;
    //Make a small tick be close to this many pixels:
    let SMALL_TICK = 50;
    let smallTickWidth = Math.max(tickWidth(end - start, width, SMALL_TICK),1);
    start = Math.max(0,start);
    //Overdraw in the negative direction to go under side controls
    start = Math.floor((start/smallTickWidth)-(sideWidth*2/SMALL_TICK)) * smallTickWidth;
    start = Math.max(0,start);
    end = Math.max(start, end);
    let smallTicks = [];
    let largeTicks = [];
    for (let pos = start; pos < end; pos += smallTickWidth) {
      let x = scale(pos);
      if (pos/smallTickWidth % 5 === 0) {
        largeTicks.push(
          <g className="major tick" key={pos}>
            <line x1={x} x2={x} y1={0} y2={height}/>
          </g>
        );
      } else {
        smallTicks.push(
          <g className="minor tick" key={pos}>
            <line x1={x} x2={x} y1={0} y2={height}/>
          </g>
        );
      }
    }

    return (
      <svg className="background scale" width={width} height={height}>
        {smallTicks}
        {largeTicks}
      </svg>
    );
  }

});

module.exports = Background;
