import React from 'react';
import d3 from 'd3';
import _isFinite from 'lodash/isFinite';
import _debounce from 'lodash/debounce';
import _max from 'lodash/max';
import _zip from 'lodash/zip';
import _sum from 'lodash/sum';

import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import SummarisationCache from 'panoptes/SummarisationCache';
import ScaledSVGChannel from 'panoptes/genome/tracks/ScaledSVGChannel';
import ErrorReport from 'panoptes/ErrorReporter';


import Checkbox from 'material-ui/Checkbox';

let CategoricalChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'componentUpdate',
        'onClose'
      ]
    }),
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    sideWidth: React.PropTypes.number.isRequired,
    autoYScale: React.PropTypes.bool,
    fractional: React.PropTypes.bool,
    yMin: React.PropTypes.number,
    yMax: React.PropTypes.number,
    name: React.PropTypes.string,
    onClose: React.PropTypes.func,
    group: React.PropTypes.string.isRequired,
    track: React.PropTypes.string.isRequired
  },

  getInitialState() {
    return {
      dataYMin: 0,
      dataYMax: 1
    };
  },

  getDefaultProps() {
    return {
      autoYScale: true,
      fractional: false
    };
  },

  handleYLimitChange({dataYMin, dataYMax}) {
    this.setState({dataYMin, dataYMax});
  },

  render() {
    let {name} = this.props;
    let {dataYMin, dataYMax} = this.state;
    return (
      <ScaledSVGChannel {...this.props}
        dataYMin={dataYMin}
        dataYMax={dataYMax}
        side={<span>{name}</span>}
        onClose={this.redirectedProps.onClose}
        controls={<CategoricalTrackControls {...this.props} componentUpdate={this.redirectedProps.componentUpdate} />}
      >
        <CategoricalTrack {...this.props} onYLimitChange={this.handleYLimitChange} />
      </ScaledSVGChannel>
    );
  }
});

let CategoricalTrack = React.createClass({
  mixins: [
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('chromosome', 'blockStart', 'blockEnd', 'group', 'track', 'width', 'sideWidth')
  ],

  propTypes: {
    chromosome: React.PropTypes.string.isRequired,
    blockStart: React.PropTypes.number,
    blockEnd: React.PropTypes.number,
    blockPixelWidth: React.PropTypes.number,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    autoYScale: React.PropTypes.bool,
    fractional: React.PropTypes.bool,
    onYLimitChange: React.PropTypes.func,
    group: React.PropTypes.string.isRequired,
    track: React.PropTypes.string.isRequired
  },

  getInitialState() {
    return {};
  },

  componentWillMount() {
    this.debouncedYScale = _debounce(this.calculateYScale, 200);
    this.data = {
      dataStart: 0,
      dataStep: 0,
      primKeys: [],
      columns: {}
    };
  },
  componentWillUnmount() {
    this.props.onYLimitChange({dataYMin: null, dataYMax: null});
  },

  componentWillReceiveProps(nextProps) {
    //We apply data if there is a change in presentation parameters
    if (['fractional'].some((name) => this.props[name] !== nextProps[name])) {
      this.applyData(nextProps);
      this.calculateYScale(nextProps);
    }
    //If there is a change in start or end we need to recalc y limits
    if (['start', 'end'].some((name) => Math.round(this.props[name]) !== Math.round(nextProps[name])))
      this.debouncedYScale(nextProps);
  },

  shouldComponentUpdate(nextProps, nextState) {
    return this.state.areas !== nextState.areas;
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
    if (!this.config.summaryValues[props.group] || !this.config.summaryValues[props.group][props.track]) {
      ErrorReport(this.getFlux(), `${props.group}/${props.track} is not a valid summary track`);
      return;
    }
    this.props.onChangeLoadStatus('LOADING');
    requestContext.request(
      (componentCancellation) =>
        SummarisationCache.fetch({
          columns: {
            categories: {
              folder: `SummaryTracks/${this.config.dataset}/${props.track}`,
              config: 'Summ',
              name: `${props.track}_cats`
            }
          },
          minBlockSize: this.config.summaryValues[props.group][props.track].minblocksize,
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
    let {fractional} = props;
    if (!(this.data && this.data.columns && this.data.columns.categories))
      return;
    let {dataStart, dataStep, columns} = this.data;

    let {summariser, data} = columns.categories;
    let categories = summariser.categories || summariser.Categories;
    let catColours = this.config.summaryValues[props.group][props.track].categoryColors;
    let colours = categories.map((cat) => catColours[cat]);
    let layers = categories.map((category, i) =>
      data.map((point, j) => ({
        x: i,
        y: point[i]
      }))
    );
    let stack = d3.layout.stack().offset(fractional ? 'expand' : 'zero');
    layers = stack(layers);
    let areas = _zip(layers, colours).map(([layer, colour]) => ({
      colour: colour,
      area: d3.svg.area()
        .interpolate('step')
        .defined((d) => _isFinite(d.y))
        .x((d, i) => dataStart + (i * dataStep))
        .y0((d) => d.y0)
        .y1((d) => (d.y0 + d.y))(layer)
    }));
    this.setState({
      areas: areas
    });

  },

  calculateYScale(props) {
    if (this.data && this.data.columns && this.data.columns.categories) {
      let {start, end, fractional} = props;
      let {dataStart, dataStep, columns} = this.data;
      let points = columns.categories.data;

      let startIndex = Math.max(0, Math.floor((start - dataStart) / dataStep));
      let endIndex = Math.min(points.length - 1, Math.ceil((end - dataStart) / dataStep));
      let minVal = 0;
      let maxVal = fractional ? 1 : _max(points.slice(startIndex, endIndex).map(_sum));
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
    let {areas} = this.state;
    if (areas)
      return (
        <g className="categorical-track">
          {areas.map((area, i) =>
            <path className="area" key={i} d={area.area} style={{fill: area.colour}}/>
          )}
        </g>
      );
    else
      return null;
  }
});

let CategoricalTrackControls = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'autoYScale',
        'yMin',
        'yMax'
      ],
      redirect: ['componentUpdate']
    })
  ],

  render() {
    let {fractional, autoYScale, yMin, yMax} = this.props;
    return (
      <div className="channel-controls">
        <div className="control">
          <div className="label">Fractional:</div>
          <Checkbox
            name="fractional"
            defaultChecked={fractional}
            style={{width: 'inherit'}}
            onCheck={(e, checked) => this.redirectedProps.componentUpdate({fractional: checked})}/>
        </div>
        <div className="control">
          <div className="label">Auto Y Scale:</div>
          <Checkbox
            name="autoYScale"
            defaultChecked={autoYScale}
            style={{width: 'inherit'}}
            onCheck={(e, checked) => this.redirectedProps.componentUpdate({autoYScale: checked})}/>
        </div>
        {!autoYScale ? <div className="control">
          <div className="label">Y Min:</div>
          <input className="numeric-input"
                 ref="yMin"
                 type="number"
                 value={yMin}
                 onChange={() => {
                   let value = parseFloat(this.refs.yMin.value);
                   if (_isFinite(value))
                     this.redirectedProps.componentUpdate({yMin: value});
                 }
                                }/>
        </div>
          : null}
        {!autoYScale ? <div className="control">
          <div className="label">Y Max:</div>
          <input className="numeric-input"
                 ref="yMax"
                 type="number"
                 value={yMax}
                 onChange={this.handleRangeChange}
                 onChange={() => {
                   let value = parseFloat(this.refs.yMax.value);
                   if (_isFinite(value))
                     this.redirectedProps.componentUpdate({yMax: value});
                 }
                                }/>
        </div>
          : null}

      </div>
    );
  }

});


module.exports = CategoricalChannel;


