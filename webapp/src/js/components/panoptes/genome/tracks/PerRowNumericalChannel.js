import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import d3 from 'd3';
import _isFinite from 'lodash/isFinite';
import _map from 'lodash/map';
import _transform from 'lodash/transform';
import _forEach from 'lodash/forEach';


import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';

import SQL from 'panoptes/SQL';
import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import YScale from 'panoptes/genome/tracks/YScale';


import Checkbox from 'material-ui/lib/checkbox';
import DropDownMenu from 'material-ui/lib/DropDownMenu';
import MenuItem from 'material-ui/lib/menus/menu-item';
import Slider from 'material-ui/lib/slider';
import FlatButton from 'material-ui/lib/flat-button';
import {Motion, spring} from 'react-motion';

import findBlocks from 'panoptes/genome/FindBlocks';

let dynreq = require.context('.', true);
const dynamicRequire = (path) => dynreq('./' + path);


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
    PureRenderWithRedirectedProps({redirect: [
      'componentUpdate',
      'onClose'
    ]}),
    ConfigMixin
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
    yMax: React.PropTypes.number,
    query: React.PropTypes.string,
    table: React.PropTypes.string,
    channel: React.PropTypes.string,
    onClose: React.PropTypes.func
  },

  getInitialState() {
    return {};
  },

  getDefaultProps() {
    return {
      interpolation: 'step',
      autoYScale: true,
      tension: 0.5,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial())
    };
  },

  handleYLimitChange({index, dataYMin, dataYMax}) {
    this.setState({[index]: {dataYMin, dataYMax}});
  },

  handleClose() {
    if (this.redirectedProps.onClose)
      this.redirectedProps.onClose();
  },

  render() {
    let height = HEIGHT;
    let {start, end, width, sideWidth, yMin, yMax, autoYScale, table, channel} = this.props;

    if (autoYScale) {
      let [allDataYMin, allDataYMax] = [null, null];
      _map(this.state, ({dataYMin, dataYMax}) => {
        if (allDataYMin === null || (dataYMin && dataYMin < allDataYMin))
          allDataYMin = dataYMin;
        if (allDataYMax === null || (dataYMax && dataYMax > allDataYMax))
          allDataYMax = dataYMax;
      });
      if (_isFinite(allDataYMin) && _isFinite(allDataYMax)) {
        yMin = allDataYMin;
        yMax = allDataYMax;
      }
    }

    //If we go to a region with no data then don't move the y axis
    if (!_isFinite(yMin) && this.lastYMin)
      yMin = this.lastYMin;
    if (!_isFinite(yMax) && this.lastYMax)
      yMax = this.lastYMax;
    [this.lastYMin, this.lastYMax] = [yMin, yMax];

    if (width === 0)
      return null;

    let effWidth = width - sideWidth;
    let scale = d3.scale.linear().domain([start, end]).range([0, effWidth]);
    let stepWidth = scale(1) - scale(0);
    let offset = scale(0) - scale(start - 1 / 2);

    let initYAxisSpring = {
      yMin: _isFinite(yMin) ? yMin : null,
      yMax: _isFinite(yMax) ? yMax : null
    };
    let yAxisSpring = {
      yMin: spring(initYAxisSpring.yMin),
      yMax: spring(initYAxisSpring.yMax)
    };

    let [[block1Start, block1End], [block2Start, block2End]] = findBlocks(start, end);
    //If we already are at an acceptable block then don't change it!
    if (!((this.blockEnd === block1End && this.blockStart === block1Start) ||
      (this.blockEnd === block2End && this.blockStart === block2Start))) {
      //Current block was acceptable so choose best one
      this.blockStart = block1Start;
      this.blockEnd = block1End;
    }

    let blockPixelWidth = (((width - sideWidth) / 2) / (end - start)) * (this.blockEnd - this.blockStart);
    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={HEIGHT}
        sideComponent={
          <div className="side-name">
            {this.config.tables[table].tableBasedSummaryValues[channel].trackname}
          </div>
        }
        //Override component update
        configComponent={<Controls {...this.props}
                                   componentUpdate={this.redirectedProps.componentUpdate}/>}
        onClose={this.handleClose}

      >
        <svg className="numerical-channel" width={effWidth} height={height}>
          <Motion style={yAxisSpring} defaultStyle={initYAxisSpring}>
            {(interpolated) => {
              let {yMin, yMax} = interpolated;
              return <g>
                <YScale min={yMin} max={yMax} width={effWidth} height={height}/>
                <g
                  transform={_isFinite(yMin) && _isFinite(yMax) ? `translate(${offset}, ${height + (yMin * (height / (yMax - yMin)))}) scale(${stepWidth},${-(height / (yMax - yMin))})` : ''}>
                  <rect className="origin-shifter" x={-effWidth} y={-height} width={2 * effWidth}
                        height={2 * height}/>
                </g>
              </g>;
            }}
          </Motion>
        </svg>
      </ChannelWithConfigDrawer>);
  }
});


let Controls = React.createClass({
  mixins: [
    FluxMixin,
    PureRenderWithRedirectedProps({
      check: [
        'interpolation',
        'tension',
        'autoYScale',
        'yMin',
        'yMax',
        'table',
        'query'
      ],
      redirect: ['componentUpdate']
    })
  ],

  handleQueryPick(query) {
    this.getFlux().actions.session.modalClose();
    this.redirectedProps.componentUpdate({query});
  },

  render() {
    let {interpolation, tension, autoYScale, yMin, yMax, query, table} = this.props;
    let actions = this.getFlux().actions;
    return (
      <div className="channel-controls">
        <div className="control">
          <FlatButton label="Change Filter"
                      primary={true}
                      onClick={() => actions.session.modalOpen('containers/QueryPicker',
                      {
                        table: table,
                        initialQuery: query,
                        onPick: this.handleQueryPick
                      })}/>
        </div>
        <div className="control">
          <div className="label">Interpolation:</div>
          <DropDownMenu className="dropdown"
                        value={interpolation}
                        onChange={(e, i, v) => this.redirectedProps.componentUpdate({interpolation: v})}>
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
                    onChange={(e, value) => this.redirectedProps.componentUpdate({tension: value})}/>
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
            onCheck={(e, checked) => this.redirectedProps.componentUpdate({autoYScale: checked})}/>
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
                     this.redirectedProps.componentUpdate({yMin: value});
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
                     this.redirectedProps.componentUpdate({yMax: value});
                 }
                                }/>
        </div>
          : null}

      </div>
    );
  }

});


module.exports = NumericalChannel;


