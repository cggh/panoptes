import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import ReactDOM from 'react-dom';
import offset from 'bloody-offset';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import ConfigMixin from 'mixins/ConfigMixin';
import _has from 'lodash.has';
import _forEach from 'lodash.foreach';
import _head from 'lodash.head';
import _keys from 'lodash.keys';
import {scaleLinear} from 'd3-scale';
import scrollbarSize from 'scrollbar-size';
import ValidComponentChildren from 'util/ValidComponentChildren';
import normalizeWheel from 'normalize-wheel';

import Hammer from 'react-hammerjs';
import {Motion, spring} from 'react-motion';

import GenomeScale from 'panoptes/genome/tracks/GenomeScale';
import LoadingIndicator from 'panoptes/genome/LoadingIndicator';
import Controls from 'panoptes/genome/Controls';
import Background from 'panoptes/genome/Background';
import DetectResize from 'utils/DetectResize';
import 'genomebrowser.scss';
import FluxMixin from 'mixins/FluxMixin';
import filterChildren from 'util/filterChildren';
import _isNumber from 'lodash.isnumber';

const DEFAULT_SPRING = {stiffness: 160, damping: 30};
const FLING_SPRING = {stiffness: 60, damping: 15};
const NO_SPRING = {stiffness: 2000, damping: 80};
const MIN_WIDTH = 5;
const FALLBACK_MAXIMUM = 1000000000;
const CONTROLS_HEIGHT = 33;

let GenomeBrowser = createReactClass({
  displayName: 'GenomeBrowser',

  mixins: [
    PureRenderWithRedirectedProps({redirect: ['setProps']}),
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: PropTypes.func.isRequired,
    chromosome: PropTypes.string.isRequired,
    start: PropTypes.number,
    end: PropTypes.number,
    sideWidth: PropTypes.number.isRequired,
    children: PropTypes.node,
    childrenHash: PropTypes.number
  },

  getDefaultProps() {
    return {
      chromosome: '',
      start: undefined, //Defaults for start and end are set at render time as they are config dependant
      end: undefined,
      sideWidth: 150,
      width: 500
    };
  },

  getInitialState() {
    return {
      springConfig: DEFAULT_SPRING,
      loading: 0,
      width: 0,
      height: 0,
      hoverPos: null
    };
  },

  componentWillMount() {
    this.scrollListeners = [];
    this.loading = 0;
    this.panStartPixel = null;
    this.defaultChrom = _head(_keys(this.config.chromosomes)); //Would be done as defaultProp, but config not avaliable then
  },

  componentDidMount() {
    this.scrollTracks.onscroll = () => {
      this.handleTrackScroll();
    };
    this.componentDidUpdate({});
  },

  componentDidUpdate(prevProps) {
    if (prevProps.childrenHash != this.props.childrenHash) {
      this.handleTrackScroll();
    }
  },

  componentWillReceiveProps(nextProps) {
    //If just switching chrom then reset to full width
    if (nextProps.chromosome !== this.props.chromosome && nextProps.setProps &&
      nextProps.start === this.props.start &&
      nextProps.end === this.props.end
    ) {
      nextProps.setProps({start: 0, end: this.config.chromosomes[nextProps.chromosome] || 10000});
    }
    if (nextProps.chromosome !== this.props.chromosome) {
      this.setState({hoverPos: null});
    }

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
    let max = this.config.chromosomes[chromosome] || FALLBACK_MAXIMUM;
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
    this.props.setProps({start, end}, true);
  },

  handleMouseWheel(e) {
    if (!this.isEventInPanningArea(e))
      return;
    this.handleZoom(e.clientX - offset(e.currentTarget).left, normalizeWheel(e).pixelY);
    e.stopPropagation();
    e.preventDefault();
  },

  handleDoubleTap(e) {
    if (!this.isEventInPanningArea(e))
      return;
    this.handleZoom(e.center.x - offset(ReactDOM.findDOMNode(this.rootHammer)).left, -100); //eslint-disable-line react/no-find-dom-node
  },

  handlePan(e) {
    if (!this.isEventInPanningArea(e))
      return;
    let start = this.actualStart;
    let end = this.actualEnd;
    let panStartPixel = (e.center.x - e.deltaX) - offset(ReactDOM.findDOMNode(this.rootHammer)).left; //eslint-disable-line react/no-find-dom-node
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
      //Commented out as gives unwanted jumps
      // this.refs.spring.setState({
      //   currentStyle: {mid: (end + start) / 2, halfWidth: (end - start) / 2},
      //   currentVelocity: {mid: 0, halfWidth: 0}
      // });
      this.nextSpringConfig = NO_SPRING;
    }
    this.props.setProps({start, end}, true);
  },

  handleChangeLoadStatus(status) {
    if (status === 'LOADING')
      this.loading += 1;
    if (status === 'DONE')
      this.loading -= 1;
    this.setState({loading: this.loading});
  },

  handleTrackScroll() {
    let numTracks = React.Children.count(this.props.children);
    _forEach(this.scrollListeners, (listener, i) => {
      if (i < numTracks && listener && listener.handleScroll) {
        listener.handleScroll(this.scrollTracks);
      }
    });
  },

  handleHover(hoverPos) {
    this.setState({hoverPos});
  },

  convertXY(e) {
    let rect = this.mainArea.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  },

  handleMouseMove(e) {
    if (this.mainArea && !e.hoverHandled) {
      let [x, y] = this.convertXY(e);
      const {sideWidth, start, end} = this.props;
      let {width} = this.state;
      width = Math.max(0, width - scrollbarSize());
      const scaleFactor = (end - start) / (width - sideWidth);
      const hoverPos = Math.round(start + ((x - sideWidth) * scaleFactor));
      this.handleHover(hoverPos);
    }
  },

  handleMouseOver(e) {
    this.handleMouseMove(e);
  },

  handleMouseOut(e) {
    this.handleHover(null);
  },

  render() {
    let {start, end, sideWidth, chromosome, children} = this.props;

    chromosome = chromosome || this.defaultChrom;
    let {loading, hoverPos} = this.state;
    if (!_has(this.config.chromosomes, chromosome))
      console.log('Unrecognised chromosome in genome browser', chromosome);

    //Set default bounds
    start = _isNumber(start) ? start : 0;
    end = (_isNumber(end) ? end : this.config.chromosomes[chromosome]) || 10000;

    let {width, height, springConfig} = this.state;
    width = Math.max(0, width - scrollbarSize());
    this.scale = scaleLinear().domain([start, end]).range([sideWidth, width]);
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
            <Controls {...this.props}  start={start} end={end} chromosome={chromosome} minWidth={MIN_WIDTH}/>
          </div>
          <Hammer
            ref={(c) => this.rootHammer = c}
            onDoubleTap={this.handleDoubleTap}
            onPan={this.handlePan}
            direction={Hammer.DIRECTION_VERTICAL}
            onPinch={(e) => console.log('Pinch not implemented', e)}
            onWheel={this.handleMouseWheel}
          >
            <div ref={(node) => this.mainArea = node} className="main-area">
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
                    chromosome,
                    start,
                    end,
                    width,
                    sideWidth,
                    hoverPos,
                    onChangeLoadStatus: this.handleChangeLoadStatus,
                    onChangeHoverPos: this.handleHover
                  };
                  return (
                    <div className="tracks vertical stack"
                      onMouseMove={this.handleMouseMove}
                      onMouseOver={this.handleMouseOver}
                      onMouseOut={this.handleMouseOut}
                    >
                      <Background start={start} end={end} width={width} height={Math.max(0, height - CONTROLS_HEIGHT)}
                        sideWidth={sideWidth}
                        onChangeHoverPos={this.handleHover}
                        hoverPos={hoverPos}
                      />

                      <div className="fixed">
                        <GenomeScale start={start} end={end}
                          width={width} sideWidth={sideWidth}
                          onChangeHoverPos={this.handleHover}
                          hoverPos={hoverPos}
                        />
                        {children.map(
                          (child, i) => filterChildren(this, child) && child.props.fixed ?
                            React.cloneElement(child, {
                              key: i,
                              onClose: () => this.redirectedProps.setProps((props) => props.deleteIn(['children', i])),
                              ...trackProps
                            }) : null)}
                      </div>
                      <div ref={(node) => this.scrollTracks = node} className="scrolling grow scroll-within">
                        {children.map(
                          (child, i) => filterChildren(this, child) && !child.props.fixed ?
                            React.cloneElement(child, {
                              key: i,
                              onClose: () => this.redirectedProps.setProps((props) => props.deleteIn(['children', i])),
                              ref: (component) => this.scrollListeners[i] = component,
                              ...trackProps
                            }) : null)}
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
  },
});

export default GenomeBrowser;
