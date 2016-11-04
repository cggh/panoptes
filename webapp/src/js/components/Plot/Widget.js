import React from 'react';
import Plotly from 'react-plotlyjs';

import _reduce from 'lodash/reduce';

import PureRenderMixin from 'mixins/PureRenderMixin';
import DetectResize from 'utils/DetectResize';
import {plotTypes, allDimensions} from 'panoptes/plotTypes';

let Plot = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    plotType: React.PropTypes.string,
    dimensionData: React.PropTypes.shape(_reduce(allDimensions, (props, dim) => { props[dim] = React.PropTypes.array; return props; }, {})),
    dimensionMetadata: React.PropTypes.object
  },

  getInitialState() {
    return {
      width: 0,
      height: 0
    };
  },

  render() {
    let {width, height} = this.state;
    let {plotType, dimensionData, dimensionMetadata} = this.props;


console.log('Plot dimensionData %o', dimensionData);
console.log('Plot dimensionMetadata %o', dimensionMetadata);

    const defaultLayout = {
      barmode: 'overlay',
      autosize: false,
      width: width,
      height: height,
      showlegend: false
    };

    const config = {
      showLink: false,
      displayModeBar: true
    };

    let plotData = plotTypes[plotType].plotlyTraces(dimensionData, dimensionMetadata);

console.log('plotData: %o', plotData);

    return (
      <DetectResize
        onResize={(size) => {
          this.setState(size);
        }}
      >
        <Plotly
          className="plot"
          data={plotData}
          layout={{...defaultLayout, ...plotTypes[plotType].layout}}
          config={config}
        />
      </DetectResize>
    );
  }

});

export default Plot;
