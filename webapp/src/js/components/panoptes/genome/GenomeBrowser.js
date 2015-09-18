const React = require('react');
const offset = require("bloody-offset");
const PureRenderMixin = require('mixins/PureRenderMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const SetSizeToParent = require('mixins/SetSizeToParent');

const ImmutablePropTypes = require('react-immutable-proptypes');

const GenomeScale = require('panoptes/genome/GenomeScale');
import 'genomebrowser.scss';


let GenomeBrowser = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    SetSizeToParent
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func,
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    components: ImmutablePropTypes.orderedMap,
    sideWidth: React.PropTypes.number
  },

  handleMouseWheel(e) {
    let pos = e.clientX - offset(e.currentTarget).left;
    //var scaleFactor  = 1;
    //if (delta < 0)//zoom out
    //  scaleFactor = 1.0 / (1.0 + 0.4 * Math.abs(delta));
    //else//zoom in
    //  scaleFactor = 1.0 + 0.4 * Math.abs(delta);
    ////Use the endpoint of the tween if we have one
    //var left = that.currentTween ? that.currentTarget.left : that.domain()[0];
    //var right = that.currentTween ? that.currentTarget.right : that.domain()[1];
    //pos = (pos != undefined) ? that.invert(pos) : left+((right-left)/2);
    //var frac_x = (pos - left) / (right - left);
    //var new_width = (right - left)/scaleFactor;
    //var target = {left: pos - (new_width*frac_x), right: pos + (new_width*(1-frac_x))};
    //let change = e.deltaY;
    if (change > 0) {

    }
  },

  render() {
    let { start, end, sideWidth, chomosome } = this.props;
    let {width, height} = this.state;
    return (
      <div className="genome-browser">
        <div> Controls?</div>
          <div className="vertical stack tracks"
             onWheel={this.handleMouseWheel}>
          <GenomeScale start={start} end={end} width={width} sideWidth={sideWidth}/>
          <div>Other stuff</div>
        </div>
      </div>
    );
  }

});

module.exports = GenomeBrowser;
