const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const d3 = require('d3');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

let PieChartSector = React.createClass({
  
  
  getDefaultProps() {
    return {
      outerRadius: 20,
      innerRadius: 0
    };
  },
  
  render: function()
  {
    let {outerRadius, innerRadius, color, arcDescriptor, title} = this.props;
    
    var arc = d3.svg.arc().outerRadius(outerRadius).innerRadius(innerRadius);
    
    return (
      <g className="pie-chart-sector" style={{fill: color}} transform="rotate(90)">
        <title>{title}</title>
        <path d={arc(arcDescriptor)}></path>
      </g>
    );
  }
});

module.exports = PieChartSector;
