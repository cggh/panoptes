import React from 'react';
import d3 from 'd3';

let PieChartSector = React.createClass({

  propTypes: {
    outerRadius: React.PropTypes.number,
    innerRadius: React.PropTypes.number,
    fillColor: React.PropTypes.string,
    arcDescriptor: React.PropTypes.object,
    title: React.PropTypes.string,
    onClick: React.PropTypes.func,
    transform: React.PropTypes.string,
    className: React.PropTypes.string
  },

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
      <g className={className} style={{fill: fillColor, strokeWidth: 0.5}} transform={transform} onClick={onClick}>
        <title>{title}</title>
        <path d={arc(arcDescriptor)}></path>
      </g>
    );
  }
});

export default PieChartSector;
