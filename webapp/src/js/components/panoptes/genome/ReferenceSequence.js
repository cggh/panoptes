const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const {Paper} = require('material-ui');
const d3 = require('d3');
const Immutable = require('immutable');
const shallowEquals = require('shallow-equals');
const uid = require('uid');

const ConfigMixin = require('mixins/ConfigMixin');
const DataFetcherMixin = require('mixins/DataFetcherMixin');
const FluxMixin = require('mixins/FluxMixin');

const SummarisationCache = require('panoptes/SummarisationCache');
const ErrorReport = require('panoptes/ErrorReporter');
const API = require('panoptes/API');


const HEIGHT = 40;

let ReferenceSequence = React.createClass({
    mixins: [
      PureRenderMixin,
      ConfigMixin,
      FluxMixin,
      DataFetcherMixin('start', 'end', 'width', 'sideWidth')
    ],

    propTypes: {
      chromosome: React.PropTypes.string,
      start: React.PropTypes.number,
      end: React.PropTypes.number,
      width: React.PropTypes.number,
      sideWidth: React.PropTypes.number
    },

    getInitialState() {
      return {sequence: null};
    },

    componentWillMount() {
      this.id = uid(10);
    },

    applyData(data) {
      //console.log("applied:",data.start, data.step, data.columns.sequence.length);
      this.setState({
          dataStart: data.start,
          dataStep: data.step,
          sequence: data.columns.sequence})
    },

    //Called by DataFetcherMixin
    fetchData(props) {
      let {chromosome, start, end, width, sideWidth} = props;
      if (width - sideWidth < 1) {
        return;
      }
      let [data, promise] = SummarisationCache.fetch({
          sequence: {
            folder: `SummaryTracks/${this.config.dataset}/Sequence`,
            config: 'Summ',
            name: 'Base_avg'
          }
        },
        1,
        chromosome,
        start,
        end,
        (width - sideWidth)/2,
        this.id);
      if (data)
        this.applyData(data);
      if (promise)
        promise.then((data) => this.applyData(data))
          .catch((data) => {
            if (data !== 'SUPERSEDED') {
              ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
              this.setState({loadStatus: 'error'});
            }
          });
    },

    render() {
      let { start, end, width, sideWidth, ...other } = this.props;
      let { dataStart, dataStep, sequence } = this.state;
      sequence = sequence || [];
      if (width == 0)
        return null;
      return (
        <div className="horizontal stack" style={{height:HEIGHT}}>
          <Paper className="channel-side" style={{width:`${sideWidth}px`}} zDepth={1}> Ref. Seq. </Paper>
          <div style={{width:`${width-sideWidth}px`}} className="channel-canvas">
            <SequenceSquares
              width={width-sideWidth}
              height={HEIGHT}
              start={start}
              end={end}
              dataStart={dataStart}
              dataStep={dataStep}
              sequence={sequence}/>
          </div>
        </div>
      );
    }

  });

let SequenceSquares = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  componentDidMount() {
    var canvas = this.getDOMNode();
    this.paint(canvas);
  },

  componentDidUpdate() {
    var canvas = this.getDOMNode();
    this.paint(canvas);
  },

  paint(canvas) {
    let {width, height, start, end, dataStart, dataStep, sequence} = this.props;
    canvas.width = sequence.length;
    canvas.height = 1;
    if (canvas.width !== sequence.length)
      console.log("Unequal lengths");
    if (sequence.length < 1)
      return;
    let ctx = canvas.getContext('2d');
    let imageData = ctx.getImageData(0,0,canvas.width, canvas.height);
    let data = imageData.data;
    _.each(sequence, (base,i) => {
      base = base.toLowerCase();
      data[i*4+3] = 255;
      if (base==='a'){
        data[i*4] = 255;
        data[i*4+1] = 50;
        data[i*4+2] = 50;
      } else if (base==='t'){
        data[i*4] = 255;
        data[i*4+1] = 170;
        data[i*4+2] = 0;
      } else if (base==='c'){
        data[i*4] = 0;
        data[i*4+1] = 128;
        data[i*4+2] = 192;
      } else if (base==='g'){
        data[i*4] = 0;
        data[i*4+1] = 192;
        data[i*4+2] = 120;
      } else {
        data[i*4+3] = 0;
      }
    });
    ctx.putImageData(imageData, 0, 0);

  },


  render() {
    let {width, height, start, end, dataStart, dataStep, sequence} = this.props;
    let scale = d3.scale.linear().domain([start, end]).range([0, width]);
    let stepWidth = scale(dataStep)-scale(0);
    let offset = scale(dataStart)-scale(start);
    return <canvas style={{transform:`translateX(${offset}px) scale(${stepWidth},${height})`}} width={sequence.length} height={1} />;
  }

});









module.exports = ReferenceSequence;


