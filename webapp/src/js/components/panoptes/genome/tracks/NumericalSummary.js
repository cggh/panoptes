const React = require('react');
const ReactDOM = require('react-dom');

const PureRenderMixin = require('mixins/PureRenderMixin');
const d3 = require('d3');
const uid = require('uid');
const offset = require("bloody-offset");

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
const { Motion, spring } = require('react-motion');

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

  componentWillReceiveProps(nextProps) {
    //TODO Could be more selective about this
    if (this.state)
      this.applyData(nextProps);
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

  //Called by DataFetcherMixin on prop change
  fetchData(props) {
    let {chromosome, start, end, width, sideWidth} = props;
    if (this.state.chromosome && (this.state.chromosome !== chromosome))
      this.setState({columns: null});
    if (width - sideWidth < 1) {
      return;
    }

    let effStart = Math.max(start,0);
    //We now work out the boundaries of a larger containing area such that some movement can be made without a refetch.
    //Note that the benfit here comes not from network as there is a caching layer there, but from not having to recaclulate the
    //svg path. If needed we could also consider adding some hysteresis
    //First find a block size - here we use the first power of 2 that is larger than 3x our width.
    let blockSize = Math.max(1, Math.pow(2.0, Math.ceil(Math.log((end-start) * 3) / Math.log(2))));
    //Then find the first multiple below our start
    let blockStart = Math.floor(effStart / blockSize) * blockSize;
    //However we might end outside this block, so add an overlappuing set of blocks shifted by blockSize/2
    let blockEnd = blockStart + blockSize;
    if (blockEnd < end) {
      blockStart += blockSize / 2;
      blockEnd += blockSize / 2;
    }
    //Then we need to determine the resolution required
    let targetPointCount = blockSize * ((width - sideWidth /2)/(end-start));

    //If we already have the data then we haven't moved blocks.
    if (this.blockEnd === blockEnd && this.blockStart === blockStart)
      return;

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
      start: blockStart,
      end: blockEnd,
      targetPointCount: targetPointCount,
      invalidationID: this.id
    });
    if (data) {
      this.data = data;
      this.blockStart = blockStart;
      this.blockEnd = blockEnd;
      this.applyData(props);
    }
    if (promise) {
      this.props.onChangeLoadStatus('LOADING');
      promise
        .then((data) => {
          this.props.onChangeLoadStatus('DONE');
          this.data = data;
          this.blockStart = blockStart;
          this.blockEnd = blockEnd;
          this.applyData(props);
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

  applyData(props) {
    let { dataStart, dataStep, columns } = this.data;
    let { interpolation, tension } = props;

    let avg = columns ? columns.avg || [] : [];
    let max = columns ? columns.max || [] : [];
    let min = columns ? columns.min || [] : [];

    let line = d3.svg.line()
      .interpolate(interpolation)
      .tension(tension)
      .defined(_.isFinite)
      .x((d, i) => i)
      .y((d) => d)(avg);
    let area = d3.svg.area()
      .interpolate(interpolation)
      .tension(tension)
      .defined(_.isFinite)
      .x((d, i) => i)
      .y((d) => d)
      .y0((d, i) => min[i])(max);

    this.setState({
      dataStart: dataStart,
      dataStep: dataStep,
      area: area,
      line: line
    });
    this.calculateYScale(props);
  },

  calculateYScale(props) {
    if (props.autoYScale) {
      let { start, end } = props;
      let { dataStart, dataStep, columns } = this.data;

      let max = columns ? columns.max || [] : [];
      let min = columns ? columns.min || [] : [];

      let startIndex = Math.max(0, Math.floor((start - dataStart) / dataStep));
      let endIndex = Math.min(max.length - 1, Math.ceil((end - dataStart) / dataStep));
      let minVal = _.min(min.slice(startIndex, endIndex));
      let maxVal = _.max(max.slice(startIndex, endIndex));
      if (minVal === maxVal) {
        minVal = minVal - 0.1 * minVal;
        maxVal = maxVal + 0.1 * maxVal;
      }
      else {
        let margin = 0.1 * (maxVal - minVal);
        minVal = minVal - margin;
        maxVal = maxVal + margin;
      }
      this.setState({
        dataYMin: minVal,
        dataYMax: maxVal
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
    let { start, end, width, sideWidth, yMin, yMax, autoYScale } = props;
    let { dataStart, dataStep, area, line, dataYMin, dataYMax } = this.state;
    if (autoYScale && _.isFinite(dataYMin) && _.isFinite(dataYMax) && dataYMin !== 0 && dataYMax !== 0) {
      yMin = dataYMin;
      yMax = dataYMax;
    }

    if (width === 0 || !line)
      return null;

    let effWidth = width - sideWidth;
    let scale = d3.scale.linear().domain([start, end]).range([0, effWidth]);
    let stepWidth = scale(dataStep) - scale(0);
    let offset = scale(dataStart) - scale(start - dataStep / 2); //Shift by half width to middle of window

    let yAxisSpring = {
      yMin: spring(yMin),
      yMax: spring(yMax)
    };
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
              <Motion style={yAxisSpring} defaultStyle={yAxisSpring}>
                {(interpolated) => {
                  let {yMin, yMax} = interpolated;
                  return <g style={{transform:`translate(${offset}px, ${height+(yMin*(height/(yMax-yMin)))}px) scale(${stepWidth},${-(height/(yMax-yMin))})`}}>
                    <rect className="origin-shifter" x={-effWidth} y={-height} width={2*effWidth} height={2*height}/>
                    <Path className="area" d={area}/>
                    <Path className="line" d={line}/>
                  </g>
                }}
              </Motion>
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

//Seperate component for perf
let Path = React.createClass({
  mixins: [PureRenderMixin],

  render() {
    return <path {...this.props} />;
  }
});

let Controls = React.createClass({

  //As component update is an anon func, it looks different on every prop change,
  //so skip it when checking
  shouldComponentUpdate(nextProps) {
    return _(this.props).keys().without('componentUpdate').map((name) => this.props[name] !== nextProps[name]).any();
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


