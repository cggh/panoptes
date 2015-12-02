const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const d3 = require('d3');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

// Panoptes components
const PieChartSector = require('panoptes/PieChartSector');

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
  
  render()
  {

    let {locationName, locationSize, size, residualFractionName, positionOffsetFraction, chartData, dataType} = this.props;
    
    let sectorsData = [];
    
    let pieData = [];
    
    if (dataType !== 'Fraction')
    {
       console.error("dataType !== 'Fraction'");
       return null;
    }
    
    let residualFraction = 1;
    
    for (let i = 0; i < chartData.length; i++)
    {
      sectorsData.push({value: chartData[i].value, color: chartData[i].color, title: chartData[i].name});
      pieData.push(chartData[i].value);
      residualFraction -= chartData[i].value;
    }
    
    if (residualFraction > 0)
    {
      sectorsData.push({value: residualFraction, color: "rgb(191,191,191)", title: residualFractionName});
      pieData.push(residualFraction);
    }
    
    let pie = d3.layout.pie();
    let arcDescriptors = pie(pieData);
    
    let sectors = sectorsData.map(function(sectorData, i) {
      return (
        <PieChartSector 
          key={i} 
          arcDescriptor={arcDescriptors[i]} 
          outerRadius={locationSize/100} 
          color={sectorData.color}
          name={sectorData.name}
        />
      )
    });
    
    
    let height = 50;
    let width = 50;
    let transformHeight = height / 2;
    let transformWidth = width / 2;
    
    if (positionOffsetFraction)
    {
      transformHeight = transformHeight * positionOffsetFraction;
      transformWidth = transformWidth * positionOffsetFraction;
    }
    
    return (
      <svg width={width} height={height}>
        <g transform="translate(25, 25)">{sectors}</g>
      </svg>
    );
  
  }
  
});

module.exports = PieChart;
