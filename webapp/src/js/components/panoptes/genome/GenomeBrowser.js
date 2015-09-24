const React = require('react');
const offset = require("bloody-offset");
const PureRenderMixin = require('mixins/PureRenderMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const SetSizeToParent = require('mixins/SetSizeToParent');

const ImmutablePropTypes = require('react-immutable-proptypes');
const Hammer = require('react-hammerjs');
const Spring = require('react-motion').Spring;

const GenomeScale = require('panoptes/genome/GenomeScale');
import 'genomebrowser.scss';

const DEFAULT_SPRING = [160, 30];
const FLING_SPRING = [60, 15];
const NO_SPRING = [2000,80];
const MIN_WIDTH = 100;

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
    this.last_start = this.props.start;
    this.last_end = this.props.end;
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
    this.last_start = this.props.start;
    this.last_end = this.props.end;
    this.actual_start = this.props.start;
    this.actual_end = this.props.end;
  },

  scaleClamp(start, end, fracPos) {
    let min = 0;
    let max = 1000000;
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
    this.handleZoom(e.clientX - offset(e.currentTarget).left, e.deltaY)
  },
  handleDoubleTap(e) {
    this.handleZoom(e.center.x - offset(this.hammer.getDOMNode()).left, -100)
  },
  handlePan(e) {
    let start = this.actual_start;
    let end = this.actual_end;
    let panStartPixel = (e.center.x - e.deltaX) - offset(this.hammer.getDOMNode()).left;
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
        mid: {val: (end+start)/2, config: NO_SPRING},
        halfWidth: {val: (end-start)/2, config: NO_SPRING}
      };
      this.refs.spring.setState({
        currValue: endValue,
        currVelocity: {mid: {val:0}, halfWidth: {val:0}}
      });
      this.nextSpringConfig = NO_SPRING;

    }
    this.props.componentUpdate({start: start, end: end});
  },

  render() {
    let { start, end, sideWidth, chomosome } = this.props;
    let {width, height, springConfig} = this.state;
    this.scale = d3.scale.linear().domain([start, end]).range([sideWidth, width]);
    //Animate middle and with for better experience
    let endValue = {
      mid: {val: (end+start)/2, config: springConfig},
      halfWidth: {val: (end-start)/2, config: springConfig}
    };
    return (
      <Spring ref="spring" key="spring"
              endValue={endValue}
              defaultValue={endValue}>
        {(tweens) => {
          start = tweens.mid.val - tweens.halfWidth.val;
          end = tweens.mid.val + tweens.halfWidth.val;
          this.actual_start = start;
          this.actual_end = end;
          return <div key="gb"
                      className="genome-browser">
            <Hammer
              ref={(c) => this.hammer = c}
              onDoubleTap={this.handleDoubleTap}
              onPan={this.handlePan}
              onPinch={(e) => console.log('2',e)}
              >
              <div className="vertical stack tracks"
                   onWheel={this.handleMouseWheel}>
                <GenomeScale start={start} end={end} width={width} sideWidth={sideWidth}/>

                <div>Other stuff</div>
              </div>
            </Hammer>
          </div>
        }}
      </Spring>
    );
  }
});

module.exports = GenomeBrowser;
