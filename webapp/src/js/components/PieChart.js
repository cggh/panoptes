import {pie} from 'd3-shape';
import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import PieChartSector from 'PieChartSector';

let PieChart = createReactClass({
  displayName: 'PieChart',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    chartData: PropTypes.array,
    name: PropTypes.string,
    radius: PropTypes.number,
    hideValues: PropTypes.bool,
    faceText: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    isHighlighted: PropTypes.bool
  },

  getDefaultProps() {
    return {
      hideValues: false,
      name: '',
      residualFractionName: 'Other',
      radius: 5,
      faceText: '',
      isHighlighted: false
    };
  },

  render() {
    let {chartData, hideValues, name, radius, faceText, isHighlighted} = this.props;

    if (chartData === undefined) {
      return null;
    }

    let sectorsData = [];
    let pieData = [];

    for (let i = 0, len = chartData.length; i < len; i++) {

      let title = `${(name === '' ? '' : `${name}\n`) + chartData[i].name}: ${chartData[i].value}`;
      if (hideValues) {
        title = (name === '' ? '' : `${name}\n`) + chartData[i].name;
      }

      sectorsData.push({color: chartData[i].color, title});
      if (chartData[i].value !== undefined && chartData[i].value !== null && chartData[i].value !== '' && !isNaN(chartData[i].value)) {
        pieData.push(chartData[i].value);
      } else {
        pieData.push(0);
      }
    }

    let pieChart = pie().sort(null);
    let arcDescriptors = pieChart(pieData);
    let sectors = sectorsData.map((sectorData, i) =>
      <PieChartSector
        key={i}
        arcDescriptor={arcDescriptors[i]}
        outerRadius={radius}
        fillColor={sectorData.color}
        title={sectorData.title !== 'undefined' ? sectorData.title : JSON.stringify(sectorData)}
        className={isHighlighted ? 'panoptes-chart-pie-sector-highlighted' : 'panoptes-chart-pie-sector'}
      />
    );

    const faceTextStyle = {
      fontSize: '10px',
      paintOrder: 'stroke',
      stroke: 'white',
      strokeWidth: '2px',
      strokeOpacity: '0.4',
      strokeLinecap: 'butt',
      strokeLinejoin: 'miter',
      fontWeight: 'bold'
    };

    return (
      <svg style={{overflow: 'visible', position: 'absolute'}} width={radius} height={radius}>
        <g>
          {sectors}
        </g>
        {radius > 9 ? <text style={faceTextStyle} x="0" y="0" textAnchor="middle" alignmentBaseline="middle">{faceText}</text> : null}
      </svg>
    );

  },
});

export default PieChart;
