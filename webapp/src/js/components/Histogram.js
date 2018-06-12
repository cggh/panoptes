import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {scaleLinear} from 'd3-scale';
import {histogram} from 'd3-array';

import _maxBy from 'lodash.maxby';

import PureRenderMixin from 'mixins/PureRenderMixin';
import HistogramBin from 'HistogramBin';

// Credit: https://github.com/english/react-d3-histogram

let Histogram = createReactClass({
  displayName: 'Histogram',

  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    chartData: PropTypes.array.isRequred,
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    unitNameSingle: PropTypes.string.isRequired,
    unitNamePlural: PropTypes.string.isRequired,
    valueName: PropTypes.string.isRequired,
    colourScaleFunction: PropTypes.func,
    minValue: PropTypes.number,
    maxValue: PropTypes.number,
    isHighlighted: PropTypes.bool
  },

  render() {
    let {chartData, width, height, unitNameSingle, unitNamePlural, valueName, colourScaleFunction, minValue, maxValue, isHighlighted} = this.props;

    let histogramData = histogram()
      .value((obj) => obj.value)
      .domain([minValue, maxValue])(chartData);
    //D3 gives non-regular size bins at start and end so fix that here
    if (histogramData.length > 2) {
      let size = histogramData[1].x1 - histogramData[1].x0;
      histogramData[0].x0 = histogramData[0].x1 - size;
      histogramData[histogramData.length - 1].x1 = histogramData[histogramData.length - 1].x0 + size;
    }
    let xScale = scaleLinear().domain([histogramData[0].x0, histogramData[histogramData.length - 1].x1]).range([0, width]);
    let yScale = scaleLinear().domain([0, _maxBy(histogramData, (d) => d.length).length]).range([0, height]);

    return (
      <svg style={{top: `${-height / 2}px`, left: `${-width / 2}px`}}
        className="panoptes-histogram">
        <rect className="panoptes-histogram-bg"
          x={xScale.range()[0] - 1} y={-1} width={1 + xScale.range()[1] - xScale.range()[0]} height={height + 1} />
        {
          histogramData.map(
            (d, i) => {
              let x = d.x0;
              let y = d.length;
              let dx = d.x1 - d.x0;
              if (isNaN(x) || isNaN(dx) || isNaN(y)) {
                return null;
              }
              // Use the colour from the middle of the bin range.
              let fillColour = colourScaleFunction((d.x0 + d.x1) / 2);
              return (
                <HistogramBin x={xScale(x)} y={height - yScale(y)} key={i}
                  width={xScale(dx) - xScale(0)} height={yScale(y)}
                  fill={fillColour}
                  title={`${y} ${y > 1 ? unitNamePlural : unitNameSingle} with ${valueName} between ${x.toFixed(2)} and ${(x + dx).toFixed(2)}`}
                />
              );
            })
        }
        <line className={isHighlighted ? 'panoptes-histogram-axes-highlighted' : 'panoptes-histogram-axes'}
          x1={xScale.range()[0] + 1} x2={xScale.range()[0] + 1}
          y1={height} y2={0} />
        <line className={isHighlighted ? 'panoptes-histogram-axes-highlighted' : 'panoptes-histogram-axes'}
          x1={xScale.range()[0]} x2={xScale.range()[1]}
          y1={height} y2={height} />

      </svg>
    );

  },
});

export default Histogram;
