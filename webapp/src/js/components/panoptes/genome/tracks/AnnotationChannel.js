import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
//import Tooltip from 'rc-tooltip';
import _forEach from 'lodash.foreach';
import Hammer from 'react-hammerjs'; //We need hammer as "onClick" would fire for panning moves

import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import Gene from 'containers/Gene';

import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import findBlocks from 'panoptes/FindBlocks';
import SQL from 'panoptes/SQL';

import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';

const ROW_HEIGHT = 24;

let AnnotationChannel = createReactClass({
  displayName: 'AnnotationChannel',

  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        //'setProps',
        //'onClose'
      ],
      check: [
        'start',
        'end',
        'chromosome',
        'width',
        'sideWidth',
        'name',
        'hoverPos'
      ]
    }),
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'table', 'width', 'sideWidth')
  ],

  propTypes: {
    chromosome: PropTypes.string,
    start: PropTypes.number,
    end: PropTypes.number,
    width: PropTypes.number,
    sideWidth: PropTypes.number,
    name: PropTypes.string,
    onChangeLoadStatus: PropTypes.func,
    onClose: PropTypes.func,
    hoverPos: PropTypes.number,
    disableClick: PropTypes.bool,
  },

  getInitialState() {
    return {
      height: 50,
      clickIndex: null
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
    if (this.props.chromosome !== chromosome || !((this.blockEnd === block1End && this.blockStart === block1Start) ||
      (this.blockEnd === block2End && this.blockStart === block2Start))) {
      //Current block was unacceptable so choose best one
      this.blockStart = block1Start;
      this.blockEnd = block1End;
      if (onChangeLoadStatus) onChangeLoadStatus('LOADING');

      let APIargs = {
        typedArrays: true,
        database: this.config.dataset,
        table: 'annotation',
        order: [['asc', 'fstart']],
        columns: [
          {expr: 'fstart', as: 'starts'},
          {expr: ['-', ['fstop', 'fstart']], as: 'sizes'},
          {expr: 'fname', as: 'names'},
          {expr: 'fnames', as: 'altNames'},
          {expr: 'fid', as: 'ids'},
          {expr: 'ftype', as: 'types'},
          {expr: 'fparentid', as: 'parents'}
        ],
        query: SQL.WhereClause.encode(
          SQL.WhereClause.AND([
            SQL.WhereClause.CompareFixed('chromid', '=', chromosome),
            SQL.WhereClause.OR([
              SQL.WhereClause.AND([
                SQL.WhereClause.CompareFixed('fstart', '>=', this.blockStart),
                SQL.WhereClause.CompareFixed('fstart', '<', this.blockEnd)
              ]),
              SQL.WhereClause.AND([
                SQL.WhereClause.CompareFixed('fstop', '>=', this.blockStart),
                SQL.WhereClause.CompareFixed('fstop', '<', this.blockEnd)
              ]),
              SQL.WhereClause.AND([
                SQL.WhereClause.CompareFixed('fstart', '<=', this.blockStart),
                SQL.WhereClause.CompareFixed('fstop', '>', this.blockEnd)
              ]),
            ])
          ])
        )
      };

      requestContext.request((componentCancellation) =>
        LRUCache.get(
          `query${JSON.stringify(APIargs)}`,
          (cacheCancellation) =>
            API.query({cancellation: cacheCancellation, ...APIargs}),
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
          console.error(error);
        });
    }
  },

  applyData(props, data) {
    if (!data) {
      this.data = null;
      return;
    }
    let {ids, parents, sizes, starts, types, names, altNames} = data;
    ids = ids.array;
    parents = parents.array;
    sizes = sizes.array;
    starts = starts.array;
    types = types.array;
    names = names.array;
    altNames = altNames.array;
    //Note that the entries are ordered by start
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
    this.data = {ids, parents, sizes, starts, types, rows, names, altNames};
    this.draw(props);
  },

  draw(props) {
    const {width, sideWidth, start, end, hoverPos} = props || this.props;
    const {height} = this.state;
    const hovers = [];
    const canvas = this.canvas;
    if (!canvas)
      return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!(this.data && this.data.starts)) return;
    const {ids, names, sizes, starts, types, rows, altNames} = this.data;
    ctx.strokeStyle = '#000'; // gene onHover border colour
    ctx.font = '10px monospace'; // gene text normal font
    let maxRow = 0;
    let scaleFactor = ((width - sideWidth) / (end - start));
    let lastTextAt = [];
    for (let i = 0, l = starts.length; i < l; ++i) {
      if (types[i] === 'gene') {
        if (starts[i] <= hoverPos && starts[i] + sizes[i] > hoverPos) {
          hovers.push(i);
        }
        const x1 = scaleFactor * (starts[i] - start);
        const x2 = scaleFactor * ((starts[i] + sizes[i]) - start);
        if (x2 > -60 && x1 < width + 4) {
          ctx.fillRect(x1, (rows[i] * ROW_HEIGHT) + 20, Math.max(1, x2 - x1), 2);   //Gene bar
          let text = names[i] || ids[i];
          if (text && (lastTextAt[rows[i]] + 30 < x1 || typeof lastTextAt[rows[i]] === 'undefined')) {
            lastTextAt[rows[i]] = x1;
            let grd = ctx.createLinearGradient(x1 - 12, 0, x1, 0);
            grd.addColorStop(0.000, 'rgba(255, 255, 255, 0)');
            grd.addColorStop(1.000, 'rgba(255, 255, 255, 1.000)');
            ctx.fillStyle = grd;
            ctx.fillRect(x1 - 12, (rows[i] * ROW_HEIGHT) + 4, 12 + text.length * 6, 10);
            ctx.fillStyle = '#3d8bd5'; // gene text normal colour
            ctx.fillText(text, x1, (rows[i] * ROW_HEIGHT) + 14);
          }
          if (rows[i] > maxRow)
            maxRow = rows[i];
        }
      }
    }
    ctx.fillStyle = '#3d8bd5'; // coding region background colour
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
    _forEach(hovers, (hoverIndex) => {
      const x1 = scaleFactor * (starts[hoverIndex] - start);
      const x2 = scaleFactor * ((starts[hoverIndex] + sizes[hoverIndex]) - start);
      ctx.strokeRect(x1, (rows[hoverIndex] * ROW_HEIGHT) + 16, Math.max(0.125, x2 - x1), 10);   //Outline
      let text = names[hoverIndex];
      if (text) {
        text += `, ${ids[hoverIndex]}`;
      } else {
        text = ids[hoverIndex];
      }
      if (altNames[hoverIndex]) text += `, ${altNames[hoverIndex]}`;
      if (text) {
        ctx.fillStyle = '#FFF'; // gene text onHover background colour
        ctx.fillRect(x1 - 12, (rows[hoverIndex] * ROW_HEIGHT) + 4, 14 + text.length * 6, 10);
        ctx.fillStyle = '#000'; // gene text onHover colour
        ctx.font = '10px monospace'; // gene text onHover font
        ctx.fillText(text, x1, (rows[hoverIndex] * ROW_HEIGHT) + 14);
      }
    });
    const desiredHeight = Math.max((maxRow + 1) * ROW_HEIGHT + 10, 40);
    if (desiredHeight !== height)
      this.setState({height: desiredHeight});
  },

  convertXY(e) {
    let rect = this.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  },

  xyToGene(x, y) {
    const {width, sideWidth, start, end} = this.props;
    if (!(this.data && this.data.starts)) return null;
    const {ids, sizes, starts, types, rows} = this.data;
    let scaleFactor = ((width - sideWidth) / (end - start));
    for (let i = 0, l = starts.length; i < l; ++i) {
      if (types[i] === 'gene') {
        const x1 = scaleFactor * (starts[i] - start);
        const x2 = scaleFactor * ((starts[i] + sizes[i]) - start);
        if (x2 > x && x1 < x && y > rows[i] * ROW_HEIGHT && y < 5 + ((rows[i] + 1) * ROW_HEIGHT)) {
          return ids[i];
        }
      }
    }
    return null;

  },

  handleClick(e) {
    if (!this.canvas) return;
    let [x, y] = this.convertXY(e);
    let gene = this.xyToGene(x, y);
    if (gene) {
      this.flux.actions.session.popupOpen(<Gene geneId={gene}/>, false);
    }
  },

  setHover(hoverId) {
    if (hoverId) {
      for (let i = 0, l = this.data.ids.length; i < l; ++i) {
        if (this.data.ids[i] === hoverId) {
          this.setState({clickIndex: i});
          return;
        }
      }
    } else {
      this.setState({clickIndex: null});
    }
  },

  handleMouseMove(e) {
    if (!this.canvas) return;
    let [x, y] = this.convertXY(e);
    let id = this.xyToGene(x, y);
    this.setHover(id);
  },

  handleMouseOver(e) {
    if (!this.canvas) return;
    let [x, y] = this.convertXY(e);
    let id = this.xyToGene(x, y);
    this.setHover(id);
  },

  handleMouseOut(e) {
    this.setState({clickIndex: null});
  },

  render() {
    let {width, sideWidth, name, disableClick} = this.props;
    let {height, clickIndex} = this.state;
    const hovers = [];
    //Disabled for now as it covers over channels below and we can show the same info in the track
    // if (hoverPos && this.data) {
    //   let scaleFactor = ((width - sideWidth) / (end - start));
    //   const {starts, sizes, names, ids, rows, types} = this.data;
    //   for (let i = 0, l = starts.length; i < l; ++i) {
    //     if (types[i] === 'gene' && starts[i] <= hoverPos && starts[i] + sizes[i] > hoverPos) {
    //       hovers.push(
    //         <Tooltip placement={'bottom'}
    //                  visible={true}
    //                  overlay={<div>
    //                         {ids[i] + (names[i] && names[i] !== ids[i] ? ` - ${names[i]}` : '')}
    //                       </div>}>
    //           <div
    //             style={{
    //                     pointerEvents: 'none',
    //                     position: 'absolute',
    //                     top: `${(rows[i] * ROW_HEIGHT) + 10}px`,
    //                     left: `${scaleFactor * ((starts[i] + (sizes[i]/2)) - start)}px`,
    //                     height: '12px',
    //                     width: '1px'}}></div>
    //         </Tooltip>);
    //     }
    //   }
    // }

    const Side = (props) =>
      <div className="side-name">
        <span>{name || 'Genes'}</span>
      </div>;

    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={height}
        sideComponent={ <Side/> }
        configComponent={null}
        legendComponent={<Legend/>}
        onClose={null}
      >
        <div className="canvas-container">
          <Hammer onTap={this.handleClick}>
            <canvas ref={(ref) => this.canvas = ref}
              style={{cursor: clickIndex !== null && !disableClick ? 'pointer' : 'inherit'}}
              width={width} height={height}
              onClick={!disableClick ? this.handleClick : null}
              onMouseOver={this.handleMouseOver}
              onMouseMove={this.handleMouseMove}
              onMouseOut={this.handleMouseOut}
            />
          </Hammer>
          {hovers}
        </div>

      </ChannelWithConfigDrawer>);
  },
});

class Legend extends React.Component {
  shouldComponentUpdate() {
    return false;
  }

  render() {
    return <div className="legend">
      <div className="legend-element">
        <svg width="50" height="26">
          <rect x="0" y="12" width="50" height="2" style={{fill: '#3d8bd5'}}/>
        </svg>
        <div style={{marginLeft: '5px'}}>
          Gene
        </div>
      </div>
      <div className="legend-element">
        <svg width="50" height="26">
          <rect x="0" y="8" width="50" height="10" style={{fill: '#3d8bd5'}}/>
        </svg>
        <div style={{marginLeft: '5px'}}>
          Coding Sequence
        </div>
      </div>
    </div>;
  }
}

export default AnnotationChannel;
