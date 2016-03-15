import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';

import _isFinite from 'lodash/isFinite';
import _forEach from 'lodash/forEach';
import _transform from 'lodash/transform';
import _map from 'lodash/map';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';

import ScaledSVGChannel from 'panoptes/genome/tracks/ScaledSVGChannel';
import Checkbox from 'material-ui/lib/checkbox';
import DropDownMenu from 'material-ui/lib/DropDownMenu';
import MenuItem from 'material-ui/lib/menus/menu-item';
import Slider from 'material-ui/lib/slider';
import FlatButton from 'material-ui/lib/flat-button';

let dynreq = require.context('.', true);
const dynamicRequire = (path) => dynreq('./' + path);


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


let NumericalTrackGroupChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'componentUpdate',
        'onYLimitChange',
        'onClose'
      ]
    })
  ],

  propTypes: {
    tracks: ImmutablePropTypes.listOf(
      ImmutablePropTypes.contains({
        track: React.PropTypes.string.isRequired,
        props: ImmutablePropTypes.map
      }))
  },

  getInitialState() {
    return {};
  },

  getDefaultProps() {
    return {
      interpolation: 'step',
      autoYScale: true,
      tension: 0.5
    };
  },

  componentWillMount() {
    this.yLimits = {};
  },

  handleYLimitChange(index, dataLimits) {
    this.yLimits[index] = dataLimits;
    let allDataYMin = null;
    let allDataYMax = null;
    _map(this.yLimits, ({dataYMin, dataYMax}) => {
      if (!_isFinite(allDataYMin) || (dataYMin && dataYMin < allDataYMin)) {
        allDataYMin = dataYMin;
      }
      if (!_isFinite(allDataYMax) || (dataYMax && dataYMax > allDataYMax)) {
        allDataYMax = dataYMax;
      }
    });
    if (_isFinite(allDataYMin) && _isFinite(allDataYMax)) {
      this.setState({dataYMin: allDataYMin, dataYMax: allDataYMax});
    }
  },

  render() {
    let {tracks} = this.props;
    let {dataYMin, dataYMax} = this.state;

    return (
      <ScaledSVGChannel {...this.props}
        dataYMin={dataYMin}
        dataYMax={dataYMax}
        side={
          <span>
            {tracks.map((track) => track.get('name')).join(', ')}
          </span>
        }
        onClose={this.redirectedProps.onClose}
        controls={<NumericalTrackGroupControls {...this.props} componentUpdate={this.redirectedProps.componentUpdate} />}
        >
        {tracks.map((track, index) => React.createElement(dynamicRequire(track.get('track')), Object.assign(
            {},
            this.props,
            track.get('props').toObject(),
          {
            onYLimitChange: ({dataYMin, dataYMax}) => this.handleYLimitChange(index, {dataYMin, dataYMax}),
            key: index
          }
          ))
        )}
      </ScaledSVGChannel>
    );
  }
});


let NumericalTrackGroupControls = React.createClass({
  mixins: [
    FluxMixin,
    ConfigMixin,
    PureRenderWithRedirectedProps({
      check: [
        'interpolation',
        'tension',
        'autoYScale',
        'yMin',
        'yMax',
        'tracks'
      ],
      redirect: ['componentUpdate']
    })
  ],

  componentWillMount() {
    this.trackGroups = Immutable.Map();
    _forEach(this.config.summaryValues, (properties, groupId) => {
      this.trackGroups = this.trackGroups.set(groupId, Immutable.fromJS({
        name: groupId === '__reference__' ? 'Reference' : this.config.tables[groupId].tableCapNamePlural,
        icon: groupId === '__reference__' ? 'bitmap:genomebrowser.png' : this.config.tables[groupId].icon,
        items: _transform(properties, (result, prop) => {
            //Only numerical tracks can be added
          if (!prop.settings.isCategorical)
            result[prop.propid] = {
              name: prop.name,
              description: prop.description,
              icon: 'line-chart',
              payload: {
                track: 'NumericalSummaryTrack',
                name: prop.name,
                props: {
                  group: groupId,
                  track: prop.propid
                }
              }
            };
        }, {}
        )
      }));
    });
  },


  handleTrackChange(tracks) {
    this.getFlux().actions.session.modalClose();
    tracks = tracks.map((track) => track.get('payload'));
    this.redirectedProps.componentUpdate({tracks});
  },

  render() {
    let {interpolation, tension, autoYScale, yMin, yMax, tracks} = this.props;
    let actions = this.getFlux().actions;
    tracks = tracks.map((track) => Immutable.Map({
      groupId: track.getIn(['props', 'group']),
      itemId: track.getIn(['props', 'track']),
      payload: track
    })
    );
    return (
      <div className="channel-controls">
        <div className="control">
          <FlatButton label="Add/Remove Tracks"
                      primary={true}
                      onClick={() => actions.session.modalOpen('containers/ItemPicker.js',
                        {
                          title: 'Pick tracks to be displayed',
                          itemName: 'Numerical track',
                          itemVerb: 'display',
                          groups: this.trackGroups,
                          initialSelection: tracks,
                          onPick: this.handleTrackChange
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


module.exports = NumericalTrackGroupChannel;


