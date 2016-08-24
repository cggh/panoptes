import React from 'react';
import ReactDOM from 'react-dom';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import offset from 'bloody-offset';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import ConfigMixin from 'mixins/ConfigMixin';
import _has from 'lodash/has';
import _head from 'lodash/head';
import _keys from 'lodash/keys';
import _isFunction from 'lodash/isFunction';
import d3 from 'd3';
import scrollbarSize from 'scrollbar-size';

import Hammer from 'react-hammerjs';
import {Motion, spring} from 'react-motion';

import GenomeScale from 'panoptes/genome/tracks/GenomeScale';
import LoadingIndicator from 'panoptes/genome/LoadingIndicator';
import Controls from 'panoptes/genome/Controls';
import ReferenceSequence from 'panoptes/genome/tracks/ReferenceSequence';
import AnnotationChannel from 'panoptes/genome/tracks/AnnotationChannel';
import Background from 'panoptes/genome/Background';
import DetectResize from 'utils/DetectResize';
import 'genomebrowser.scss';
import FluxMixin from 'mixins/FluxMixin';

const dynreq = require.context('.', true);
const dynamicRequire = (path) => dynreq('./tracks/' + path);


const DEFAULT_SPRING = [160, 30];
const FLING_SPRING = [60, 15];
const NO_SPRING = [2000, 80];
const MIN_WIDTH = 5;
const FALLBACK_MAXIMUM = 1000000000;
const CONTROLS_HEIGHT = 33;

let GenomeBrowser = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({redirect: ['componentUpdate']}),
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    sideWidth: React.PropTypes.number.isRequired,
    chromPositions: ImmutablePropTypes.map,  //Stores the position on each chrom so you can flick back without losing place
    channels: ImmutablePropTypes.mapOf(
      ImmutablePropTypes.contains({
        channel: React.PropTypes.string.isRequired,
        props: ImmutablePropTypes.map
      }))
  },

  getDefaultProps() {
    return {
      channels: Immutable.Map(),
      chromosome: '',
      start: 0,
      end: 10000,
      sideWidth: 150,
      width: 500,
      components: Immutable.OrderedMap()
    };
  },

  getInitialState() {
    return {
      springConfig: DEFAULT_SPRING,
      loading: 0,
      width: 0,
      height: 0
    };
  },

  componentWillMount() {
    this.loading = 0;
    this.panStartPixel = null;
    this.defaultChrom = _head(_keys(this.config.chromosomes)); //Would be done as defaultProp, but config not avaliable then
  },

  componentWillReceiveProps(nextProps) {
    if (this.nextSpringConfig) {
      this.setState({springConfig: this.nextSpringConfig});
      this.nextSpringConfig = null;
    } else {
      this.setState({
        springConfig: nextProps.chromosome !== this.props.chromosome ?
          NO_SPRING : DEFAULT_SPRING
      });
    }
    this.actualStart = this.props.start;
    this.actualEnd = this.props.end;
  },


  scaleClamp(start, end, fracPos) {
    let {chromosome} = this.props;
    chromosome = chromosome || this.defaultChrom;
    let min = 0;
    let max = this.config.chromosomes[chromosome].len || FALLBACK_MAXIMUM;
    let width = end - start;
    if (start <= min && end >= max) {
      start = min;
      end = max;
      width = max - min;
    } else {
      if (start < min) {
        start = min;
        end = start + width;
        if (end > max)
          end = max;
      }
      if (end > max) {
        end = max;
        start = end - width;
        if (start < min)
          start = min;
      }
    }
    if (width < MIN_WIDTH) {
      start -= (MIN_WIDTH - width) * fracPos;
      end += (MIN_WIDTH - width) * (1 - fracPos);
      if (start < min) {
        start = min;
        end = start + MIN_WIDTH;
      }
      if (end > max) {
        end = max;
        start = end - MIN_WIDTH;
      }

    }
    return [start, end];
  },

  isEventInPanningArea(e) {
    let element = e.target;
    while (true) {  //eslint-disable-line no-constant-condition
      if (element.className === 'channel-controls')
        return false;
      if (element.className === 'channel-side')
        return false;
      if (element.className === 'main-area')
        return true;
      element = element.parentElement;
      if (!element)
        return true;
    }
  },

  handleZoom(pos, delta) {
    let start = this.actualStart;
    let end = this.actualEnd;
    let scaleFactor = (delta > 0) ?
    1.0 / (1.0 + 0.04 * Math.abs(delta)) :
    1.0 + 0.04 * Math.abs(delta);
    pos = (pos != undefined) ? this.scale.invert(pos) : start + ((end - start) / 2);
    let fracX = (pos - start) / (end - start);
    let newWidth = (end - start) / scaleFactor;
    start = pos - (newWidth * fracX);
    end = pos + (newWidth * (1 - fracX));
    [start, end] = this.scaleClamp(start, end, fracX);
    this.props.componentUpdate({start: start, end: end});
  },

  handleMouseWheel(e) {
    if (!this.isEventInPanningArea(e))
      return;
    this.handleZoom(e.clientX - offset(e.currentTarget).left, e.deltaY);
    e.stopPropagation();
    e.preventDefault();
  },
  handleDoubleTap(e) {
    if (!this.isEventInPanningArea(e))
      return;
    this.handleZoom(e.center.x - offset(ReactDOM.findDOMNode(this.rootHammer)).left, -100);
  },
  handlePan(e) {
    if (!this.isEventInPanningArea(e))
      return;
    let start = this.actualStart;
    let end = this.actualEnd;
    let panStartPixel = (e.center.x - e.deltaX) - offset(ReactDOM.findDOMNode(this.rootHammer)).left;
    if (this.panStartPixel !== panStartPixel) {
      this.panStartPixel = panStartPixel;
      this.panStartGenome = [start, end];
    }
    let shiftGenome = (this.scale.invert(0) - this.scale.invert(e.deltaX));
    [start, end] = this.panStartGenome;
    start = start + shiftGenome;
    end = end + shiftGenome;
    if (e.isFinal) {
      if (Math.abs(e.velocityX) > 0.5) {
        let velGenome = (this.scale.invert(e.velocityX) - this.scale.invert(0));
        start = start - velGenome * 1000;
        end = end - velGenome * 1000;
        this.nextSpringConfig = FLING_SPRING;
      }
      [start, end] = this.scaleClamp(start, end, 0.5);
      this.panStartPixel = null;
    } else {
      let endValue = {
        mid: {val: (end + start) / 2, config: NO_SPRING},
        halfWidth: {val: (end - start) / 2, config: NO_SPRING}
      };
      this.refs.spring.setState({
        currValue: endValue,
        currVelocity: {mid: {val: 0}, halfWidth: {val: 0}}
      });
      this.nextSpringConfig = NO_SPRING;

    }
    this.props.componentUpdate({start: start, end: end});
  },

  handleChangeLoadStatus(status) {
    if (status === 'LOADING')
      this.loading += 1;
    if (status === 'DONE')
      this.loading -= 1;
    this.setState({loading: this.loading});
  },

  render() {
    let settings = this.config.genome;
    let {start, end, sideWidth, chromosome, channels} = this.props;
    chromosome = chromosome || this.defaultChrom;
    let {loading} = this.state;
    if (!_has(this.config.chromosomes, chromosome))
      console.log('Unrecognised chromosome in genome browser', chromosome);
    let {width, height, springConfig} = this.state;
    width = Math.max(0, width - scrollbarSize());
    this.scale = d3.scale.linear().domain([start, end]).range([sideWidth, width]);
    let pixelWidth = (end - start) / (width - sideWidth);
    //Animate by middle and width for better experience
    let initTargetPos = {
      mid: (end + start) / 2,
      halfWidth: (end - start) / 2
    };
    let targetPos = {
      mid: spring(initTargetPos.mid, springConfig),
      halfWidth: spring(initTargetPos.halfWidth, springConfig)
    };
    return (
      <DetectResize onResize={(size) => this.setState(size)}>
        <div className="genome-browser">
          <div className="control-bar">
            <LoadingIndicator width={sideWidth - 20} animate={loading > 0}/>
            <Controls {...this.props} chromosome={chromosome} minWidth={MIN_WIDTH}/>
          </div>
          <Hammer
            ref={(c) => this.rootHammer = c}
            onDoubleTap={this.handleDoubleTap}
            onPan={this.handlePan}
            direction={Hammer.DIRECTION_VERTICAL}
            onPinch={(e) => console.log('Pinch not implemented', e)}
            onWheel={this.handleMouseWheel}
          >
            <div className="main-area">
              <Motion ref="spring"
                      style={targetPos}
                      defaultStyle={initTargetPos}>
                {(interpolated) => {
                  start = interpolated.mid - interpolated.halfWidth;
                  end = interpolated.mid + interpolated.halfWidth;
                  //Round to nearest pixel to stop unneeded updates
                  start = Math.round(start / pixelWidth) * pixelWidth;
                  end = Math.round(end / pixelWidth) * pixelWidth;
                  this.actualStart = start;
                  this.actualEnd = end;
                  let trackProps = {
                    chromosome: chromosome,
                    start: start,
                    end: end,
                    width: width,
                    sideWidth: sideWidth,
                    onChangeLoadStatus: this.handleChangeLoadStatus
                  };
                  return (
                    <div className="tracks vertical stack">
                      <Background start={start} end={end} width={width} height={Math.max(0, height - CONTROLS_HEIGHT)}
                                  sideWidth={sideWidth}/>

                      <div className="fixed">
                        <GenomeScale start={start} end={end}
                                     width={width} sideWidth={sideWidth}/>
                        { settings.refSequenceSumm && false ?
                          <ReferenceSequence {...trackProps}/> :
                          null }
                        { settings.annotation ?
                          <AnnotationChannel {...trackProps} /> :
                          null }
                      </div>
                      <div className="scrolling grow scroll-within">
                        {channels.map((channel, channelId) => {
                          let props = channel.get('props');
                          return React.createElement(dynamicRequire(channel.get('channel')),
                               Object.assign({
                                 key: channelId,
                                 onClose: () =>
                                   this.redirectedProps.componentUpdate((props) =>
                                     props.deleteIn(['channels', channelId])),
                                 componentUpdate: (updater) => this.redirectedProps.componentUpdate((props) => {
                                   if (_isFunction(updater))
                                     return props.updateIn(['channels', channelId, 'props'], updater);
                                   else
                                    return props.mergeIn(['channels', channelId, 'props'], updater);
                                 })
                               }, props.toObject(), trackProps));
                        }
                        ).toList()
                        }
                      </div>
                    </div>
                  );
                }}
              </Motion>
            </div>
          </Hammer>
        </div>
      </DetectResize>
    );
  }
});

module.exports = GenomeBrowser;


