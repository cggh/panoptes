import React from 'react';
import d3 from 'd3';

import PureRenderMixin from 'mixins/PureRenderMixin';
import HistogramBin from 'HistogramBin';

// Credit: https://github.com/english/react-d3-histogram

let Histogram = React.createClass({

  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    chartData: React.PropTypes.array,
    top: React.PropTypes.number,
    right: React.PropTypes.number,
    bottom: React.PropTypes.number,
    left: React.PropTypes.number,
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    unitNameSingle: React.PropTypes.string.isRequired,
    unitNamePlural: React.PropTypes.string.isRequired,
    valueName: React.PropTypes.string.isRequired,
    colourScaleFunction: React.PropTypes.func
  },

  render() {
    let {chartData, width, height, unitNameSingle, unitNamePlural, valueName, colourScaleFunction} = this.props;

    let values = chartData.map((obj) => obj.value);
    let xScaleFunction = d3.scale.linear().domain(d3.extent(values)).range([0, width]);
    //let histogramData = d3.layout.histogram().bins(xScaleFunction.ticks(20))(itemValues);
    let histogramData = d3.layout.histogram()(values);
    let valueWidth = d3.min(values) < 0 ? -d3.min(values) + d3.max(values) : d3.min(values) + d3.max(values);
    let dxScaleFunction = d3.scale.linear().domain([0, valueWidth]).range([0, width]);

    // NB: This is upside-down, so that highest bins will have the least height deducted.
    let yScaleFunction = d3.scale.linear().domain([0, d3.max(histogramData, (d) => d.y)]).range([height, 0]);

    return (
      <svg style={{background: 'white'}} width={width} height={height}>
        <g>
          {
            histogramData.map(
              (d, i) => {

                let scaledX = xScaleFunction(d.x);
                let scaledY = yScaleFunction(d.y);
                let scaledDx = dxScaleFunction(d.dx);

                // Use the colour from the middle of the bin range.
                let fillColour = colourScaleFunction((d.x + (d.x + d.dx)) / 2);

                return <HistogramBin
                  x={d.x}
                  y={d.y}
                  dx={d.dx}
                  scaledX={scaledX}
                  scaledY={scaledY}
                  scaledDx={scaledDx}
                  maxHeight={height}
                  key={i}
                  unitNameSingle={unitNameSingle}
                  unitNamePlural={unitNamePlural}
                  valueName={valueName}
                  fillColour={fillColour}
                  values={d}
                />;
              }
            )
          }
        </g>
      </svg>
    );

  }

});

export default Histogram;
