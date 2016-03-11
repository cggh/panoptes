import React from 'react';

import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';


import API from 'panoptes/API';
import SQL from 'panoptes/SQL';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import findBlocks from 'panoptes/genome/FindBlocks';

import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';

import 'hidpi-canvas';

const HEIGHT = 50;

let PerRowIndicatorChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'componentUpdate',
        'onClose'
      ],
      check: [
        'chromosome',
        'width',
        'sideWidth',
        'name',
        'table'
      ]
    }),
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'table', 'width', 'sideWidth')
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


  componentWillMount() {
    this.positions = [];
  },

  componentDidUpdate() {
    this.draw();
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, start, end, width, sideWidth, table} = props;
    if (this.props.chromosome && this.props.chromosome !== chromosome) {
      this.applyData(props, {});
    }
    if (width - sideWidth < 1) {
      return;
    }
    let [[block1Start, block1End], [block2Start, block2End]] = findBlocks(start, end);
    //If we already are at an acceptable block then don't change it!
    if (!((this.blockEnd === block1End && this.blockStart === block1Start) ||
      (this.blockEnd === block2End && this.blockStart === block2Start))) {
      //Current block was unacceptable so choose best one
      this.blockStart = block1Start;
      this.blockEnd = block1End;
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
          SQL.WhereClause.CompareFixed(tableConfig.positionField, '>=', this.blockStart),
          SQL.WhereClause.CompareFixed(tableConfig.positionField, '<', this.blockEnd)
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
          this.applyData(props, data);
        })
        .catch((err) => {
          this.props.onChangeLoadStatus('DONE');
          throw err;
        })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((error) => {
          this.applyData(props, {});
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
        });
    }
    this.draw(props);
  },

  applyData(props, data) {
    let {table} = props;
    let tableConfig = this.config.tables[table];
    this.positions = data[tableConfig.positionField] || [];
    this.draw(props);
  },

  draw(props) {
    const {width, sideWidth, start, end} = props || this.props;
    const positions = this.positions;
    const canvas = this.refs.canvas;
    if (!canvas)
      return;
    const ctx = canvas.getContext('2d');
    const psy = (HEIGHT / 2) - 4;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,0,0,0.6)';
    for (let i = 0, l = positions.length; i < l; ++i) {
      const psx = ((width - sideWidth) / (end - start)) * (positions[i] - start);
      if (psx > -4 && psx < width + 4) {
        ctx.beginPath();
        ctx.moveTo(psx, psy);
        ctx.lineTo(psx + 4, psy + 8);
        ctx.lineTo(psx - 4, psy + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  },

  render() {
    let {width, sideWidth, table} = this.props;
    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={HEIGHT}
        sideComponent={
          <div className="side-name">
            <span>{name || this.config.tables[table].tableCapNamePlural}</span>
            </div>
            }
        //Override component update to get latest in case of skipped render
        configComponent={<PerRowIndicatorControls {...this.props} componentUpdate={this.redirectedProps.componentUpdate} />}
        onClose={this.redirectedProps.onClose}
      >
        <canvas ref="canvas" width={width} height={HEIGHT}/>;
      </ChannelWithConfigDrawer>);
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


