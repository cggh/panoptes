const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');

const d3 = require('d3');

let GenomeScale = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number
  },

  render() {
    let { start, end, width, sideWidth, ...other } = this.props;
    let num_ticks = Math.floor(width / 100);
    let scale = d3.scale.linear().domain([start, end]).range([sideWidth, width]);
    let M_ticks = scale.ticks(num_ticks);
    let m_ticks = scale.ticks(num_ticks * 5);
    let format = scale.tickFormat(num_ticks, end - start > 5000 ? 's' : null);
    return (
      <svg className="scale" width={width} height={100}>
        <text x="5" y="30">Position(bp)</text>
        {_.map(m_ticks, (i) => {
          let x = scale(i);
          return (
            <g className="minor tick" key={i}>
              <line x1={x} x2={x} y1={30} y2={40}/>
            </g>
          )
        })
        }
        {_.map(M_ticks, (i) => {
          let x = scale(i);
          return (
            <g className="major tick" key={i}>
              <line x1={x} x2={x} y1={18} y2={40}/>
              <text x={x} y={0}>{format(i)}</text>
            </g>
          )
        })
        }

      </svg>
    );
  }

});

module.exports = GenomeScale;


