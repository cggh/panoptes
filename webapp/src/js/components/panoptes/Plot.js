const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const DetectResize = require('utils/DetectResize');

const Plotly = require('react-plotlyjs');

let PlotTest = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {},

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
    let {traces, ...other} = this.props;


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
      <DetectResize onResize={(size) => this.setState(size)}>
        <div {...other}>
          <Plotly
            className="plot"
            data={traces}
            layout={layout}
            config={config}/>
        </div>
      </DetectResize>
    );
  }

});

module.exports = PlotTest;
