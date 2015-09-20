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

  handleZoom(pos, delta) {
    let { start, end, sideWidth} = this.props;
    let { width } = this.state;
    let scale = d3.scale.linear().domain([start, end]).range([sideWidth, width]);
    let scaleFactor = (delta > 0) ?
    1.0 / (1.0 + 0.04 * Math.abs(delta)) :
    1.0 + 0.04 * Math.abs(delta);
    pos = (pos != undefined) ? scale.invert(pos) : start + ((end - start) / 2);
    var frac_x = (pos - start) / (end - start);
    var new_width = (end - start) / scaleFactor;
    this.props.componentUpdate({start: pos - (new_width * frac_x), end: pos + (new_width * (1 - frac_x))});
  },

  handleMouseWheel(e) {
    this.handleZoom(e.clientX - offset(e.currentTarget).left, e.deltaY)
  },

  render() {
    let { start, end, sideWidth, chomosome } = this.props;
    let {width, height} = this.state;
    return (
      <Spring endValue={{start: {val: start}, end: {val: end}}}>
        {tweens => {
          let start = tweens.start.val;
          let end = tweens.end.val;
          return <div className="genome-browser">
            <div> Controls?</div>
            <Hammer
              onDoubleTap={(e) => console.log('t',e)}
              onPan={(e) => console.log('p',e)}
              onSwipe={(e) => console.log('s',e)}
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
