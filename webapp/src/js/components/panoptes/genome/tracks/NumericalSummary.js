const React = require('react');

const PureRenderMixin = require('mixins/PureRenderMixin');
const d3 = require('d3');
const Immutable = require('immutable');
const uid = require('uid');
var offset = require("bloody-offset");

const ConfigMixin = require('mixins/ConfigMixin');
const DataFetcherMixin = require('mixins/DataFetcherMixin');
const FluxMixin = require('mixins/FluxMixin');

const SummarisationCache = require('panoptes/SummarisationCache');
const ErrorReport = require('panoptes/ErrorReporter');
const API = require('panoptes/API');
const Icon = require('ui/Icon');


const HEIGHT= 100;
const INTERPOLATIONS = [
  'linear',
  'step',
  'basis',
  'bundle',
  'cardinal',
  'monotone'
];

let NumericalSummary = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'width', 'sideWidth')
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    sideWidth: React.PropTypes.number.isRequired,
    interpolation: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      interpolation: 'step',
    }
  },

  getInitialState() {
    return {
      controlsOpen: false
    };
  },

  componentWillMount() {
    this.id = uid(10);
  },

  componentDidUpdate(prevProps, prevState) {
    if (prevState.controlsOpen !== this.state.controlsOpen)
      this.updateControlsHeight();
  },

  updateControlsHeight() {
    this.refs.controls.style.height = this.state.controlsOpen ?
      _.reduce(this.refs.controls.childNodes,
        (p, c) =>  {
          return p + offset(c).height
        }
        , 0
        ) + 'px' :
      0;
    this.refs.controls.style.width = this.state.controlsOpen ?
    "100%" : this.props.sideWidth+'px';
  },

  applyData(data) {
    this.setState(data)
  },

  //Called by DataFetcherMixin on prop change
  fetchData(props) {
    let {chromosome, start, end, width, sideWidth} = props;
    if (this.state.chromosome && (this.state.chromosome !== chromosome))
      this.setState({columns: null});
    if (width - sideWidth < 1) {
      return;
    }
    let [data, promise] = SummarisationCache.fetch({
      columns: {
        avg: {
          folder: `SummaryTracks/${this.config.dataset}/Uniqueness`,
          config: 'Summ',
          name: 'Uniqueness_avg'
        },
        max: {
          folder: `SummaryTracks/${this.config.dataset}/Uniqueness`,
          config: 'Summ',
          name: 'Uniqueness_max'
        },
        min: {
          folder: `SummaryTracks/${this.config.dataset}/Uniqueness`,
          config: 'Summ',
          name: 'Uniqueness_min'
        }
      },
      minBlockSize: 80,
      chromosome: chromosome,
      start: start,
      end: end,
      targetPointCount: (width - sideWidth) / 2,
      invalidationID: this.id
    });
    if (data)
      this.applyData(data);
    if (promise) {
      this.props.onChangeLoadStatus('LOADING');
      promise
        .then((data) => {
          this.props.onChangeLoadStatus('DONE');
          this.applyData(data);
        })
        .catch((data) => {
          this.props.onChangeLoadStatus('DONE');
          if (data !== 'SUPERSEDED') {
            ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
            this.setState({loadStatus: 'error'});
          }
        });
    }
  },

  handleControlToggle(e) {
    this.setState({controlsOpen: !this.state.controlsOpen});
    e.stopPropagation();
  },

  handleControlsChange() {
    this.props.componentUpdate({
      interpolation: this.refs.interpolation.value
    })
  },

  render() {
    let height = HEIGHT;
    let { start, end, width, sideWidth, interpolation, ...other } = this.props;
    let { dataStart, dataStep, columns, controlsOpen} = this.state;
    let avg = columns ? columns.avg || [] : [];
    let max = columns ? columns.max || [] : [];
    let min = columns ? columns.min || [] : [];
    if (width == 0)
      return null;
    let effWidth = width-sideWidth;
    let scale = d3.scale.linear().domain([start, end]).range([0, effWidth]);
    let stepWidth = scale(dataStep) - scale(0);
    let offset = scale(dataStart) - scale(start - dataStep/2); //Shift by half width to middle of window
    let line = d3.svg.line()
      .interpolate(interpolation)
      .defined(_.isFinite)
      .x((d,i) => i)
      .y((d) => d/210)(avg);
    let area = d3.svg.area()
      .interpolate(interpolation)
      .defined(_.isFinite)
      .x((d,i) => i)
      .y((d) => d/210)
      .y0((d,i) => min[i]/210)(max);
    return (
      <div className="channel-container">
        <div className="channel" style={{height:HEIGHT}}>
          <div className="channel-side" style={{width:`${sideWidth}px`}}>
            <div className="side-controls">
              <Icon className="close" name="times" onClick={this.handleControlToggle}/>
              <Icon className="control-toggle" name="cog" onClick={this.handleControlToggle}/>
            </div>
            <div className="side-name"> Uniqueness </div>
          </div>
          <div className="channel-data" style={{width:`${effWidth}px`}} >
            <svg className="numerical-summary" width={effWidth} height={height}>
              <g style={{transform:`translate(${offset}px, ${height}px) scale(${stepWidth},${-height})`}}>
                <rect className="origin-shifter" x={-effWidth} y={-height} width={2*effWidth} height={2*height}/>
                <path className="area" vector-effect="non-scaling-stroke" d={area}/>
                <path className="line" vector-effect="non-scaling-stroke" d={line}/>
              </g>
            </svg>
          </div>
        </div>
        <div ref="controls" className="channel-controls">
          <div className="control">
            Interpolation mode:
            <select ref="interpolation" value={interpolation} onChange={this.handleControlsChange}>
              {_.map(INTERPOLATIONS, (name) =>
                  <option key={name}
                          value={name}>
                    {name}
                  </option>
              )}
            </select>
          </div>
        </div>
      </div>
    );
  }

});

module.exports = NumericalSummary;


