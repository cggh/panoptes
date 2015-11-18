const React = require('react');
const ReactDOM = require('react-dom');

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
const Checkbox = require('material-ui/lib/checkbox');
const DropDownMenu = require('material-ui/lib/drop-down-menu');
const Slider = require('material-ui/lib/slider');

const HEIGHT = 100;
const INTERPOLATIONS = [
  {payload:'linear', text: 'Linear'},
  {payload:'step', text: 'Step'},
  {payload:'basis', text: 'Basis'},
  {payload:'bundle', text: 'Bundle'},
  {payload:'cardinal', text: 'Cardinal'},
  {payload:'monotone', text: 'Monotone'}
];
const INTERPOLATION_HAS_TENSION = {
  cardinal: true
};

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
    interpolation: React.PropTypes.string,
    autoYScale: React.PropTypes.bool,
    tension: React.PropTypes.number,
    yMin: React.PropTypes.number,
    yMax: React.PropTypes.number
  },

  getDefaultProps() {
    return {
      interpolation: 'step',
      autoYScale: true,
      tension: 0.5
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
    let height = offset(ReactDOM.findDOMNode(this.refs.controls)).height + 'px';
    this.refs.controlsContainer.style.height = this.state.controlsOpen ? height : 0;
    this.refs.controlsContainer.style.width = this.state.controlsOpen ?
      "100%" : this.props.sideWidth + 'px';
    //Ugly hack to ensure that dropdown boxes don't get snipped, I'm so sorry.
    if (!this.state.controlsOpen) {
      this.refs.controlsContainer.style.overflow = 'hidden';
      clearTimeout(this.controlOverFlowTimeout);
    }
    else
      this.controlOverFlowTimeout = setTimeout(() => this.refs.controlsContainer.style.overflow = 'visible', 500)
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

  render() {
    let height = HEIGHT;
    let config = this.config.summaryValues.__reference__.uniqueness;
    let props = Object.assign({
      yMin: config.minval,
      yMax: config.maxval
    }, this.props);
    let { dataStart, dataStep, columns, controlsOpen} = this.state;
    let avg = columns ? columns.avg || [] : [];
    let max = columns ? columns.max || [] : [];
    let min = columns ? columns.min || [] : [];
    if (props.autoYScale) {
      let minVal = _.min(min);
      let maxVal = _.max(max);
      if (minVal === maxVal) {
        minVal = minVal - 0.1*minVal;
        maxVal = maxVal + 0.1*maxVal;
      }
      else {
        let margin = 0.1*(maxVal-minVal);
        minVal = minVal - margin;
        maxVal = maxVal + margin;
      }
      if (minVal && maxVal && maxVal !== 0 && minVal !== 0) {
        props.yMin = minVal;
        props.yMax = maxVal;
      }
    }

    let { start, end, width, sideWidth, interpolation, autoYScale, tension, yMin, yMax,
      componentUpdate, ...other } = props;
    if (width == 0)
      return null;

    let effWidth = width - sideWidth;
    let scale = d3.scale.linear().domain([start, end]).range([0, effWidth]);
    let stepWidth = scale(dataStep) - scale(0);
    let offset = scale(dataStart) - scale(start - dataStep / 2); //Shift by half width to middle of window
    let line = d3.svg.line()
      .interpolate(interpolation)
      .tension(tension)
      .defined(_.isFinite)
      .x((d, i) => i)
      .y((d) => (d-yMin) / (yMax-yMin))(avg);
    let area = d3.svg.area()
      .interpolate(interpolation)
      .tension(tension)
      .defined(_.isFinite)
      .x((d, i) => i)
      .y((d) => (d-yMin) / (yMax-yMin))
      .y0((d, i) => (min[i]-yMin) / (yMax-yMin))(max);
    return (
      <div className="channel-container">
        <div className="channel" style={{height:HEIGHT}}>
          <div className="channel-side" style={{width:`${sideWidth}px`}}>
            <div className="side-controls">
              <Icon className="close" name="times" onClick={this.handleControlToggle}/>
              <Icon className="control-toggle" name="cog" onClick={this.handleControlToggle}/>
            </div>
            <div className="side-name"> Uniqueness</div>
          </div>
          <div className="channel-data" style={{width:`${effWidth}px`}}>
            <svg className="numerical-summary" width={effWidth} height={height}>
              <g style={{transform:`translate(${offset}px, ${height}px) scale(${stepWidth},${-height})`}}>
                <rect className="origin-shifter" x={-effWidth} y={-height} width={2*effWidth} height={2*height}/>
                <path className="area" d={area}/>
                <path className="line" d={line}/>
              </g>
            </svg>
          </div>
        </div>
        <div ref="controlsContainer" className="channel-controls-container">
          <Controls ref="controls" {...props} />
        </div>
      </div>
    );
  }

});

let Controls = React.createClass({

  //As component update is an anon func, it looks different on every prop change,
  // so skip it when checking
  shouldComponentUpdate(nextProps) {
    let { width, interpolation, tension, autoYScale, yMin, yMax} = this.props;
    return width !== nextProps.width ||
      interpolation !== nextProps.interpolation ||
      tension !== nextProps.tension ||
      autoYScale !== nextProps.autoYScale ||
      yMin !== nextProps.yMin ||
      yMax !== nextProps.yMax
      ;
  },

  //Then we need to redirect componentUpdate so we always use the latest as
  //render might not have been called if only componentUpdate changed
  componentUpdate() {
    this.props.componentUpdate.apply(this, arguments);
  },

  render() {
    let { width, interpolation, tension, autoYScale, yMin, yMax } = this.props;
    return (
      <div className="channel-controls" style={{width:width+'px'}}>
        <div className="control">
          <div className="label">Interpolation:</div>
          <DropDownMenu className="dropdown"
                        menuItems={INTERPOLATIONS}
                        value={interpolation}
                        onChange={(e, i) => this.componentUpdate({interpolation: INTERPOLATIONS[i].payload})}/>
        </div>
        {INTERPOLATION_HAS_TENSION[interpolation] ?
          <div className="control" >
            <div className="label">Tension:</div>
            <Slider className="slider"
                    style={{marginBottom:'0', marginTop:'0'}}
                    name="tension"
                    value={tension}
                    defaultValue={tension}
                    onChange={(e, value) => this.componentUpdate({tension: value})}/>
          </div>
          : null
        }

        <div className="control">
          <div className="label">Auto Y Scale:</div>
          <Checkbox
            name="autoYScale"
            value="toggleValue1"
            defaultChecked={autoYScale}
            style={{width:'inherit'}}
            onCheck={(e, checked) => this.componentUpdate({autoYScale:checked})}/>
        </div>
        {!autoYScale ? <div className="control">
                         <div className="label">Y Min:</div>
                         <input className="numeric-input"
                                ref="yMin"
                                type="number"
                                value={yMin}
                                onChange={() => {
                                  let value = parseFloat(this.refs.yMin.value);
                                  if (_.isFinite(value))
                                    this.componentUpdate({yMin: value});
                                  }
                                }/>
                       </div>
          :null}
        {!autoYScale ? <div className="control">
                         <div className="label">Y Max:</div>
                         <input className="numeric-input"
                                ref="yMax"
                                type="number"
                                value={yMax}
                                onChange={this.handleRangeChange}
                                onChange={() => {
                                  let value = parseFloat(this.refs.yMax.value);
                                  if (_.isFinite(value))
                                    this.componentUpdate({yMax: value});
                                  }
                                }/>
                       </div>
          : null}

      </div>
    );
  }

});





module.exports = NumericalSummary;


