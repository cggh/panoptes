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
        dataYMin={0}
        dataYMax={100}
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
      positions: []
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
        positions: []
      };
      this.applyData(props);
    }
    if (width - sideWidth < 1) {
      return;
    }
    this.props.onChangeLoadStatus('LOADING');

    let columns = [this.config.tables[table].primkey];
    let columnspec = {};
    columns.forEach((column) => columnspec[column] = this.config.tables[table].propertiesMap[column].defaultFetchEncoding);
    let APIargs = {
      database: this.config.dataset,
      table: table,
      columns: columnspec,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),  //START HERE PARAMETERISE BY BLOCK
      transpose: false
    };

    requestContext.request((componentCancellation) =>
      LRUCache.get(
        'pageQuery' + JSON.stringify(APIargs),
        (cacheCancellation) =>
          API.pageQuery({cancellation: cacheCancellation, ...APIargs}),
        componentCancellation
    )).then((tableData) => {
        let primKeys = tableData[this.config.tables[table].primkey];
        console.log(primKeys);
    });
  },

  applyData(props) {
    return;
    let {fractional} = props;
    if (!(this.data && this.data.columns && this.data.columns.categories))
      return;
    let {dataStart, dataStep, columns} = this.data;

    let {summariser, data} = columns.categories;
    let categories = summariser.categories || summariser.Categories;
    let catColours = this.config.summaryValues[props.group][props.track].settings.categoryColors;
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


