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
        'name',
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
    //onClose: React.PropTypes.func,
    //table: React.PropTypes.string.isRequired
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
      this.props.onChangeLoadStatus('LOADING');

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
    this.data = data || {};
    this.draw(props);
  },

  draw(props) {
    const {width, sideWidth, start, end} = props || this.props;
    const { ids, names, parents, sizes, starts, types } = this.data;
    const canvas = this.refs.canvas;
    if (!canvas || !starts)
      return;
    const ctx = canvas.getContext('2d');
    const psy = (HEIGHT / 2);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    for (let i = 0, l = starts.length; i < l; ++i) {
      if (types[i]==='gene') {
        const x1 = ((width - sideWidth) / (end - start)) * (starts[i] - start);
        const x2 = ((width - sideWidth) / (end - start)) * ((starts[i] + sizes[i]) - start);
        if (x2 > -4 && x1 < width + 4) {
          ctx.fillRect(x1, psy-1, x2 - x1, 2);
          if (names[i]) {
            ctx.fillText(names[i], x1, psy-10, x2 - x1);
          }
        }
      }
    }
    ctx.fillStyle = '#3d8bd5';
    for (let i = 0, l = starts.length; i < l; ++i) {
      if (types[i]==='CDS') {
        const x1 = ((width - sideWidth) / (end - start)) * (starts[i] - start);
        const x2 = ((width - sideWidth) / (end - start)) * ((starts[i] + sizes[i]) - start);
        if (x2 > -4 && x1 < width + 4) {
          ctx.fillRect(x1, psy-5, x2 - x1, 10);
          //ctx.strokeRect(x1, psy-5, x2 - x1, 10);
        }
      }
    }

  },

  render() {
    let {width, sideWidth} = this.props;
    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={HEIGHT}
        sideComponent={
          <div className="side-name">
            <span>{name || 'Genes'}</span>
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


module.exports = AnnotationChannel;


