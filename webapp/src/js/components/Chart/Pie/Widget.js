import d3 from 'd3';
import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import PieChartSector from 'Chart/Pie/Sector/Widget';

let PieChart = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    chartData: React.PropTypes.array,
    crs: React.PropTypes.object,
    lat: React.PropTypes.number,
    lng: React.PropTypes.number,
    name: React.PropTypes.string,
    originalLat: React.PropTypes.number,
    originalLng: React.PropTypes.number,
    radius: React.PropTypes.number
  },

  getDefaultProps() {
    return {
      name: '',
      residualFractionName: 'Other',
      radius: 5
    };
  },

  render() {
    let {chartData, crs, lat, lng, name, originalLat, originalLng, radius} = this.props;

    let sectorsData = [];
    let pieData = [];

    for (let i = 0, len = chartData.length; i < len; i++) {
      sectorsData.push({color: chartData[i].color, title: (name === '' ? '' : name + '\n') + chartData[i].name + ': ' + chartData[i].value});
      if (chartData[i].value !== undefined && chartData[i].value !== null && chartData[i].value !== '' && !isNaN(chartData[i].value)) {
        pieData.push(chartData[i].value);
      } else {
        pieData.push(0);
      }
    }

    let pie = d3.layout.pie().sort(null);
    let arcDescriptors = pie(pieData);
    let outerRadius = crs.project({lat: 0, lng: radius}).x - crs.project({lat: 0, lng: 0}).x;

    let sectors = sectorsData.map((sectorData, i) =>
        <PieChartSector
          key={i}
          arcDescriptor={arcDescriptors[i]}
          outerRadius={outerRadius}
          fillColor={sectorData.color}
          title={sectorData.title}
          className="panoptes-chart-pie-sector"
        />
    );

    let location = crs.project({lat, lng});

    let line = null;
    if (originalLat && originalLng) {
      let originalLocation = crs.project({lat: originalLat, lng: originalLng});
      line = (
        <line
          className="pie-chart-line"
          style={{strokeWidth: '2', stroke: 'black', strokeDasharray: '3,3'}}
          x1="0" y1="0"
          x2={originalLocation.x - location.x} y2={originalLocation.y - location.y}
        />
      );
    }

    return (
      <svg style={{overflow: 'visible'}} width="50" height="50">
        <g transform={'translate(0, 0)'}>
          {sectors}
        </g>
        {line}
      </svg>
    );

  }

});

module.exports = PieChart;
