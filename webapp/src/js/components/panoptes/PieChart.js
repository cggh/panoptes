const React = require('react');
const d3 = require('d3');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

// Panoptes components
const PieChartSector = require('panoptes/PieChartSector');

// constants in this component
// TODO: to go in config?
const RESIDUAL_SECTOR_COLOR = 'rgb(191,191,191)';
const DEFAULT_OUTER_RADIUS = 25;
const LOCATION_SIZE_TO_OUTER_RADIUS_DIVISOR = 30;

let PieChart = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    locationName: React.PropTypes.string,
    locationSize: React.PropTypes.number,
    onClick: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      residualFractionName: 'Other'
    };
  },

  render() {

    let {locationName, locationSize, residualFractionName, chartData, dataType, onClick} = this.props;

    let sectorsData = [];

    let pieData = [];

    if (dataType !== 'Fraction') {
      console.error('dataType !== \'Fraction\'');
      return null;
    }

    let residualFraction = 1;

    for (let i = 0; i < chartData.length; i++) {
      sectorsData.push({value: chartData[i].value, color: chartData[i].color, title: locationName + '\n' + chartData[i].name + ': ' + chartData[i].value});
      pieData.push(chartData[i].value);
      residualFraction -= chartData[i].value;
    }

    if (residualFraction > 0) {
      sectorsData.push({value: residualFraction, color: RESIDUAL_SECTOR_COLOR, title: locationName + '\n' + residualFractionName + ': ' + residualFraction.toFixed(3)});
      pieData.push(residualFraction);
    }

    let pie = d3.layout.pie().sort(null);
    let arcDescriptors = pie(pieData);

    let sectors = sectorsData.map(function(sectorData, i) {

      let outerRadius = DEFAULT_OUTER_RADIUS;
      if (locationSize) {
        outerRadius = locationSize / LOCATION_SIZE_TO_OUTER_RADIUS_DIVISOR;
      }

      return (
        <PieChartSector
          key={i}
          arcDescriptor={arcDescriptors[i]}
          outerRadius={outerRadius}
          fillColor={sectorData.color}
          title={sectorData.title}
          onClick={onClick}
        />
      );
    });

    let height = 50;
    let width = 50;
    let translateX = 0;
    let translateY = 0;

    return (
      <svg style={{overflow: 'visible'}} width={width} height={height}>
        <g transform={'translate(' + translateX + ', ' + translateY + ')'}>
          {sectors}
        </g>
      </svg>
    );

  }

});

module.exports = PieChart;
