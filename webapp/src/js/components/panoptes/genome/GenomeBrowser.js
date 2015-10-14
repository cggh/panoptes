const React = require('react');
const ReactDOM = require('react-dom');
const offset = require("bloody-offset");
const PureRenderMixin = require('mixins/PureRenderMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const SetSizeToParent = require('mixins/SetSizeToParent');

const ImmutablePropTypes = require('react-immutable-proptypes');
const Hammer = require('react-hammerjs');
const { Motion, spring } = require('react-motion');

const GenomeScale = require('panoptes/genome/GenomeScale');
const LoadingIndicator = require('panoptes/genome/LoadingIndicator');
const Controls = require('panoptes/genome/Controls');
const ReferenceSequence = require('panoptes/genome/ReferenceSequence');
const Background = require('panoptes/genome/Background');
import 'genomebrowser.scss';

const DEFAULT_SPRING = [160, 30];
const FLING_SPRING = [60, 15];
const NO_SPRING = [2000, 80];
const MIN_WIDTH = 50;
const FALLBACK_MAXIMUM = 1000000000;
const CONTROLS_HEIGHT = 33;

let GenomeBrowser = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    SetSizeToParent
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    components: ImmutablePropTypes.orderedMap.isRequired,
    sideWidth: React.PropTypes.number.isRequired,
    chromPositions: ImmutablePropTypes.map  //Stores the position on each chrom so you can flick back without losing place
  },

  getInitialState() {
    return {
      springConfig: DEFAULT_SPRING,
      loading: 0
    }
  },

  componentWillMount() {
    this.panStartPixel = null;
    this.validateAndAdjustView(this.props);
  },

  componentWillReceiveProps(nextProps) {
    this.validateAndAdjustView(nextProps);
    if (this.nextSpringConfig) {
      this.setState({springConfig: this.nextSpringConfig});
      this.nextSpringConfig = null;
    } else {
      this.setState({
        springConfig: nextProps.chromosome !== this.props.chromosome ?
          NO_SPRING : DEFAULT_SPRING
      });
    }
    this.actual_start = this.props.start;
    this.actual_end = this.props.end;
  },

  validateAndAdjustView(newProps) {
    let { chromosome, start, end } = newProps;
    let chromChanged = (chromosome !== this.props.chromosome);
    let startChanged = (start !== this.props.start);
    let endChanged =  (end !== this.props.end);
    start = Math.max(start, 0);
    end = Math.min(end, this.config.chromosomes[chromosome].len || FALLBACK_MAXIMUM);
    let frac = 0.5;
    if (startChanged && !endChanged && !chromChanged) {
      frac = 0;
    } if (!startChanged && endChanged && !chromChanged) {
      frac = 1;
    }
    [start, end] = this.scaleClamp(start, end, frac);
    if (start !== newProps.start || end !== newProps.end) {
      newProps.componentUpdate({
        start: start,
        end: end
      });
    }
  },


  scaleClamp(start, end, fracPos) {
    let {chromosome} = this.props;
    let min = 0;
    let max = this.config.chromosomes[chromosome].len || FALLBACK_MAXIMUM;
    if (start <= min && end >= max) {
      start = min;
      end = max;
    }
    else {
      var width = end - start;
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

  handleZoom(pos, delta) {
    let start = this.actual_start;
    let end = this.actual_end;
    let scaleFactor = (delta > 0) ?
    1.0 / (1.0 + 0.04 * Math.abs(delta)) :
    1.0 + 0.04 * Math.abs(delta);
    pos = (pos != undefined) ? this.scale.invert(pos) : start + ((end - start) / 2);
    var frac_x = (pos - start) / (end - start);
    var new_width = (end - start) / scaleFactor;
    start = pos - (new_width * frac_x);
    end = pos + (new_width * (1 - frac_x));
    [start, end] = this.scaleClamp(start, end, frac_x);
    this.props.componentUpdate({start: start, end: end});
  },

  handleMouseWheel(e) {
    this.handleZoom(e.clientX - offset(e.currentTarget).left, e.deltaY);
    e.stopPropagation();
    e.preventDefault();
  },
  handleDoubleTap(e) {
    this.handleZoom(e.center.x - offset(ReactDOM.findDOMNode(this.root_hammer)).left, -100);
  },
  handlePan(e) {
    let start = this.actual_start;
    let end = this.actual_end;
    let panStartPixel = (e.center.x - e.deltaX) - offset(ReactDOM.findDOMNode(this.root_hammer)).left;
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
        let velGenome = (this.scale.invert(0) - this.scale.invert(e.velocityX));
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
      this.setState({loading: this.state.loading + 1});
    if (status === 'DONE')
      this.setState({loading: this.state.loading - 1});
  },

  handleViewChange(chromosome, start, end) {
    this.props.componentUpdate({
      chromosome: chromosome,
      start: start,
      end: end
    })
  },

  render() {
    let { settings } = this.config;
    let { start, end, sideWidth, chromosome } = this.props;
    let { loading } = this.state;
    if (!_.has(this.config.chromosomes, chromosome))
      console.log('Unrecognised chromosome in genome browser', chromosome);
    let {width, height, springConfig} = this.state;
    this.scale = d3.scale.linear().domain([start, end]).range([sideWidth, width]);
    let pixelWidth = (end - start) / (width - sideWidth);
    //Animate middle and with for better experience
    let endValue = {
      mid: spring((end + start) / 2, springConfig),
      halfWidth: spring((end - start) / 2, springConfig)
    };
    return (
      <Motion ref="spring"
              style={endValue}
              defaultStyle={endValue}>
        {(interpolated) => {
          start = interpolated.mid - interpolated.halfWidth;
          end = interpolated.mid + interpolated.halfWidth;
          //Round to nearest pixel to stop unneeded updates
          start = Math.floor(start / pixelWidth) * pixelWidth;
          end = Math.ceil(end / pixelWidth) * pixelWidth;
          this.actual_start = start;
          this.actual_end = end;
          return (
            <div className="genome-browser">
              <div className="control-bar">
                <LoadingIndicator width={sideWidth-20} animate={loading > 0}/>
                <Controls {...this.props} onChange={this.handleViewChange}/>
              </div>
              <Hammer
                ref={(c) => this.root_hammer = c}
                onDoubleTap={this.handleDoubleTap}
                onPan={this.handlePan}
                vertical={true}
                onPinch={(e) => console.log('2',e)}
                onWheel={this.handleMouseWheel}
                >
                <div className="main-area">
                  <Background start={start} end={end} width={width} height={height-CONTROLS_HEIGHT}
                              sideWidth={sideWidth}/>

                  <div className="tracks vertical stack">
                    <div className="fixed">
                      <GenomeScale start={start} end={end}
                                   width={width} sideWidth={sideWidth}/>
                      { settings.refSequenceSumm ?
                        <ReferenceSequence chromosome={chromosome} start={start} end={end}
                                           width={width} sideWidth={sideWidth}
                                           onChangeLoadStatus={this.handleChangeLoadStatus}/> :
                        null }

                    </div>
                    <div className="grow scroll-within">
                    </div>
                  </div>
                </div>
              </Hammer>
            </div>
          )
        }}
      </Motion>
    );
  }
});

module.exports = GenomeBrowser;
