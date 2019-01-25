import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {line} from 'd3-shape';
import _isFinite from 'lodash.isfinite';
import _map from 'lodash.map';
import _debounce from 'lodash.debounce';
import _min from 'lodash.min';
import _max from 'lodash.max';
import _uniq from 'lodash.uniq';

import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import SQL from 'panoptes/SQL';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import SummarisationCache from 'panoptes/SummarisationCache';
import ScaledSVGChannel from 'panoptes/genome/tracks/ScaledSVGChannel';
import ErrorReport from 'panoptes/ErrorReporter';
import PropertyLegend from 'panoptes/PropertyLegend';
import PropertySelector from 'panoptes/PropertySelector';
import {propertyColour, categoryColours} from 'util/Colours';

import Checkbox from '@material-ui/core/Checkbox';
import Select from '@material-ui/core/Select';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import Slider from 'rc-slider';
import FilterButton from 'panoptes/FilterButton';
import _assign from 'lodash.assign';


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

let PerRowScaledSVGChannel = createReactClass({
  displayName: 'PerRowScaledSVGChannel',

  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'setProps',
        'onClose'
      ]
    }),
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: PropTypes.func,
    chromosome: PropTypes.string,
    start: PropTypes.number,
    end: PropTypes.number,
    width: PropTypes.number,
    sideWidth: PropTypes.number,
    interpolation: PropTypes.string,
    autoYScale: PropTypes.bool,
    tension: PropTypes.number,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
    query: PropTypes.string,
    table: PropTypes.string,
    channel: PropTypes.string,
    name: PropTypes.string,
    onClose: PropTypes.func,
    colourProperty: PropTypes.string
  },

  getInitialState() {
    return {
      dataYMin: 0,
      dataYMax: 1
    };
  },

  getDefaultProps() {
    return {
      interpolation: 'step',
      autoYScale: true,
      tension: 0.5,
      query: SQL.nullQuery
    };
  },

  handleYLimitChange({dataYMin, dataYMax}) {
    this.setState({dataYMin, dataYMax});
  },

  handleKnownLegendValuesChange(legendValues) {
    this.setState({legendValues});
  },

  render() {
    let {name, table, colourProperty} = this.props;
    let {dataYMin, dataYMax, legendValues} = this.state;
    return (
      <ScaledSVGChannel {...this.props}
        dataYMin={dataYMin}
        dataYMax={dataYMax}
        side={<span>{name}</span>}
        onClose={this.redirectedProps.onClose}
        controls={<PerRowNumericalTrackControls {...this.props} setProps={this.redirectedProps.setProps} />}
        legend={colourProperty ? <PropertyLegend table={table} property={colourProperty} knownValues={legendValues}/> : null}
      >
        <PerRowNumericalTrack {...this.props} onYLimitChange={this.handleYLimitChange} onKnownLegendValuesChange={this.handleKnownLegendValuesChange}/>

      </ScaledSVGChannel>
    );
  },
});

let PerRowNumericalTrack = createReactClass({
  displayName: 'PerRowNumericalTrack',

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chromosome', 'blockStart', 'blockEnd', 'table',
      'channel', 'query', 'width', 'sideWidth', 'colourProperty')
  ],

  propTypes: {
    chromosome: PropTypes.string,
    blockStart: PropTypes.number,
    blockEnd: PropTypes.number,
    blockPixelWidth: PropTypes.number,
    start: PropTypes.number,
    end: PropTypes.number,
    width: PropTypes.number,
    sideWidth: PropTypes.number,
    interpolation: PropTypes.string,
    autoYScale: PropTypes.bool,
    tension: PropTypes.number,
    onYLimitChange: PropTypes.func,
    onKnownLegendValuesChange: PropTypes.func,
    table: PropTypes.string.isRequired,
    channel: PropTypes.string.isRequired,
    query: PropTypes.string.isRequired,
    colourProperty: PropTypes.string,
    onChangeLoadStatus: PropTypes.func
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
      colourVals: [],
      columns: {}
    };
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
    return this.state.area !== nextState.area || this.state.lines !== nextState.lines;
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, blockStart, blockEnd, blockPixelWidth,
      width, sideWidth, table, channel, query, colourProperty} = props;
    let tableConfig = this.config.tablesById[table];

    if (['chromosome', 'table',
      'channel', 'query'].some((prop) => this.props[prop] !== props[prop])) {
      this.data = {
        dataStart: 0,
        dataStep: 0,
        primKeys: [],
        colourVals: [],
        columns: {}
      };
      this.applyData(props);
    }
    if (width - sideWidth < 1) {
      return;
    }
    if (!this.config.tablesById[table] || !this.config.tablesById[table].tableBasedSummaryValuesById[channel]) {
      ErrorReport(this.getFlux(), `${props.group}/${props.track} is not a valid per row summary track`);
      return;
    }
    if (colourProperty && !this.config.tablesById[table].propertiesById[colourProperty]) {
      ErrorReport(this.getFlux(), `Per ${table} channel: ${colourProperty} is not a valid property of ${table}`);
      return;
    }
    this.props.onChangeLoadStatus('LOADING');
    let columns = [tableConfig.primKey];
    if (colourProperty)
      columns.push(colourProperty);
    let APIargs = {
      database: this.config.dataset,
      table,
      columns,
      query,
      transpose: false
    };
    requestContext.request((componentCancellation) =>
      LRUCache.get(
        `query${JSON.stringify(APIargs)}`,
        (cacheCancellation) =>
          API.query({cancellation: cacheCancellation, ...APIargs}),
        componentCancellation
      ).then((tableData) => {
        let primKeys = tableData[tableConfig.primKey].slice(0, 50);
        this.data.primKeys = primKeys;
        if (colourProperty) {
          this.data.colourVals = tableData[colourProperty].slice(0, 50);
        }
        return Promise.all(primKeys.map((primKey) =>
          SummarisationCache.fetch({
            columns: {
              [primKey]: {
                primKey,
                folder: `SummaryTracks/${this.config.dataset}/TableTracks/${table}/${channel}/${primKey}`,
                config: 'Summ',
                name: `${channel}_${primKey}_avg`
              }
            },
            minBlockSize: this.tableConfig().tableBasedSummaryValuesById[channel].blockSizeMin,
            chromosome,
            start: blockStart,
            end: blockEnd,
            targetPointCount: blockPixelWidth,
            cancellation: componentCancellation
          })
            .then(({columns, dataStart, dataStep}) => {
              this.data.dataStart = dataStart;
              this.data.dataStep = dataStep;
              _assign(this.data.columns, columns);
              this.applyData(props);
              this.calculateYScale(props);
            }), 'colourProperty'
        ));
      }).then((data) => {
        this.props.onChangeLoadStatus('DONE');
        return data;
      })
    )
      .catch((err) => {
        this.props.onChangeLoadStatus('DONE');
        throw err;
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
      });
  },

  applyData(props) {
    let {primKeys, dataStart, dataStep, columns, colourVals} = this.data;
    let {interpolation, tension, table, colourProperty, onKnownLegendValuesChange} = props;
    let colourFunc = categoryColours('__default__');
    if (colourProperty)
      colourFunc = propertyColour(this.config.tablesById[table].propertiesById[colourProperty]);
    let lines = {};
    let colours = {};
    primKeys.forEach((primKey, i) => {
      if (columns[primKey]) {
        lines[primKey] = line()
          .interpolate(interpolation)
          .tension(tension)
          .defined(_isFinite)
          .x((d, i) => dataStart + (i * dataStep))
          .y((d) => d)(columns[primKey].data);
        colours[primKey] = colourVals ? colourFunc(colourVals[i]) : null;
      }
    });
    //Area is turned of for now as this channel often has many tracks on top of each other.
    //let area = area()
    //  .interpolate(interpolation)
    //  .tension(tension)
    //  .defined(_isFinite)
    //  .x((d, i) => dataStart + (i * dataStep))
    //  .y((d) => d)
    //  .y0((d, i) => min[i])(max);
    //
    if (table && colourProperty && onKnownLegendValuesChange && this.config.tablesById[table].propertiesById[colourProperty].isText) {
      onKnownLegendValuesChange(_uniq(colourVals));
    }
    this.setState({
      //area: area,
      lines,
      colours
    });
  },

  calculateYScale(props) {
    let {start, end} = props;
    let {primKeys, dataStart, dataStep, columns} = this.data;
    let min = [];
    let max = [];
    primKeys.forEach((primKey) => {
      if (columns[primKey]) {
        let startIndex = Math.max(0, Math.floor((start - dataStart) / dataStep));
        let endIndex = Math.min(columns[primKey].data.length - 1, Math.ceil((end - dataStart) / dataStep));
        min.push(_min(columns[primKey].data.slice(startIndex, endIndex)));
        max.push(_max(columns[primKey].data.slice(startIndex, endIndex)));
      }
    });
    let minVal = _min(min);
    let maxVal = _max(max);
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
  },

  render() {
    let {area, lines, colours} = this.state;
    return (
      <g className="numerical-track">
        <path className="area" d={area}/>
        {_map(lines, (line, primKey) => <path key={primKey} className="line" style={{stroke: colours[primKey]}} d={line} />)}
      </g>
    );
  },
});

let PerRowNumericalTrackControls = createReactClass({
  displayName: 'PerRowNumericalTrackControls',

  mixins: [
    FluxMixin,
    ConfigMixin,
    PureRenderWithRedirectedProps({
      check: [
        'interpolation',
        'tension',
        'autoYScale',
        'yMin',
        'yMax',
        'table',
        'query',
        'colourProperty'
      ],
      redirect: ['setProps']
    })
  ],

  propTypes: {
    interpolation: PropTypes.string,
    autoYScale: PropTypes.bool,
    tension: PropTypes.number,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
    query: PropTypes.string,
    table: PropTypes.string,
    colourProperty: PropTypes.string
  },

  handleQueryPick(query) {
    this.redirectedProps.setProps({query});
  },

  render() {
    let {interpolation, tension, autoYScale, yMin, yMax, query, table, colourProperty} = this.props;

    return (
      <div className="channel-controls">
        <div className="control">
          <FilterButton table={table} query={query} onPick={this.handleQueryPick}/>
        </div>
        <div className="control">
          <div className="label">Colour By:</div>
          <PropertySelector table={table}
            value={colourProperty}
            onSelect={(colourProperty) => this.redirectedProps.setProps({colourProperty})} />
        </div>
        <div className="control">
          <div className="label">Interpolation:</div>
          <Select className="dropdown"
            value={interpolation}
            onChange={(e, i, v) => this.redirectedProps.setProps({interpolation: v})}
            input={<Input id="interpolation" />}
          >
            {INTERPOLATIONS.map((interpolation) =>
              <MenuItem key={interpolation.payload} value={interpolation.payload}>{interpolation.text}</MenuItem>
            )}
          </Select>
        </div>
        {INTERPOLATION_HAS_TENSION[interpolation] ?
          <div className="control">
            <div className="label">Tension:</div>
            <Slider className="slider"
              style={{marginBottom: '0', marginTop: '0'}}
              name="tension"
              value={tension}
              defaultValue={tension}
              onChange={(e, value) => this.redirectedProps.setProps({tension: value})}/>
          </div>
          : null
        }

        <div className="control">
          <div className="label">Auto Y Scale:</div>
          <Checkbox
            color="primary"
            name="autoYScale"
            checked={autoYScale}
            style={{width: 'inherit'}}
            onChange={(e, checked) => this.redirectedProps.setProps({autoYScale: checked})}/>
        </div>
        {!autoYScale ? <div className="control">
          <div className="label">Y min:</div>
          <input className="numeric-input"
            ref={(ref) => this.yMin = ref}
            type="number"
            value={yMin}
            onChange={() => {
              let value = parseFloat(this.yMin.value);
              if (_isFinite(value))
                this.redirectedProps.setProps({yMin: value});
            }
            }/>
        </div>
          : null}
        {!autoYScale ? <div className="control">
          <div className="label">Y max:</div>
          <input className="numeric-input"
            ref={(ref) => this.yMax = ref}
            type="number"
            value={yMax}
            onChange={() => {
              let value = parseFloat(this.yMax.value);
              if (_isFinite(value))
                this.redirectedProps.setProps({yMax: value});
            }
            }/>
        </div>
          : null}

      </div>
    );
  },
});


export default PerRowScaledSVGChannel;
