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
import SQL from 'panoptes/SQL';
import LRUCache from 'util/LRUCache';
import SummarisationCache from 'panoptes/SummarisationCache';
import NumericalChannel from 'panoptes/genome/tracks/NumericalChannel';
import ErrorReport from 'panoptes/ErrorReporter';


import Checkbox from 'material-ui/lib/checkbox';

let PerRowIndicatorChannel = React.createClass({
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
    name: React.PropTypes.string,
    onClose: React.PropTypes.func,
    table: React.PropTypes.string.isRequired
  },

  render() {
    let {name, table} = this.props;
    return (
      <NumericalChannel {...this.props}
        yMin={0}
        yMax={100}
        height={50}
        side={<span>{name || this.config.tables[table].tableCapNamePlural}</span>}
        onClose={this.redirectedProps.onClose}
        controls={<PerRowIndicatorControls {...this.props} componentUpdate={this.redirectedProps.componentUpdate} />}
      >
        <PerRowIndicatorTrack {...this.props} onYLimitChange={this.handleYLimitChange} />
      </NumericalChannel>
    );
  }
});

let PerRowIndicatorTrack = React.createClass({
  mixins: [
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('chromosome', 'blockStart', 'blockEnd', 'table')
  ],

  propTypes: {
    chromosome: React.PropTypes.string.isRequired,
    blockStart: React.PropTypes.number,
    blockEnd: React.PropTypes.number,
    blockPixelWidth: React.PropTypes.number,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    onYLimitChange: React.PropTypes.func,
    table: React.PropTypes.string.isRequired,
  },

  getInitialState() {
    return {};
  },

  componentWillMount() {
    this.data = {
      columns: {}
    };
  },

  componentWillReceiveProps(nextProps) {
    //We apply data if there is a change in presentation parameters
    if ([].some((name) => this.props[name] !== nextProps[name])) {
      this.applyData(nextProps);
    }
  },

  shouldComponentUpdate(nextProps, nextState) {
    return this.state.points !== nextState.points;
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, blockStart, blockEnd, blockPixelWidth, width, sideWidth, table} = props;
    if (this.state.chromosome && (this.state.chromosome !== chromosome)) {
      this.data = {
        columns: {}
      };
      this.applyData(props);
    }
    if (width - sideWidth < 1) {
      return;
    }
    this.props.onChangeLoadStatus('LOADING');
    let tableConfig = this.config.tables[table];
    let columns = [tableConfig.primkey, tableConfig.positionField];
    let columnspec = {};
    columns.forEach((column) => columnspec[column] = tableConfig.propertiesMap[column].defaultFetchEncoding);
    let APIargs = {
      database: this.config.dataset,
      table: table,
      columns: columnspec,
      query: SQL.WhereClause.encode(SQL.WhereClause.AND([
        SQL.WhereClause.CompareFixed(tableConfig.chromosomeField, '=', chromosome),
        SQL.WhereClause.CompareFixed(tableConfig.positionField, '>=', blockStart),
        SQL.WhereClause.CompareFixed(tableConfig.positionField, '<', blockEnd)
      ])),
      transpose: false
    };

    requestContext.request((componentCancellation) =>
      LRUCache.get(
        'pageQuery' + JSON.stringify(APIargs),
        (cacheCancellation) =>
          API.pageQuery({cancellation: cacheCancellation, ...APIargs}),
        componentCancellation
    )).then((data) => {
      this.props.onChangeLoadStatus('DONE');
      this.data = data;
      this.applyData(props);
      })
      .catch((err) => {
        this.props.onChangeLoadStatus('DONE');
        throw err;
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
      })

  },

  applyData(props) {
    let {table} = this.props;
    let tableConfig = this.config.tables[table];
    if (!(this.data && this.data && this.data[tableConfig.positionField]))
      return;
    this.setState({points: this.data[tableConfig.positionField]});
  },

  render() {
    let {points} = this.state;
    if (points)
      return (
        <g className="indicator-track">
          {points.map((point) =>
            <line key={point} x1={point} x2={point} y1={50} y2={50} />
          )}
        </g>
      );
    else
      return null;
  }
});

let PerRowIndicatorControls = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      check: [
      ],
      redirect: ['componentUpdate']
    })
  ],

  render() {
    //let {fractional, autoYScale, yMin, yMax} = this.props;
    return (
      <div className="channel-controls">
      </div>
    );
  }

});


module.exports = PerRowIndicatorChannel;


