import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import _reduce from 'lodash.reduce';
import Loading from 'ui/Loading';
import PureRenderMixin from 'mixins/PureRenderMixin';
import DetectResize from 'utils/DetectResize';
import {plotTypes, allDimensions} from 'panoptes/plotTypes';

let Plot = createReactClass({
  displayName: 'Plot',

  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    plotType: PropTypes.string,
    dimensionData: PropTypes.shape(_reduce(allDimensions, (props, dim) => { props[dim] = PropTypes.array; return props; }, {})),
    dimensionMetadata: PropTypes.object,
    title: PropTypes.string,
    displayModeBar: PropTypes.bool
  },

  getInitialState() {
    return {
      width: 0,
      height: 0
    };
  },

  componentWillMount() {
    Promise.all([
      import(/*webpackChunkName: 'plotly'*/ 'plotly.js/dist/plotly-cartesian.min.js'),
      import(/*webpackChunkName: 'plotly'*/ 'react-plotlyjs'),
    ]).then(([Plotly, createPlotlyComponent]) => {
      this.setState({
        PlotlyComponent: createPlotlyComponent.default(Plotly),
        hasImported: true,
      });
    }).catch((error) => console.error(error));
  },

  render() {

    let {width, height, hasImported, PlotlyComponent} = this.state;
    let {plotType, dimensionData, dimensionMetadata, title, displayModeBar} = this.props;

    if (!hasImported) {
      return <Loading status="loading"/>;
    }

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
      displayModeBar
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
  },

});

export default Plot;
