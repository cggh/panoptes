import React from 'react';
import d3 from 'd3';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import PieChartSectorWidget from 'PieChartSector/Widget';

import 'pie-chart.scss';

// constants in this component
// TODO: to go in config?
const DEFAULT_OUTER_RADIUS = 25;

let PieChartWidget = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    name: React.PropTypes.string,
    radius: React.PropTypes.number,
    onClick: React.PropTypes.func,
    lat: React.PropTypes.number,
    lng: React.PropTypes.number,
    originalLat: React.PropTypes.number,
    originalLng: React.PropTypes.number,
    chartData: React.PropTypes.array,
    $geoService: React.PropTypes.object,
  },

  getDefaultProps() {
    return {
      residualFractionName: 'Other'
    };
  },

  render() {
    let {name, radius, chartData, onClick} = this.props;
    let geoService = this.props.$geoService;

    let sectorsData = [];
    let pieData = [];

    for (let i = 0, len = chartData.length; i < len; i++) {
      sectorsData.push({color: chartData[i].color, title: name + '\n' + chartData[i].name + ': ' + chartData[i].value});
      if (chartData[i].value !== undefined && chartData[i].value !== null && chartData[i].value !== '' && !isNaN(chartData[i].value)) {
        pieData.push(chartData[i].value);
      } else {
        pieData.push(0);
      }
    }

    let pie = d3.layout.pie().sort(null);
    let arcDescriptors = pie(pieData);

    let outerRadius = DEFAULT_OUTER_RADIUS;
    if (radius) {
      outerRadius = geoService.project({lat: 0, lng: radius}).x - geoService.project({lat: 0, lng: 0}).x;
    }
    let sectors = sectorsData.map((sectorData, i) =>
        <PieChartSectorWidget
          key={i}
          arcDescriptor={arcDescriptors[i]}
          outerRadius={outerRadius}
          fillColor={sectorData.color}
          title={sectorData.title}
          onClick={onClick}
        />
    );

    let height = 50;
    let width = 50;
    let translateX = 0;
    let translateY = 0;

    let location = geoService.project(this.props);
    let originalLocation = geoService.project({lat: this.props.originalLat, lng: this.props.originalLng});


    return (
      <svg style={{overflow: 'visible'}} width={width} height={height}>
        <g transform={'translate(' + translateX + ', ' + translateY + ')'}>
          {sectors}
        </g>
        <line className="pie-chart-line"
              style={{strokeWidth: '2', stroke: 'black', strokeDasharray: '3,3'}}
              x1="0" y1="0"
              x2={originalLocation.x - location.x} y2={originalLocation.y - location.y}/>
      </svg>
    );

  }

});

module.exports = PieChartWidget;
