const React = require('react');
const offset = require("bloody-offset");
const PureRenderMixin = require('mixins/PureRenderMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const SetSizeToParent = require('mixins/SetSizeToParent');

const ImmutablePropTypes = require('react-immutable-proptypes');
const Hammer = require('react-hammerjs');
const Spring = require('react-motion').Spring;

const GenomeScale = require('panoptes/genome/GenomeScale');
const ReferenceSequence = require('panoptes/genome/ReferenceSequence');
const Background = require('panoptes/genome/Background');
import 'genomebrowser.scss';

const DEFAULT_SPRING = [160, 30];
const FLING_SPRING = [60, 15];
const NO_SPRING = [2000, 80];
const MIN_WIDTH = 50;

const CONTROLS_HEIGHT = 33;

let GenomeBrowser = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    SetSizeToParent
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    components: ImmutablePropTypes.orderedMap,
    sideWidth: React.PropTypes.number
  },

  getInitialState() {
    return {
      springConfig: DEFAULT_SPRING
    }
  },

  componentWillMount() {
    this.panStartPixel = null;
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
    this.actual_start = this.props.start;
    this.actual_end = this.props.end;
  },

  scaleClamp(start, end, fracPos) {
    let {chromosome} = this.props;
    let min = 0;
    let max = this.config.chromosomes[chromosome].len || 10000000;
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
    this.handleZoom(e.center.x - offset(this.root_hammer.getDOMNode()).left, -100)
  },
  handlePan(e) {
    let start = this.actual_start;
    let end = this.actual_end;
    let panStartPixel = (e.center.x - e.deltaX) - offset(this.root_hammer.getDOMNode()).left;
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

  render() {
    console.log(this.config);
    let { settings } = this.config;
    let { start, end, sideWidth, chromosome } = this.props;
    if (!_.has(this.config.chromosomes, chromosome))
      console.log('Unrecognised chromosome in genome browser', chromosome);
    let {width, height, springConfig} = this.state;
    this.scale = d3.scale.linear().domain([start, end]).range([sideWidth, width]);
    let pixelWidth = (end - start) / (width - sideWidth);
    //Animate middle and with for better experience
    let endValue = {
      mid: {val: (end + start) / 2, config: springConfig},
      halfWidth: {val: (end - start) / 2, config: springConfig}
    };
    return (
      <Spring ref="spring"
              endValue={endValue}
              defaultValue={endValue}>
        {(tweens) => {
          start = tweens.mid.val - tweens.halfWidth.val;
          end = tweens.mid.val + tweens.halfWidth.val;
          //Round to nearest pixel to stop unneeded updates
          start = Math.floor(start / pixelWidth) * pixelWidth;
          end = Math.ceil(end / pixelWidth) * pixelWidth;
          this.actual_start = start;
          this.actual_end = end;
          return (
            <div className="genome-browser">
              <div className="controls">
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
                    <Background start={start} end={end} width={width} height={height-CONTROLS_HEIGHT} sideWidth={sideWidth}/>
                    <div className="tracks vertical stack">
                      <div className="fixed">
                        <GenomeScale start={start} end={end} width={width} sideWidth={sideWidth}/>
                        { settings.refSequenceSumm ?
                          <ReferenceSequence start={start} end={end} width={width} sideWidth={sideWidth}/> :
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
      </Spring>
    );
  }
});

module.exports = GenomeBrowser;
