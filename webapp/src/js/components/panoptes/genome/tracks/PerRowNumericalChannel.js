import React from 'react';
import d3 from 'd3';
import _isFinite from 'lodash/isFinite';
import _map from 'lodash/map';
import _debounce from 'lodash/debounce';
import _min from 'lodash/min';
import _max from 'lodash/max';
import _uniq from 'lodash/uniq';

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

import Checkbox from 'material-ui/Checkbox';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import Slider from 'material-ui/Slider';
import FlatButton from 'material-ui/FlatButton';


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

let PerRowScaledSVGChannel = React.createClass({
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
    interpolation: React.PropTypes.string,
    autoYScale: React.PropTypes.bool,
    tension: React.PropTypes.number,
    yMin: React.PropTypes.number,
    yMax: React.PropTypes.number,
    query: React.PropTypes.string,
    table: React.PropTypes.string,
    channel: React.PropTypes.string,
    name: React.PropTypes.string,
    onClose: React.PropTypes.func
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
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial())
    };
  },

  handleYLimitChange({dataYMin, dataYMax}) {
    this.setState({dataYMin, dataYMax});
  },

  handleKnownLegendValuesChange(legendValues) {
    this.setState({legendValues})
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
        controls={<PerRowNumericalTrackControls {...this.props} componentUpdate={this.redirectedProps.componentUpdate} />}
        legend={colourProperty ? <PropertyLegend table={table} property={colourProperty} knownValues={legendValues}/> : null}
      >
        <PerRowNumericalTrack {...this.props} onYLimitChange={this.handleYLimitChange} onKnownLegendValuesChange={this.handleKnownLegendValuesChange}/>

      </ScaledSVGChannel>
    );
  }
});

let PerRowNumericalTrack = React.createClass({
  mixins: [
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('chromosome', 'blockStart', 'blockEnd', 'table',
      'channel', 'query', 'width', 'sideWidth', 'colourProperty')
  ],

  propTypes: {
    chromosome: React.PropTypes.string.isRequired,
    blockStart: React.PropTypes.number,
    blockEnd: React.PropTypes.number,
    blockPixelWidth: React.PropTypes.number,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    interpolation: React.PropTypes.string,
    autoYScale: React.PropTypes.bool,
    tension: React.PropTypes.number,
    onYLimitChange: React.PropTypes.func,
    onKnownLegendValuesChange: React.PropTypes.func,
    table: React.PropTypes.string.isRequired,
    channel: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    colourProperty: React.PropTypes.string
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
    if (!this.config.tablesById[table] || !this.config.tablesById[table].tableBasedSummaryValues[channel]) {
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
    let columnspec = {};
    columns.forEach((column) => columnspec[column] = tableConfig.propertiesById[column].defaultFetchEncoding);
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
                  primKey: primKey,
                  folder: `SummaryTracks/${this.config.dataset}/TableTracks/${table}/${channel}/${primKey}`,
                  config: 'Summ',
                  name: `${channel}_${primKey}_avg`
                }
              },
              minBlockSize: this.config.tablesById[table].tableBasedSummaryValues[channel].minblocksize,
              chromosome: chromosome,
              start: blockStart,
              end: blockEnd,
              targetPointCount: blockPixelWidth,
              cancellation: componentCancellation
            })
              .then(({columns, dataStart, dataStep}) => {
                this.data.dataStart = dataStart;
                this.data.dataStep = dataStep;
                Object.assign(this.data.columns, columns);
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
        lines[primKey] = d3.svg.line()
          .interpolate(interpolation)
          .tension(tension)
          .defined(_isFinite)
          .x((d, i) => dataStart + (i * dataStep))
          .y((d) => d)(columns[primKey].data);
        colours[primKey] = colourVals ? colourFunc(colourVals[i]) : null;
      }
    });
    //Area is turned of for now as this channel often has many tracks on top of each other.
    //let area = d3.svg.area()
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
      lines: lines,
      colours: colours
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
        {_map(lines, (line, primKey) => <path key={primKey} className="line" style={{stroke:colours[primKey]}} d={line} />)}
      </g>
    );
  }
});

let PerRowNumericalTrackControls = React.createClass({
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
      redirect: ['componentUpdate']
    })
  ],

  handleQueryPick(query) {
    this.getFlux().actions.session.modalClose();
    this.redirectedProps.componentUpdate({query});
  },

  render() {
    let {interpolation, tension, autoYScale, yMin, yMax, query, table, colourProperty} = this.props;
    let actions = this.getFlux().actions;

    let filterButtonLabel = 'Change Filter';
    let decodedQuery = SQL.WhereClause.decode(query);
    if (!query || decodedQuery.isTrivial) filterButtonLabel = 'Add Filter';

    return (
      <div className="channel-controls">
        <div className="control">
          <FlatButton label={filterButtonLabel}
                      primary={true}
                      onClick={() => actions.session.modalOpen('containers/QueryPicker',
                        {
                          table: table,
                          initialQuery: query,
                          onPick: this.handleQueryPick
                        })}/>
        </div>
        <div className="control">
          <div className="label">Colour By:</div>
          <PropertySelector table={table}
                            value={colourProperty}
                            onSelect={(colourProperty) => this.redirectedProps.componentUpdate({colourProperty})} />
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


module.exports = PerRowScaledSVGChannel;
