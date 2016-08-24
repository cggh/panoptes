import React from 'react';

import d3 from 'd3';
import _min from 'lodash/min';
import _max from 'lodash/max';
import _debounce from 'lodash/debounce';
import _isFinite from 'lodash/isFinite';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import SummarisationCache from 'panoptes/SummarisationCache';
import ErrorReport from 'panoptes/ErrorReporter';
import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';


let NumericalSummaryTrack = React.createClass({
  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chromosome', 'blockStart', 'blockEnd', 'table,', 'track', 'width', 'sideWidth')
  ],

  propTypes: {
    chromosome: React.PropTypes.string.isRequired,
    blockStart: React.PropTypes.number, //Provided by ScaledSVGChannel
    blockEnd: React.PropTypes.number, //Provided by ScaledSVGChannel
    blockPixelWidth: React.PropTypes.number, //Provided by ScaledSVGChannel
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    interpolation: React.PropTypes.string,
    autoYScale: React.PropTypes.bool,
    tension: React.PropTypes.number,
    onYLimitChange: React.PropTypes.func,
    table: React.PropTypes.string.isRequired,
    track: React.PropTypes.string.isRequired,
    onChangeLoadStatus: React.PropTypes.func.isRequired,
  },

  getInitialState() {
    return {};
  },

  componentWillMount() {
    this.debouncedYScale = _debounce(this.calculateYScale, 200);
  },
  componentWillUnmount() {
    this.props.onYLimitChange({dataYMin: null, dataYMax: null});
  },

  componentWillReceiveProps(nextProps) {
    //We apply data if there is a change in interpolation params to redraw the line
    if (['interpolation', 'tension'].some((name) => this.props[name] !== nextProps[name]))
      this.applyData(nextProps);
    //If there is a change in start or end we need to recalc y limits
    if (['start', 'end'].some((name) => Math.round(this.props[name]) !== Math.round(nextProps[name])))
      this.debouncedYScale(nextProps);
  },

  shouldComponentUpdate(nextProps, nextState) {
    return this.state.area !== nextState.area || this.state.line !== nextState.line;
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, blockStart, blockEnd, blockPixelWidth, width, sideWidth} = props;
    if (this.state.chromosome && (this.state.chromosome !== chromosome)) {
      this.data = {
        dataStart: 0,
        dataStep: 0,
        columns: {}
      };
      this.applyData(props);
    }
    if (width - sideWidth < 1) {
      return;
    }
    if (!this.config.tablesById[props.table] ||
      !this.config.tablesById[props.table].propertiesById[props.track] ||
      !this.config.tablesById[props.table].propertiesById[props.track].showInBrowser ||
      !this.config.tablesById[props.table].propertiesById[props.track].isNumerical ||
      !this.config.tablesById[props.table].propertiesById[props.track].summaryValues
    ) {
      ErrorReport(this.getFlux(), `${props.table}/${props.track} is not a valid numerical summary track`);
      return;
    }
    this.props.onChangeLoadStatus('LOADING');
    requestContext.request(
      (componentCancellation) =>
        SummarisationCache.fetch({
          columns: {
            avg: {
              folder: `SummaryTracks/${this.config.dataset}/${props.track}`,
              config: 'Summ',
              name: `${props.track}_avg`
            },
            max: {
              folder: `SummaryTracks/${this.config.dataset}/${props.track}`,
              config: 'Summ',
              name: `${props.track}_max`
            },
            min: {
              folder: `SummaryTracks/${this.config.dataset}/${props.track}`,
              config: 'Summ',
              name: `${props.track}_min`
            }
          },
          minBlockSize: this.tableConfig().propertiesById[props.track].summaryValues.blockSizeMin,
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
          .catch((err) => {
            this.props.onChangeLoadStatus('DONE');
            throw err;
          })
          .catch(API.filterAborted)
          .catch(LRUCache.filterCancelled)
          .catch((error) => {
            ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
          })
    );
  },

  applyData(props) {
    if (this.data) {
      let {dataStart, dataStep, columns} = this.data;
      let {interpolation, tension} = props;

      let avg = columns ? columns.avg.data || [] : [];
      let max = columns ? columns.max.data || [] : [];
      let min = columns ? columns.min.data || [] : [];

      let line = d3.svg.line()
        .interpolate(interpolation)
        .tension(tension)
        .defined(_isFinite)
        .x((d, i) => dataStart + (i * dataStep) )
        .y((d) => d)(avg);
      let area = d3.svg.area()
        .interpolate(interpolation)
        .tension(tension)
        .defined(_isFinite)
        .x((d, i) => dataStart + (i * dataStep))
        .y1((d) => d)
        .y0((d, i) => min[i])(max);

      this.setState({
        area: area,
        line: line
      });
    }
  },

  calculateYScale(props) {
    if (this.data) {
      let {start, end} = props;
      let {dataStart, dataStep, columns} = this.data;

      let max = columns ? columns.max.data || [] : [];
      let min = columns ? columns.min.data || [] : [];

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
      <g className="numerical-track">
        <path className="area" d={area}/>
        <path className="line" d={line}/>
      </g>
    );
  }

});

module.exports = NumericalSummaryTrack;
