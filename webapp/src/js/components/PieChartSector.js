import PropTypes from 'prop-types';
import React from 'react';
import {arc} from 'd3-shape';

let PieChartSector = React.createClass({

  propTypes: {
    outerRadius: PropTypes.number,
    innerRadius: PropTypes.number,
    fillColor: PropTypes.string,
    arcDescriptor: PropTypes.object,
    title: PropTypes.string,
    onClick: PropTypes.func,
    className: PropTypes.string
  },

  getDefaultProps() {
    return {
      outerRadius: 20,
      innerRadius: 0
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
