import React from 'react';

import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';


import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import findBlocks from 'panoptes/genome/FindBlocks';

import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';

import 'hidpi-canvas';

let AnnotationChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        //'componentUpdate',
        //'onClose'
      ],
      check: [
        'chromosome',
        'width',
        'sideWidth',
        'name'
      ]
    }),
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'table', 'width', 'sideWidth')
  ],

  propTypes: {
    //componentUpdate: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    sideWidth: React.PropTypes.number.isRequired,
    name: React.PropTypes.string,
    onChangeLoadStatus: React.PropTypes.func
    //onClose: React.PropTypes.func,
    //table: React.PropTypes.string.isRequired
  },

  getInitialState() {
    return {
      height: 50
    };
  },


  componentWillMount() {
    this.data = {};
  },

  componentDidUpdate() {
    this.draw();
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, start, end, width, sideWidth} = props;
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
      props.onChangeLoadStatus('LOADING');

      let APIargs = {
        database: this.config.dataset,
        chrom: chromosome,
        start: this.blockStart,
        end: this.blockEnd
      };

      requestContext.request((componentCancellation) =>
        LRUCache.get(
          'annotationData' + JSON.stringify(APIargs),
          (cacheCancellation) =>
            API.annotationData({cancellation: cacheCancellation, ...APIargs}),
          componentCancellation
        )).then((data) => {
          this.props.onChangeLoadStatus('DONE');
          this.applyData(this.props, data);
        })
        .catch((err) => {
          this.props.onChangeLoadStatus('DONE');
          throw err;
        })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((error) => {
          this.applyData(this.props, {});
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
        });
    }
    this.draw(props);
  },

  applyData(props, data) {
    if (!data) {
      this.data = {};
      return;
    }
    const {ids, parents, sizes, starts, types} = data;
    //We make assumption here that the entries are ordered by start - this is how the annot datatype is currently set up on the server
    //Find the row for each gene and as we go record the gaps so we can decide what text to write
    let rows = new Array(ids.length);
    //let gaps = new Array(ids.length);
    //let previousIndexInRow = [-1];
    let nextFreeStart = [];
    for (let i = 0, l = ids.length; i < l; ++i) {
      if (types[i] === 'gene') {
        let rowToCheck = 0;
        while (nextFreeStart[rowToCheck] && nextFreeStart[rowToCheck] > starts[i] + sizes[i]) {
          rowToCheck += 1;
        }
        nextFreeStart[rowToCheck] = starts[i] + sizes[i];
        rows[i] = rowToCheck;
        //if (previousIndexInRow[rowToCheck] !== -1) {
        //  let prev = previousIndexInRow[rowToCheck];
        //  gaps[prev] = starts[i] - starts[prev];
        //}
        //previousIndexInRow[rowToCheck] = i;
      }
    }
    //Give children the row of their parent
    let geneMap = {};
    for (let i = 0, l = ids.length; i < l; ++i) {
      if (types[i] === 'gene')
        geneMap[ids[i]] = i;
    }
    for (let i = 0, l = ids.length; i < l; ++i) {
      if (types[i] === 'CDS')
        rows[i] = rows[geneMap[parents[i]]];
    }
    this.data = {...data, rows};
    this.draw(props);
  },

  draw(props) {
    const {width, sideWidth, start, end} = props || this.props;
    const {names, sizes, starts, types, rows} = this.data;
    const {height} = this.state;

    const canvas = this.refs.canvas;
    if (!canvas || !starts)
      return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    ctx.font = '10px monospace';
    const ROW_HEIGHT = 24;
    let maxRow = 0;
    let scaleFactor = ((width - sideWidth) / (end - start));
    let lastTextAt = [];
    for (let i = 0, l = starts.length; i < l; ++i) {
      if (types[i] === 'gene') {
        const x1 = scaleFactor * (starts[i] - start);
        const x2 = scaleFactor * ((starts[i] + sizes[i]) - start);
        if (x2 > -4 && x1 < width + 4) {
          ctx.fillRect(x1, (rows[i] * ROW_HEIGHT) + 20, Math.max(1, x2 - x1), 2);   //Gene bar
          if (names[i] && (lastTextAt[rows[i]] + 30 < x1  || typeof lastTextAt[rows[i]] === 'undefined')) {
            lastTextAt[rows[i]] = x1;
            let grd = ctx.createLinearGradient(x1 - 12, 0, x1, 0);
            grd.addColorStop(0.000, 'rgba(255, 255, 255, 0)');
            grd.addColorStop(1.000, 'rgba(255, 255, 255, 1.000)');
            ctx.fillStyle = grd;
            ctx.fillRect(x1 - 12, (rows[i] * ROW_HEIGHT) + 4, 12 + names[i].length * 6, 10);
            ctx.fillStyle = '#000';
            ctx.fillText(names[i], x1, (rows[i] * ROW_HEIGHT) + 14);
          }
          if (rows[i] > maxRow)
            maxRow = rows[i];
        }
      }
    }
    ctx.fillStyle = '#3d8bd5';
    for (let i = 0, l = starts.length; i < l; ++i) {
      if (types[i] === 'CDS') {
        const x1 = scaleFactor * (starts[i] - start);
        const x2 = scaleFactor * ((starts[i] + sizes[i]) - start);
        if (x2 > -4 && x1 < width + 4 && x2 - x1 > 0.25) {
          ctx.fillRect(x1, (rows[i] * ROW_HEIGHT) + 16, x2 - x1, 10);   //Exon square
          //ctx.strokeRect(x1, psy-5, x2 - x1, 10);
        }
      }
    }


    const desiredHeight = Math.max((maxRow + 1) * ROW_HEIGHT + 10, 40);
    if (desiredHeight !== height)
      this.setState({height: desiredHeight});
  },

  render() {
    let {width, sideWidth} = this.props;
    let {height} = this.state;
    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={height}
        sideComponent={
          <div className="side-name">
            <span>{name || 'Genes'}</span>
            </div>
            }
        //Override component update to get latest in case of skipped render
        configComponent={null}
        onClose={null}
      >
        <canvas ref="canvas" width={width} height={height}/>;
      </ChannelWithConfigDrawer>);
  }
});

//let PerRowIndicatorControls = React.createClass({
//  mixins: [
//    PureRenderWithRedirectedProps({
//      check: [
//      ],
//      redirect: ['componentUpdate']
//    })
//  ],
//
//  render() {
//    //let {fractional, autoYScale, yMin, yMax} = this.props;
//    return (
//      <div className="channel-controls">
//      </div>
//    );
//  }
//});


module.exports = AnnotationChannel;


