import {pie} from 'd3-shape';
import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import PieChartSector from 'PieChartSector';

let PieChart = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    chartData: React.PropTypes.array,
    map: React.PropTypes.object,
    lat: React.PropTypes.number,
    lng: React.PropTypes.number,
    name: React.PropTypes.string,
    originalLat: React.PropTypes.number,
    originalLng: React.PropTypes.number,
    radius: React.PropTypes.number,
    hideValues: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      hideValues: false,
      name: '',
      residualFractionName: 'Other',
      radius: 5,
      faceText: ''
    };
  },

  render() {
    let {chartData, hideValues, name, radius, faceText} = this.props;

    let sectorsData = [];
    let pieData = [];

    for (let i = 0, len = chartData.length; i < len; i++) {

      let title = (name === '' ? '' : name + '\n') + chartData[i].name + ': ' + chartData[i].value;
      if (hideValues) {
        title = (name === '' ? '' : name + '\n') + chartData[i].name;
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
          title={sectorData.title}
          className="panoptes-chart-pie-sector"
        />
    );

    // let location = crs.project({lat, lng});
    //
    // let line = null;
    // if (pieData.length && originalLat && originalLng) {
    //   let originalLocation = crs.project({lat: originalLat, lng: originalLng});
    //   line = (
    //     <line
    //       className="pie-chart-line"
    //       style={{strokeWidth: '2', stroke: 'black', strokeDasharray: '3,3'}}
    //       x1="0" y1="0"
    //       x2={originalLocation.x - location.x} y2={originalLocation.y - location.y}
    //     />
    //   );
    // }

    return (
      <svg style={{overflow: 'visible'}} width={radius} height={radius}>
        <g transform={'rotate(90)'}>
          {sectors}
        </g>
        <text x="0" y="0" textAnchor="middle" alignmentBaseline="middle" fontSize="10">{faceText}</text>
      </svg>
    );

  }

});

export default PieChart;
