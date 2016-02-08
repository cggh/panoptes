import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

import d3 from 'd3';

const HEIGHT = 40;

let YScale = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    min: React.PropTypes.number,
    max: React.PropTypes.number,
    width: React.PropTypes.number,
    height: React.PropTypes.number
  },

  render() {
    let {min, max, width, height} = this.props;
    let scale = d3.scale.linear().domain([min, max]).range([height, 0]);
    let n = 5;
    let format = scale.tickFormat(n, 's');
    return (
      <g className="y tick">
        {scale.ticks(n).map((y) => {
          let Y = scale(y);
          return <g key={y}>
            {Y > 12 && Y < height - 12 ? <text x={width - 5} y={Y}>{format(y)}</text> : null}
            <line x1={0} x2={width} y1={Y} y2={Y}></line>
          </g>;
        }
      )}
    </g>);
  }
});

module.exports = YScale;


