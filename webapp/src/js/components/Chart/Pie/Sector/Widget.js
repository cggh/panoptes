import React from 'react';
import {arc} from 'd3-shape';

let PieChartSector = React.createClass({

  propTypes: {
    outerRadius: React.PropTypes.number,
    innerRadius: React.PropTypes.number,
    fillColor: React.PropTypes.string,
    arcDescriptor: React.PropTypes.object,
    title: React.PropTypes.string,
    onClick: React.PropTypes.func,
    className: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      outerRadius: 20,
      innerRadius: 0,
      className: 'pie-chart-sector'
    };
  },

  render: function() {

    let {outerRadius, innerRadius, fillColor, arcDescriptor, title, onClick, className} = this.props;

    let arcPath = arc().outerRadius(outerRadius).innerRadius(innerRadius);

    return (
      <g className={className} style={{fill: fillColor}} onClick={onClick}>
        <title>{title}</title>
        <path d={arcPath(arcDescriptor)}></path>
      </g>
    );
  }
});

export default PieChartSector;
