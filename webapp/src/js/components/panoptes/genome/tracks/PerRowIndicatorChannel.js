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
import BlockChunkedChannel from 'panoptes/genome/tracks/BlockChunkedChannel';
import ErrorReport from 'panoptes/ErrorReporter';


import Checkbox from 'material-ui/lib/checkbox';

import 'hidpi-canvas';

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
    let {table} = this.props;
    return (
      <BlockChunkedChannel {...this.props}
        height={50}
        side={<span>{name || this.config.tables[table].tableCapNamePlural}</span>}
        onClose={this.redirectedProps.onClose}
        controls={<PerRowIndicatorControls {...this.props} componentUpdate={this.redirectedProps.componentUpdate} />}
      >
        <PerRowIndicatorTrack {...this.props} height={50}/>
      </BlockChunkedChannel>
    );
  }
});

let PerRowIndicatorTrack = React.createClass({
  mixins: [
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('chromosome', 'blockStart', 'blockEnd', 'table'),
    PureRenderWithRedirectedProps({})
  ],

  propTypes: {
    chromosome: React.PropTypes.string.isRequired,
    blockStart: React.PropTypes.number,
    blockEnd: React.PropTypes.number,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    table: React.PropTypes.string.isRequired
  },

  getInitialState() {
    return {};
  },

  componentWillMount() {
    this.data = {
      columns: {}
    };
  },

  componentDidMount() {
    this.draw();
  },

  componentDidUpdate() {
    this.draw();
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, blockStart, blockEnd, width, sideWidth, table} = props;
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
      });

  },

  applyData(props) {
    let {table} = props;
    let tableConfig = this.config.tables[table];
    if (!(this.data && this.data && this.data[tableConfig.positionField]))
      return;
    this.setState({positions: this.data[tableConfig.positionField]});
  },

  draw() {
    const {width, height, start, end} = this.props;
    const {positions} = this.state;
    const ctx = this.refs.canvas.getContext('2d');
    let psx = width / 2;
    let psy = height / 2;
    ctx.fillStyle = 'rgb(255,0,0)';
    ctx.beginPath();
    ctx.moveTo(psx, psy);
    ctx.lineTo(psx + 4, psy + 8);
    ctx.lineTo(psx - 4, psy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },


  render() {
    const {height, width} = this.props;
    return <canvas ref="canvas" width={width} height={height}/>;
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


