const React = require('react');

const d3 = require('d3');
const _min = require('lodash/min');
const _max = require('lodash/max');
const _throttle = require('lodash/throttle');
const _isFinite = require('lodash/isFinite');

const uid = require('uid');

const ConfigMixin = require('mixins/ConfigMixin');
const DataFetcherMixin = require('mixins/DataFetcherMixin');
const FluxMixin = require('mixins/FluxMixin');

const SummarisationCache = require('panoptes/SummarisationCache');
const ErrorReport = require('panoptes/ErrorReporter');
const ChannelWithConfigDrawer = require('panoptes/genome/tracks/ChannelWithConfigDrawer');
const LRUCache = require('util/LRUCache');
const API = require('panoptes/API');

const Checkbox = require('material-ui/lib/checkbox');
import DropDownMenu from 'material-ui/lib/DropDownMenu';
import MenuItem from 'material-ui/lib/menus/menu-item';
const Slider = require('material-ui/lib/slider');
const {Motion, spring} = require('react-motion');

const findBlocks = require('panoptes/genome/FindBlocks');

let NumericalTrack = React.createClass({
  mixins: [
    ConfigMixin,
    DataFetcherMixin('chromosome', 'blockStart', 'blockEnd')
  ],

  propTypes: {
    chromosome: React.PropTypes.string.isRequired,
    blockStart: React.PropTypes.number.isRequired,
    blockEnd: React.PropTypes.number.isRequired,
    blockPixelWidth: React.PropTypes.number.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    interpolation: React.PropTypes.string,
    autoYScale: React.PropTypes.bool,
    tension: React.PropTypes.number,
    onYLimitChange: React.PropTypes.func
  },

  getInitialState() {
    return {};
  },

  componentWillMount() {
    this.throttledYScale = _throttle(this.calculateYScale, 500)
  },

  componentWillReceiveProps(nextProps) {
    //We apply data if there is a change in interpolation params to redraw the line
    if (['interpolation', 'tension'].some((name) => this.props[name] !== nextProps[name]))
      this.applyData(nextProps);
    //If there is a change in start or end we need to recalc y limits
    if (['start', 'end'].some((name) => Math.round(this.props[name]) !== Math.round(nextProps[name])))
      this.throttledYScale(nextProps);
  },

  shouldComponentUpdate(nextProps, nextState) {
    return this.state.area !== nextState.area || this.state.line !== nextState.line;
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, blockStart, blockEnd, blockPixelWidth, width, sideWidth} = props;
    if (this.state.chromosome && (this.state.chromosome !== chromosome))
      this.setState({columns: null});
    if (width - sideWidth < 1) {
      return;
    }

    this.props.onChangeLoadStatus('LOADING');
    requestContext.request(
      (componentCancellation) =>
        SummarisationCache.fetch({
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
            targetPointCount: blockPixelWidth,
            cancellation: componentCancellation
          })
          .then((data) => {
            this.props.onChangeLoadStatus('DONE');
            this.data = data;
            this.applyData(props);
            this.calculateYScale(props);
          })
          .catch(API.filterAborted)
          .catch(LRUCache.filterCancelled)
          .catch((error) => {
            this.props.onChangeLoadStatus('DONE');
            ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
            this.setState({loadStatus: 'error'});
          })
    );
  },

  applyData(props) {
    if (this.data) {
      let {dataStart, dataStep, columns} = this.data;
      let {interpolation, tension} = props;

      let avg = columns ? columns.avg || [] : [];
      let max = columns ? columns.max || [] : [];
      let min = columns ? columns.min || [] : [];

      let line = d3.svg.line()
        .interpolate(interpolation)
        .tension(tension)
        .defined(_isFinite)
        .x((d, i) => dataStart + (i * dataStep))
        .y((d) => d)(avg);
      let area = d3.svg.area()
        .interpolate(interpolation)
        .tension(tension)
        .defined(_isFinite)
        .x((d, i) => dataStart + (i * dataStep))
        .y((d) => d)
        .y0((d, i) => min[i])(max);

      this.setState({
        area: area,
        line: line
      });
    }
  },

  calculateYScale(props) {
    if (props.autoYScale && this.data) {
      let {start, end} = props;
      let {dataStart, dataStep, columns} = this.data;

      let max = columns ? columns.max || [] : [];
      let min = columns ? columns.min || [] : [];

      let startIndex = Math.max(0, Math.floor((start - dataStart) / dataStep));
      let endIndex = Math.min(max.length - 1, Math.ceil((end - dataStart) / dataStep));
      let minVal = _min(min.slice(startIndex, endIndex));
      let maxVal = _max(max.slice(startIndex, endIndex));
      if (minVal === maxVal) {
        minVal = minVal - 0.1 * minVal;
        maxVal = maxVal + 0.1 * maxVal;
      } else {
        let margin = 0.1 * (maxVal - minVal);
        minVal = minVal - margin;
        maxVal = maxVal + margin;
      }
      this.props.onYLimitChange({
        dataYMin: minVal,
        dataYMax: maxVal
      });
    }
  },


  render() {
    let {area, line} = this.state;
    return (
      <g>
        <path className="area" d={area}/>
        <path className="line" d={line}/>
      </g>
    );
  }

});

module.exports = NumericalTrack;


