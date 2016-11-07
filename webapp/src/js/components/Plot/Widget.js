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

    // data and plotType-independent config
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

    let showLegend = false;
    if (
      plotTypes[plotType].dimensions.indexOf('colour') !== -1
      && dimensionData.colour !== undefined
      && dimensionData.colour !== null
      && dimensionMetadata
      && dimensionMetadata.colour
      && dimensionMetadata.colour.isCategorical
      && !dimensionMetadata.colour.isNumerical
    ) {
      showLegend = true;
    }

    let showScale = false;
    // TODO: showScale instead if the colour data is not categorical and is numerical (dimensionMetadata)

    // data-dependent, plotType-independent config
    const dataDependentLayout = {
      showlegend: showLegend,
      showscale: showScale
    };

    let plotData = plotTypes[plotType].plotlyTraces(dimensionData, dimensionMetadata);
    let layout = {...defaultLayout, ...plotTypes[plotType].layout, ...dataDependentLayout};

    return (
      <DetectResize
        onResize={(size) => {
          this.setState(size);
        }}
      >
        <Plotly
          className="plot"
          data={plotData}
          layout={layout}
          config={config}
        />
      </DetectResize>
    );
  }

});

export default Plot;
