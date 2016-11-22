import React from 'react';

import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import Gene from 'containers/Gene';

import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import findBlocks from 'panoptes/FindBlocks';

import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';

const ROW_HEIGHT = 24;

let AnnotationChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        //'setProps',
        //'onClose'
      ],
      check: [
        'chromosome',
        'width',
        'sideWidth',
        'name'
      ]
    }),
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'table', 'width', 'sideWidth')
  ],

  propTypes: {
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number,
    name: React.PropTypes.string,
    onChangeLoadStatus: React.PropTypes.func,
    onClose: React.PropTypes.func
  },

  getInitialState() {
    return {
      height: 50,
      hover: null
    };
  },


  componentWillMount() {
    this.data = null;
  },

  componentDidUpdate() {
    this.draw();
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, start, end, width, sideWidth, onChangeLoadStatus} = props;
    if (this.props.chromosome !== chromosome) {
      this.applyData(props, null);
    }
    if (width - sideWidth < 1) {
      return;
    }
    let [[block1Start, block1End], [block2Start, block2End]] = findBlocks(start, end);
    //If we already are at an acceptable block then don't change it!
    if (this.props.chromosome !== chromosome ||
        !((this.blockEnd === block1End && this.blockStart === block1Start) ||
          (this.blockEnd === block2End && this.blockStart === block2Start))) {
      //Current block was unacceptable so choose best one
      this.blockStart = block1Start;
      this.blockEnd = block1End;
      if (onChangeLoadStatus) onChangeLoadStatus('LOADING');

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
          if (onChangeLoadStatus) onChangeLoadStatus('DONE');
          this.applyData(this.props, data);
        })
        .catch((err) => {
          if (onChangeLoadStatus) onChangeLoadStatus('DONE');
          throw err;
        })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((error) => {
          this.applyData(this.props, null);
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
        });
    }
    this.draw(props);
  },

  applyData(props, data) {
    if (!data) {
      this.data = null;
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
    const {height, hover} = this.state;

    const canvas = this.refs.canvas;
    if (!canvas)
      return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!(this.data && this.data.starts)) return;
    const {ids, names, sizes, starts, types, rows} = this.data;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    ctx.font = '10px monospace';
    let maxRow = 0;
    let scaleFactor = ((width - sideWidth) / (end - start));
    let lastTextAt = [];
    for (let i = 0, l = starts.length; i < l; ++i) {
      if (types[i] === 'gene') {
        const x1 = scaleFactor * (starts[i] - start);
        const x2 = scaleFactor * ((starts[i] + sizes[i]) - start);
        if (x2 > -60 && x1 < width + 4) {
          ctx.fillRect(x1, (rows[i] * ROW_HEIGHT) + 20, Math.max(1, x2 - x1), 2);   //Gene bar
          let text = names[i] || ids[i];
          if (text && (lastTextAt[rows[i]] + 30 < x1  || typeof lastTextAt[rows[i]] === 'undefined')) {
            lastTextAt[rows[i]] = x1;
            let grd = ctx.createLinearGradient(x1 - 12, 0, x1, 0);
            grd.addColorStop(0.000, 'rgba(255, 255, 255, 0)');
            grd.addColorStop(1.000, 'rgba(255, 255, 255, 1.000)');
            ctx.fillStyle = grd;
            ctx.fillRect(x1 - 12, (rows[i] * ROW_HEIGHT) + 4, 12 + text.length * 6, 10);
            ctx.fillStyle = '#000';
            ctx.fillText(text, x1, (rows[i] * ROW_HEIGHT) + 14);
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
        if (x2 > -4 && x1 < width + 4) {
          ctx.fillRect(x1, (rows[i] * ROW_HEIGHT) + 16, Math.max(0.125, x2 - x1), 10);   //Exon square
          //ctx.strokeRect(x1, psy-5, x2 - x1, 10);
        }
      }
    }
    if (hover) {
      for (let i = 0, l = starts.length; i < l; ++i) {
      if (ids[i] === hover) {
        const x1 = scaleFactor * (starts[i] - start);
        let text = ids[i] + (names[i] && names[i] !== ids[i] ? ` - ${names[i]}` : '');
        if (text) {
            ctx.fillStyle = '#FFF';
            ctx.fillRect(x1 - 12, (rows[i] * ROW_HEIGHT) + 4, 14 + text.length * 6, 10);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(text, x1, (rows[i] * ROW_HEIGHT) + 14);
          }
        }
      }
    }
    const desiredHeight = Math.max((maxRow + 1) * ROW_HEIGHT + 10, 40);
    if (desiredHeight !== height)
      this.setState({height: desiredHeight});
  },

  convertXY(e) {
    let rect = this.refs.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  },

  xyToGene(x,y) {
    const {width, sideWidth, start, end} = this.props;
    if (!(this.data && this.data.starts)) return null;
    const {ids, sizes, starts, types, rows} = this.data;
    let scaleFactor = ((width - sideWidth) / (end - start));
    for (let i = 0, l = starts.length; i < l; ++i) {
      if (types[i] === 'gene') {
        const x1 = scaleFactor * (starts[i] - start);
        const x2 = scaleFactor * ((starts[i] + sizes[i]) - start);
        if (x2 > x && x1 < x && y > rows[i] * ROW_HEIGHT && y < 5 + ((rows[i]+1) * ROW_HEIGHT)) {
          return ids[i]
        }
      }
    }
    return null;

  },

  handleClick(e) {
    let [x, y] = this.convertXY(e);
    let gene = this.xyToGene(x,y);
    if (gene) {
      this.flux.actions.session.popupOpen(<Gene geneId={gene}/>, false);
    }
  },

  handleMouseMove(e) {
    let [x, y] = this.convertXY(e);
    let gene = this.xyToGene(x,y);
    this.setState({hover: gene});
  },
  handleMouseOver(e) {
    let [x, y] = this.convertXY(e);
    let gene = this.xyToGene(x,y);
    this.setState({hover: gene});
  },
  handleMouseOut(e) {
    this.setState({hover: null})
  },

  render() {
    let {width, sideWidth, name} = this.props;
    let {height, hover} = this.state;
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
        configComponent={null}
        legendComponent={<Legend/>}
        onClose={null}
      >
          <canvas ref="canvas"
                  style={{cursor: hover ? 'pointer' : 'inherit'}}
                  width={width} height={height}
                  onClick={this.handleClick}
                  onMouseOver={this.handleMouseOver}
                  onMouseMove={this.handleMouseMove}
                  onMouseOut={this.handleMouseOut}
          />
      </ChannelWithConfigDrawer>);
  }
});

let Legend = React.createClass({
  shouldComponentUpdate() {
    return false;
  },

  render() {
    return <div className="legend">
      <div className="legend-element">
        <svg width="50" height="26">
          <rect x="0" y="12" width="50" height="2" style={{fill: '#000'}}/>
        </svg>
        <div className="label">
          Gene
        </div>
      </div>
      <div className="legend-element">
        <svg width="50" height="26">
          <rect x="0" y="8" width="50" height="10" style={{fill: '#3d8bd5'}}/>
        </svg>
        <div className="label">
          Coding Sequence
        </div>
      </div>
    </div>;
  }
});

export default AnnotationChannel;


