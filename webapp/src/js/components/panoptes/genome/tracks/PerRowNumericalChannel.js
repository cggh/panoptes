import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import d3 from 'd3';
import _isFinite from 'lodash/isFinite';
import _map from 'lodash/map';
import _transform from 'lodash/transform';
import _forEach from 'lodash/forEach';
import _throttle from 'lodash/throttle';


import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';


import SQL from 'panoptes/SQL';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import YScale from 'panoptes/genome/tracks/YScale';


import Checkbox from 'material-ui/lib/checkbox';
import DropDownMenu from 'material-ui/lib/DropDownMenu';
import MenuItem from 'material-ui/lib/menus/menu-item';
import Slider from 'material-ui/lib/slider';
import FlatButton from 'material-ui/lib/flat-button';
import {Motion, spring} from 'react-motion';

import findBlocks from 'panoptes/genome/FindBlocks';

const HEIGHT = 100;
const INTERPOLATIONS = [
  {payload: 'linear', text: 'Linear'},
  {payload: 'step', text: 'Step'},
  {payload: 'basis', text: 'Basis'},
  {payload: 'bundle', text: 'Bundle'},
  {payload: 'cardinal', text: 'Cardinal'},
  {payload: 'monotone', text: 'Monotone'}
];
const INTERPOLATION_HAS_TENSION = {
  cardinal: true
};

let NumericalChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({redirect: [
      'componentUpdate',
      'onClose'
    ]}),
    ConfigMixin
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
    yMax: React.PropTypes.number,
    query: React.PropTypes.string,
    table: React.PropTypes.string,
    channel: React.PropTypes.string,
    onClose: React.PropTypes.func
  },

  getInitialState() {
    return {};
  },

  getDefaultProps() {
    return {
      interpolation: 'step',
      autoYScale: true,
      tension: 0.5,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial())
    };
  },

  handleYLimitChange({dataYMin, dataYMax}) {
    this.setState({dataYMin, dataYMax});
  },

  handleClose() {
    if (this.redirectedProps.onClose)
      this.redirectedProps.onClose();
  },

  render() {
    let height = HEIGHT;
    let {start, end, width, sideWidth, yMin, yMax, autoYScale, table, channel} = this.props;
    let {dataYMin, dataYMax} = this.state;

    if (autoYScale) {
      if (_isFinite(dataYMin) && _isFinite(dataYMax)) {
        yMin = dataYMin;
        yMax = dataYMax;
      }
    }

    //If we go to a region with no data then don't move the y axis
    if (!_isFinite(yMin) && this.lastYMin)
      yMin = this.lastYMin;
    if (!_isFinite(yMax) && this.lastYMax)
      yMax = this.lastYMax;
    [this.lastYMin, this.lastYMax] = [yMin, yMax];

    if (width === 0)
      return null;

    let effWidth = width - sideWidth;
    let scale = d3.scale.linear().domain([start, end]).range([0, effWidth]);
    let stepWidth = scale(1) - scale(0);
    let offset = scale(0) - scale(start - 1 / 2);

    let initYAxisSpring = {
      yMin: _isFinite(yMin) ? yMin : null,
      yMax: _isFinite(yMax) ? yMax : null
    };
    let yAxisSpring = {
      yMin: spring(initYAxisSpring.yMin),
      yMax: spring(initYAxisSpring.yMax)
    };

    let [[block1Start, block1End], [block2Start, block2End]] = findBlocks(start, end);
    //If we already are at an acceptable block then don't change it!
    if (!((this.blockEnd === block1End && this.blockStart === block1Start) ||
      (this.blockEnd === block2End && this.blockStart === block2Start))) {
      //Current block was acceptable so choose best one
      this.blockStart = block1Start;
      this.blockEnd = block1End;
    }

    let blockPixelWidth = (((width - sideWidth) / 2) / (end - start)) * (this.blockEnd - this.blockStart);
    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={HEIGHT}
        sideComponent={
          <div className="side-name">
            {this.config.tables[table].tableBasedSummaryValues[channel].trackname}
          </div>
        }
        //Override component update to get latest in case of skipped render
        configComponent={<Controls {...this.props}
                                   componentUpdate={this.redirectedProps.componentUpdate}/>}
        onClose={this.handleClose}

      >
        <svg className="numerical-channel" width={effWidth} height={height}>
          <Motion style={yAxisSpring} defaultStyle={initYAxisSpring}>
            {(interpolated) => {
              let {yMin, yMax} = interpolated;
              return <g>
                <YScale min={yMin} max={yMax} width={effWidth} height={height}/>
                <g
                  transform={_isFinite(yMin) && _isFinite(yMax) ? `translate(${offset}, ${height + (yMin * (height / (yMax - yMin)))}) scale(${stepWidth},${-(height / (yMax - yMin))})` : ''}>
                  <rect className="origin-shifter" x={-effWidth} y={-height} width={2 * effWidth}
                        height={2 * height}/>
                  <PerRowNumericalTrack
                    {...this.props}
                    blockStart={this.blockStart}
                    blockEnd={this.blockEnd}
                    blockPixelWidth={blockPixelWidth}
                    onYLimitChange={this.handleYLimitChange}
                  />
                </g>
              </g>;
            }}
          </Motion>
        </svg>
      </ChannelWithConfigDrawer>);
  }
});

let PerRowNumericalTrack = React.createClass({
  mixins: [
    ConfigMixin,
    DataFetcherMixin('chromosome', 'blockStart', 'blockEnd', 'table,', 'channel', 'query')
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
    onYLimitChange: React.PropTypes.func,
    table: React.PropTypes.string.isRequired,
    channel: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired
  },

  getInitialState() {
    return {};
  },

  componentWillMount() {
    this.throttledYScale = _throttle(this.calculateYScale, 500);
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
      this.throttledYScale(nextProps);
  },

  shouldComponentUpdate(nextProps, nextState) {
    return this.state.area !== nextState.area || this.state.lines !== nextState.lines;
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, blockStart, blockEnd, blockPixelWidth, width, sideWidth, table, channel, query} = props;
    let tableConfig = this.config.tables[table];

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
    if (!this.config.tables[table] || !this.config.tables[table].tableBasedSummaryValues[channel]) {
      ErrorReport(this.getFlux(), `${props.group}/${props.track} is not a valid per row summary track`);
      return;
    }
    this.props.onChangeLoadStatus('LOADING');

    if (this.currentQuery !== props.query) {
      this.currentQuery = props.query;
      this.data = {
        dataStart: 0,
        dataStep: 0,
        columns: {}
      };
      this.applyData(props);
      let columns = [tableConfig.primkey];
      let columnspec = {};
      columns.forEach((column) => columnspec[column] = tableConfig.propertiesMap[column].defaultFetchEncoding);
      let APIargs = {
        database: this.config.dataset,
        table: table,
        columns: columnspec,
        query: query,
        transpose: false
      };
      requestContext.request((componentCancellation) =>
        LRUCache.get(
          'pageQuery' + JSON.stringify(APIargs),
          (cacheCancellation) =>
            API.pageQuery({cancellation: cacheCancellation, ...APIargs}),
          componentCancellation
        )
      ).then((tableData) => {
        let toFetch = tableData[tableConfig.primkey].map((primkey) => ({
          primkey: primkey,
          folder: `SummaryTracks/${this.config.dataset}/TableTracks/${table}/${channel}/${primkey}`,
          config: 'Summ',
          name: `${channel}_${primkey}_avg`
        }));
        console.log(toFetch);
        this.props.onChangeLoadStatus('DONE');
      })
      .catch((err) => {
        console.log(err);
        this.props.onChangeLoadStatus('DONE');
        throw err;
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)

      //.catch((error) => {
      //  ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
      //  this.setState({loadStatus: 'error'});
      //})
      ;
    }
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
      <g className="numerical-track">
        <path className="area" d={area}/>
        <path className="line" d={line}/>
      </g>
    );
  }

});



let Controls = React.createClass({
  mixins: [
    FluxMixin,
    PureRenderWithRedirectedProps({
      check: [
        'interpolation',
        'tension',
        'autoYScale',
        'yMin',
        'yMax',
        'table',
        'query'
      ],
      redirect: ['componentUpdate']
    })
  ],

  handleQueryPick(query) {
    this.getFlux().actions.session.modalClose();
    this.redirectedProps.componentUpdate({query});
  },

  render() {
    let {interpolation, tension, autoYScale, yMin, yMax, query, table} = this.props;
    let actions = this.getFlux().actions;
    return (
      <div className="channel-controls">
        <div className="control">
          <FlatButton label="Change Filter"
                      primary={true}
                      onClick={() => actions.session.modalOpen('containers/QueryPicker',
                      {
                        table: table,
                        initialQuery: query,
                        onPick: this.handleQueryPick
                      })}/>
        </div>
        <div className="control">
          <div className="label">Interpolation:</div>
          <DropDownMenu className="dropdown"
                        value={interpolation}
                        onChange={(e, i, v) => this.redirectedProps.componentUpdate({interpolation: v})}>
            {INTERPOLATIONS.map((interpolation) =>
              <MenuItem key={interpolation.payload} value={interpolation.payload} primaryText={interpolation.text}/>)}
          </DropDownMenu>
        </div>
        {INTERPOLATION_HAS_TENSION[interpolation] ?
          <div className="control">
            <div className="label">Tension:</div>
            <Slider className="slider"
                    style={{marginBottom: '0', marginTop: '0'}}
                    name="tension"
                    value={tension}
                    defaultValue={tension}
                    onChange={(e, value) => this.redirectedProps.componentUpdate({tension: value})}/>
          </div>
          : null
        }

        <div className="control">
          <div className="label">Auto Y Scale:</div>
          <Checkbox
            name="autoYScale"
            value="toggleValue1"
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


module.exports = NumericalChannel;


