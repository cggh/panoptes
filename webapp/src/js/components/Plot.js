import React from 'react';
import createPlotlyComponent from 'react-plotlyjs';
import Plotly from 'plotly.js/dist/plotly-cartesian';
const PlotlyComponent = createPlotlyComponent(Plotly);
import _reduce from 'lodash.reduce';

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
    dimensionMetadata: React.PropTypes.object,
    title: React.PropTypes.string,
    displayModeBar: React.PropTypes.bool
  },

  getInitialState() {
    return {
      width: 0,
      height: 0
    };
  },

  render() {
    let {width, height} = this.state;
    let {plotType, dimensionData, dimensionMetadata, title, displayModeBar} = this.props;

    // data and plotType-independent config
    const defaultLayout = {
      barmode: 'overlay',
      autosize: false,
      width,
      height,
      showlegend: false,
      title,
      xaxis: {title: dimensionMetadata.horizontal !== undefined ? dimensionMetadata.horizontal.name : ''},
      yaxis: {title: dimensionMetadata.vertical !== undefined ? dimensionMetadata.vertical.name : ''},
      zaxis: {title: dimensionMetadata.colour !== undefined ? dimensionMetadata.colour.name : ''}
    };
    const config = {
      showLink: false,
      displayModeBar: displayModeBar
    };

    let showLegend = false;
    if (
      plotTypes[plotType].dimensions.indexOf('colour') !== -1
      && dimensionData.colour !== undefined
      && dimensionData.colour !== null
      && dimensionMetadata
      && dimensionMetadata.colour
      && dimensionMetadata.colour.isCategorical
    ) {
      showLegend = true;
    }

    // data-dependent, plotType-independent config
    const dataDependentLayout = {
      showlegend: showLegend
    };

    let plotData = plotTypes[plotType].plotlyTraces(dimensionData, dimensionMetadata);
    let layout = {...defaultLayout, ...plotTypes[plotType].layout, ...dataDependentLayout};

    return (
      <DetectResize
        onResize={(size) => {
          this.setState(size);
        }}
      >
        <PlotlyComponent
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
