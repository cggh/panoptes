import React from 'react';
import d3 from 'd3';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import PieChartSectorWidget from 'Chart/Pie/Sector/Widget';

import 'pie-chart.scss';

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
    chartData: React.PropTypes.object,
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

    // FIXME: ???
    let chartDataArray = chartData.toArray();

    for (let i = 0, len = chartDataArray.length; i < len; i++) {
      sectorsData.push({color: chartDataArray[i].get('color'), title: name + '\n' + chartDataArray[i].get('name') + ': ' + chartDataArray[i].get('value')});
      if (chartDataArray[i].get('value') !== undefined && chartDataArray[i].get('value') !== null && chartDataArray[i].get('value') !== '' && !isNaN(chartDataArray[i].get('value'))) {
        pieData.push(chartDataArray[i].get('value'));
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
console.log('outerRadius: ' + outerRadius);

    let sectors = sectorsData.map((sectorData, i) =>
        <PieChartSectorWidget
          key={i}
          arcDescriptor={arcDescriptors[i]}
          outerRadius={outerRadius}
          fillColor={sectorData.color}
          title={sectorData.title}
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
