import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import d3 from 'd3';
import uid from 'uid';

import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import SummarisationCache from 'panoptes/SummarisationCache';
import ErrorReport from 'panoptes/ErrorReporter';
import Channel from 'panoptes/genome/tracks/Channel';
import findBlocks from 'panoptes/genome/FindBlocks';

const HEIGHT = 25;

let ReferenceSequence = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'width', 'sideWidth')
  ],

  propTypes: {
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number
  },

  getInitialState() {
    return {};
  },

  componentWillMount() {
    this.id = uid(10);
  },

  applyData(data) {
    this.setState(data);
  },

  //Called by DataFetcherMixin on prop change
  fetchData(props, requestContext) {
    let {chromosome, start, end, width, sideWidth} = props;
    if (this.state.chromosome && (this.state.chromosome !== chromosome))
      this.setState({columns: null});
    if (width - sideWidth < 1) {
      return;
    }

    let [[block1Start, block1End], [block2Start, block2End]] = findBlocks(start, end);
    //If we already have the data for an acceptable block then stop.
    if ((this.blockEnd === block1End && this.blockStart === block1Start) ||
      (this.blockEnd === block2End && this.blockStart === block2Start))
      return;

    this.blockStart = block1Start;
    this.blockEnd = block1End;
    let targetPointCount = (((width - sideWidth) / 2) / (end - start)) * (block1End - block1Start);
    this.props.onChangeLoadStatus('LOADING');
    requestContext.request(
      (componentCancellation) =>
        SummarisationCache.fetch({
          columns: {
            sequence: {
              folder: `SummaryTracks/${this.config.dataset}/Sequence`,
              config: 'Summ',
              name: 'Base_avg'
            }
          },
          minBlockSize: 1,
          chromosome: chromosome,
          start: block1Start,
          end: block1End,
          targetPointCount: targetPointCount,
          cancellation: componentCancellation
        })
          .then((data) => {
            this.props.onChangeLoadStatus('DONE');
            this.applyData(data);
          })
          .catch(API.filterAborted)
          .catch(LRUCache.filterCancelled)
          .catch((error) => {
            this.props.onChangeLoadStatus('DONE');
            ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
            this.setState({loadStatus: 'error'});
          })
    );
  },

  render() {
    let {start, end, width, sideWidth} = this.props;
    let {dataStart, dataStep, columns} = this.state;
    let sequence = columns ? columns.sequence || [] : [];
    if (width == 0)
      return null;
    return (
      <Channel
        height={HEIGHT}
        width={width}
        sideWidth={sideWidth}
        sideComponent={<div className="side-name">Ref. Seq.</div>}
      >
            <SequenceSquares
              width={width - sideWidth}
              height={HEIGHT}
              start={start}
              end={end}
              dataStart={dataStart}
              dataStep={dataStep}
              sequence={sequence}/>
        </Channel>
    );
  }

});

let SequenceSquares = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  componentDidMount() {
    this.paint(this.refs.canvas);
  },

  componentDidUpdate(prevProps) {
    //We paint the canvas after render as any changes to canvas width and height clear the canvas.
    if (this.props.sequence !== prevProps.sequence)
      this.paint(this.refs.canvas);
  },

  paint(canvas) {
    let {sequence} = this.props;
    canvas.width = sequence.length;
    canvas.height = 1;
    if (canvas.width !== sequence.length)
      console.log('Unequal lengths');
    if (sequence.length < 1)
      return;
    let ctx = canvas.getContext('2d');
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    sequence.forEach((base, i) => {
      base = base.toLowerCase();
      data[i * 4 + 3] = 255;
      if (base === 'a') {
        data[i * 4] = 255;
        data[i * 4 + 1] = 50;
        data[i * 4 + 2] = 50;
      } else if (base === 't') {
        data[i * 4] = 255;
        data[i * 4 + 1] = 170;
        data[i * 4 + 2] = 0;
      } else if (base === 'c') {
        data[i * 4] = 0;
        data[i * 4 + 1] = 128;
        data[i * 4 + 2] = 192;
      } else if (base === 'g') {
        data[i * 4] = 0;
        data[i * 4 + 1] = 192;
        data[i * 4 + 2] = 120;
      } else {
        data[i * 4 + 3] = 0;
      }
    });
    ctx.putImageData(imageData, 0, 0);

  },


  render() {
    let {width, height, start, end, dataStart, dataStep, sequence} = this.props;
    let scale = d3.scale.linear().domain([start, end]).range([0, width]);
    let stepWidth = scale(dataStep) - scale(0);
    let offset = scale(dataStart) - scale(start);
    return <canvas ref="canvas"
                   className="sequence-canvas"
                   style={{transform: `translateX(${offset}px) scale(${stepWidth},${height})`}}
                   width={sequence.length}
                   height={1}/>;
  }
});


module.exports = ReferenceSequence;


