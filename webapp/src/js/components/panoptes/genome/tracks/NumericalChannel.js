import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import d3 from 'd3';
import _isFinite from 'lodash/isFinite';


import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import NumericalTrack from 'panoptes/genome/tracks/NumericalTrack';

import Checkbox from 'material-ui/lib/checkbox';
import DropDownMenu from 'material-ui/lib/DropDownMenu';
import MenuItem from 'material-ui/lib/menus/menu-item';
import Slider from 'material-ui/lib/slider';
import {Motion, spring} from 'react-motion';

import findBlocks from 'panoptes/genome/FindBlocks';

const HEIGHT = 100;
const INTERPOLATIONS = [
  {payload: 'linear', text: 'Linear'},
  {payload: 'step', text: 'Step'},
  {payload: 'basis', text: 'Basis'},
  {payload: 'bundle', text: 'Bundle'},
  {payload: 'cardinal', text: 'Cardinal'},
  {payload: 'monotone', text: 'Monotone'}
];
const INTERPOLATION_HAS_TENSION = {
  cardinal: true
};

let NumericalChannel = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    sideWidth: React.PropTypes.number.isRequired,
    interpolation: React.PropTypes.string,
    autoYScale: React.PropTypes.bool,
    tension: React.PropTypes.number,
    yMin: React.PropTypes.number,
    yMax: React.PropTypes.number
  },

  getInitialState() {
    return {
      dataYMin: null,
      dataYMax: null
    };
  },

  getDefaultProps() {
    return {
      interpolation: 'step',
      autoYScale: true,
      tension: 0.5
    };
  },

  handleYLimitChange({dataYMin, dataYMax}) {
    this.setState({dataYMin, dataYMax});
  },


  render() {
    let height = HEIGHT;
    let config = this.config.summaryValues.__reference__.uniqueness;
    let props = Object.assign({
      yMin: config.minval,
      yMax: config.maxval
    }, this.props);
    let {start, end, width, sideWidth, yMin, yMax, autoYScale} = props;
    let {dataYMin, dataYMax} = this.state;
    if (autoYScale && _isFinite(dataYMin) && _isFinite(dataYMax) && dataYMin !== 0 && dataYMax !== 0) {
      yMin = dataYMin;
      yMax = dataYMax;
    }

    if (width === 0)
      return null;

    let effWidth = width - sideWidth;
    let scale = d3.scale.linear().domain([start, end]).range([0, effWidth]);
    let stepWidth = scale(1) - scale(0);
    let offset = scale(0) - scale(start - 1 / 2);

    let yAxisSpring = {
      yMin: spring(yMin),
      yMax: spring(yMax)
    };

    let [[block1Start, block1End], [block2Start, block2End]] = findBlocks(start, end);
    //If we already are at an acceptable block then don't change it!
    if (!((this.blockEnd === block1End && this.blockStart === block1Start) ||
      (this.blockEnd === block2End && this.blockStart === block2Start))) {
      //Current block was acceptable so choose best one
      this.blockStart = block1Start;
      this.blockEnd = block1End;
    }

    let blockPixelWidth = ((width - sideWidth / 2) / (end - start)) * (this.blockEnd - this.blockStart);
    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={HEIGHT}
        sideComponent={<div className="side-name"> Uniqueness</div>}
        configComponent={<Controls {...props} />}

      >
        <svg className="numerical-summary" width={effWidth} height={height}>
          <Motion style={yAxisSpring} defaultStyle={yAxisSpring}>
            {(interpolated) => {
              let {yMin, yMax} = interpolated;
              return <g
                style={{transform: `translate(${offset}px, ${height + (yMin * (height / (yMax - yMin)))}px) scale(${stepWidth},${-(height / (yMax - yMin))})`}}>
                <rect className="origin-shifter" x={-effWidth} y={-height} width={2 * effWidth}
                      height={2 * height}/>
                <NumericalTrack blockStart={this.blockStart} blockEnd={this.blockEnd}
                                blockPixelWidth={blockPixelWidth}
                                onYLimitChange={this.handleYLimitChange} {...this.props}
                />
              </g>;
            }}
          </Motion>
        </svg>
      </ChannelWithConfigDrawer>);
  }
});


let Controls = React.createClass({

  //As component update is an anon func, it looks different on every prop change,
  //so skip it when checking
  shouldComponentUpdate(nextProps) {
    return [
      'interpolation',
      'tension',
      'autoYScale',
      'yMin',
      'yMax'].some((name) => this.props[name] !== nextProps[name]);
  },

  //Then we need to redirect componentUpdate so we always use the latest as
  //render might not have been called if only componentUpdate changed
  componentUpdate() {
    this.props.componentUpdate.apply(this, arguments);
  },

  render() {
    let {interpolation, tension, autoYScale, yMin, yMax} = this.props;
    return (
      <div className="channel-controls">
        <div className="control">
          <div className="label">Interpolation:</div>
          <DropDownMenu className="dropdown"
                        value={interpolation}
                        onChange={(e, i, v) => this.componentUpdate({interpolation: v})}>
            {INTERPOLATIONS.map((interpolation) =>
              <MenuItem key={interpolation.payload} value={interpolation.payload} primaryText={interpolation.text}/>)}
          </DropDownMenu>
        </div>
        {INTERPOLATION_HAS_TENSION[interpolation] ?
          <div className="control">
            <div className="label">Tension:</div>
            <Slider className="slider"
                    style={{marginBottom: '0', marginTop: '0'}}
                    name="tension"
                    value={tension}
                    defaultValue={tension}
                    onChange={(e, value) => this.componentUpdate({tension: value})}/>
          </div>
          : null
        }

        <div className="control">
          <div className="label">Auto Y Scale:</div>
          <Checkbox
            name="autoYScale"
            value="toggleValue1"
            defaultChecked={autoYScale}
            style={{width: 'inherit'}}
            onCheck={(e, checked) => this.componentUpdate({autoYScale: checked})}/>
        </div>
        {!autoYScale ? <div className="control">
          <div className="label">Y Min:</div>
          <input className="numeric-input"
                 ref="yMin"
                 type="number"
                 value={yMin}
                 onChange={() => {
                   let value = parseFloat(this.refs.yMin.value);
                   if (_isFinite(value))
                     this.componentUpdate({yMin: value});
                 }
                                }/>
        </div>
          : null}
        {!autoYScale ? <div className="control">
          <div className="label">Y Max:</div>
          <input className="numeric-input"
                 ref="yMax"
                 type="number"
                 value={yMax}
                 onChange={this.handleRangeChange}
                 onChange={() => {
                   let value = parseFloat(this.refs.yMax.value);
                   if (_isFinite(value))
                     this.componentUpdate({yMax: value});
                 }
                                }/>
        </div>
          : null}

      </div>
    );
  }

});


module.exports = NumericalChannel;


