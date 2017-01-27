import React from 'react';
import {scaleLinear} from 'd3-scale';
import {histogram} from 'd3-array';

import _maxBy from 'lodash/maxBy';

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
    colourScaleFunction: React.PropTypes.func,
    minValue: React.PropTypes.number,
    maxValue: React.PropTypes.number
  },

  render() {
    let {chartData, width, height, unitNameSingle, unitNamePlural, valueName, colourScaleFunction, minValue, maxValue} = this.props;

    let values = chartData.map((obj) => obj.value);
    let histogramData = histogram().domain([minValue, maxValue]).thresholds(4)(values);

    let valueExpanse = minValue < 0 ? -minValue + maxValue : minValue + maxValue;
    let dxScaleFunction = scaleLinear().domain([0, valueExpanse]).range([0, width]);

    let xScaleFunction = scaleLinear().domain([minValue, maxValue]).range([0, width]);
    // NB: This is upside-down, so that highest bins will have the least height deducted.
    let yScaleFunction = scaleLinear().domain([0, _maxBy(histogramData, (d) => d.length).length]).range([height, 0]);

    const transform = 'translate(-' + (width / 2) + ', -' + (height / 2) + ')';

    return (
      <svg style={{overflow: 'visible'}} width={width} height={height}>
        <g transform={transform}>
          <rect style={{fill: 'white'}} width={width} height={height} />
          {
            histogramData.map(
              (d, i) => {

                if (isNaN(d.x0) || isNaN(d.length) || isNaN(d.x1)) {
                  return null;
                }

                let scaledX = xScaleFunction(d.x0);
                let scaledY = yScaleFunction(d.length);
                let scaledDx = dxScaleFunction(d.x1 - d.x0);

                // Use the colour from the middle of the bin range.
                let fillColour = colourScaleFunction((d.x0 + d.x1) / 2);

                return <HistogramBin
                  x={d.x0}
                  y={d.length}
                  dx={d.x1 - d.x0}
                  scaledX={scaledX}
                  scaledY={scaledY}
                  scaledDx={scaledDx}
                  maxHeight={height}
                  key={i}
                  unitNameSingle={unitNameSingle}
                  unitNamePlural={unitNamePlural}
                  valueName={valueName}
                  fillColour={fillColour}
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
