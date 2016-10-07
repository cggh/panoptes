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
    ..._reduce(allDimensions, (props, dim) => { props[dim] = React.PropTypes.array; return props; }, {})
  },

  getInitialState() {
    return {
      width: 0,
      height: 0
    };
  },

  componentDidMount() {
  },


  render() {
    let {width, height} = this.state;
    let {plotType} = this.props;

    const layout = {
      barmode: 'overlay',
      autosize: false,
      width: width,
      height: height
    };
    const config = {
      showLink: false,
      displayModeBar: true
    };
    return (
      <DetectResize onResize={(size) => {
        this.setState(size);
      }}>
        <Plotly
          className="plot"
          data={plotTypes[plotType].plotlyTraces(this.props)}
          layout={layout}
          config={config}/>
      </DetectResize>
    );
  }

});

module.exports = Plot;
