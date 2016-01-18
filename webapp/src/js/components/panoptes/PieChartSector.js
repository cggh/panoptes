const React = require('react');
const d3 = require('d3');

let PieChartSector = React.createClass({

  getDefaultProps() {
    return {
      outerRadius: 20,
      innerRadius: 0,
      transform: 'rotate(90)',
      className: 'pie-chart-sector'
    };
  },

  render: function() {

    let {outerRadius, innerRadius, fillColor, arcDescriptor, title, onClick, transform, className} = this.props;

    let arc = d3.svg.arc().outerRadius(outerRadius).innerRadius(innerRadius);

    return (
      <g className={className} style={{fill: fillColor}} transform={transform} onClick={onClick}>
        <title>{title}</title>
        <path d={arc(arcDescriptor)}></path>
      </g>
    );
  }
});

module.exports = PieChartSector;
