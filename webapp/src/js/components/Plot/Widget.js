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
    dimensionMetadata: React.PropTypes.object,
    title: React.PropTypes.string
  },

  getInitialState() {
    return {
      width: 0,
      height: 0
    };
  },

  render() {
    let {width, height} = this.state;
    let {plotType, dimensionData, dimensionMetadata, title} = this.props;

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
