import React from 'react';
import {scaleLinear} from 'd3-scale';
import {histogram, extent} from 'd3-array';

import _min from 'lodash/min';
import _max from 'lodash/max';
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
    colourScaleFunction: React.PropTypes.func
  },

  render() {
    let {chartData, width, height, unitNameSingle, unitNamePlural, valueName, colourScaleFunction} = this.props;

    let values = chartData.map((obj) => obj.value);
    let xScaleFunction = scaleLinear().domain(extent(values)).range([0, width]);
    //let histogramData = histogram().bins(xScaleFunction.ticks(20))(itemValues);

    let histogramData = histogram()(values);
    let valueWidth = _min(values) < 0 ? -_min(values) + _max(values) : _min(values) + _max(values);
    let dxScaleFunction = scaleLinear().domain([0, valueWidth]).range([0, width]);

    // NB: This is upside-down, so that highest bins will have the least height deducted.
    let yScaleFunction = scaleLinear().domain([0, _maxBy(histogramData, (d) => d.length).length]).range([height, 0]);

    return (
      <svg style={{background: 'white'}} width={width} height={height}>
        <g>
          {
            histogramData.map(
              (d, i) => {

                // FIXME: chartData is sometimes initially out-of-date,
                // e.g. Marker colour: Category ID, Marker colour: Numerical 1
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
