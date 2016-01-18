const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const tickWidth = require('panoptes/TickWidth.js');

const d3 = require('d3');

const HEIGHT = 40;

let GenomeScale = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number
  },

  render() {
    let {start, end, width, sideWidth} = this.props;
    let scale = d3.scale.linear().domain([start, end]).range([0, width - sideWidth]);
    if (width == 0)
      return null;
    //Make a small tick be close to this many pixels:
    let SMALL_TICK = 50;
    let smallTickWidth = Math.max(tickWidth(end - start, width, SMALL_TICK), 1);
    start = Math.max(0, start);
    start = Math.floor(start / smallTickWidth) * smallTickWidth;
    end = Math.max(start, end);
    let format = scale.tickFormat((end - start) / (smallTickWidth * 5), end - start > 5000 ? 's' : null);
    let smallTicks = [];
    let largeTicks = [];
    for (let pos = start; pos < end; pos += smallTickWidth) {
      let x = scale(pos);
      if (pos / smallTickWidth % 5 === 0) {
        largeTicks.push(
          <g className="major tick" key={pos}>
            <line x1={x} x2={x} y1={26} y2={40}/>
            <text x={pos == 0 && start == 0 ? x + 10 : x} y={10}>{format(pos)}</text>
          </g>
        );
      } else {
        smallTicks.push(
          <g className="minor tick" key={pos}>
            <line x1={x} x2={x} y1={34} y2={40}/>
          </g>
        );
      }
    }

    return (
      <div className="channel-container">
        <div className="channel" style={{height: HEIGHT}}>
          <div className="channel-side" style={{width: `${sideWidth}px`, height: HEIGHT}}></div>
          <div className="channel-data scale" >
              <svg className="scale" width={width} height={HEIGHT}>
                {smallTicks}
                {largeTicks}
              </svg>
          </div>
        </div>
      </div>
    );
  }

});

module.exports = GenomeScale;


