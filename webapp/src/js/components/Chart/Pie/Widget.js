import React from 'react';
import d3 from 'd3';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import PieChartSectorWidget from 'Chart/Pie/Sector/Widget';

// constants in this component
// TODO: to go in config?
const DEFAULT_OUTER_RADIUS = 5;

let PieChartWidget = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    name: React.PropTypes.string,
    radius: React.PropTypes.number,
    lat: React.PropTypes.number,
    lng: React.PropTypes.number,
    originalLat: React.PropTypes.number,
    originalLng: React.PropTypes.number,
    chartData: React.PropTypes.array,
    crs: React.PropTypes.object
  },

  getDefaultProps() {
    return {
      residualFractionName: 'Other'
    };
  },

  render() {
    let {name, radius, chartData, crs, lat, lng, originalLat, originalLng} = this.props;

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
      outerRadius = crs.project({lat: 0, lng: radius}).x - crs.project({lat: 0, lng: 0}).x;
    }

    let sectors = sectorsData.map((sectorData, i) =>
        <PieChartSectorWidget
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

module.exports = PieChartWidget;
