const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const DetectResize = require('utils/DetectResize')

const Plotly = require('react-plotlyjs');

let PlotTest = React.createClass({
  mixins: [
    PureRenderMixin,
  ],

  propTypes: {},

  getInitialState() {
    return {
      data: [
        {
          type: 'scatter',  // all "scatter" attributes: https://plot.ly/javascript/reference/#scatter
          x: [1, 2, 3],     // more about "x": #scatter-x
          y: [3, 1, 6],     // #scatter-y
          marker: {         // marker is an object, valid marker keys: #scatter-marker
            color: 'rgb(16, 32, 77)' // more about "marker.color": #scatter-marker-color
          }
        },
        {
          type: 'bar',      // all "bar" chart attributes: #bar
          x: [1, 2, 3],     // more about "x": #bar-x
          y: [3, 1, 6],     // #bar-y
          name: 'bar chart example' // #bar-name
        }
      ],
      width: 0,
      height: 0
    }
  },

  componentDidMount() {
  },


  render() {
    let {width, height} = this.state;
    let {WTF, ...other} = this.props;

    var x0 = [];
    var x1 = [];
    for (var i = 0; i < 500; i++) {
      x0[i] = Math.random() * 8;
      x1[i] = (Math.random() * 8) + 1;
    }

    var trace1 = {
      x: x0,
      opacity: 0.75,
      type: 'histogram'
    };
    var trace2 = {
      x: x1,
      opacity: 0.75,
      type: 'histogram'
    };
    var data = [trace1, trace2];
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
            data={data}
            layout={layout}
            config={config}/>
        </div>
      </DetectResize>
    );
  }

});

module.exports = PlotTest;
