const React = require('react');
const Plotly = require('react-plotlyjs');
import _reduce from 'lodash/reduce';

const PureRenderMixin = require('mixins/PureRenderMixin');
const DetectResize = require('utils/DetectResize');

import { plotTypes, allDimensions } from 'panoptes/plotTypes';


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
    let {other, plotType} = this.props;


    var layout = {
      barmode: 'overlay',
      autosize: false,
      width: width,
      height: height
    };
    let config = {
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
