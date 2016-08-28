import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';

import _isFinite from 'lodash/isFinite';
import _forEach from 'lodash/forEach';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';

import CanvasGroupChannel from 'panoptes/genome/tracks/CanvasGroupChannel';
import Checkbox from 'material-ui/Checkbox';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import Slider from 'material-ui/Slider';
import FlatButton from 'material-ui/FlatButton';

let dynreq = require.context('.', true);
const dynamicRequire = (path) => dynreq('./' + path);

let NumericalTrackGroupChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'componentUpdate',
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
      autoYScale: true,
    };
  },

  render() {
    let {tracks, width, sideWidth} = this.props;

    return (
      <CanvasGroupChannel {...this.props}
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
            {width: width - sideWidth},
            track.get('props').toObject(),
          {
            key: index
          }
          ))
        )}
      </CanvasGroupChannel>
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

  propTypes: {
    interpolation: React.PropTypes.string,
    tension: React.PropTypes.number,
    autoYScale: React.PropTypes.bool,
    yMin: React.PropTypes.number,
    yMax: React.PropTypes.number,
    tracks: ImmutablePropTypes.listOf(
      ImmutablePropTypes.contains({
        track: React.PropTypes.string.isRequired,
        props: ImmutablePropTypes.map
      }))
  },

  trackGroups() {
    let groups = {
      __reference__: {
        name: 'Reference',
        icon: 'bitmap:genomebrowser.png',
        items: {}
      }
    };

    _forEach(this.config.tables, (table) => {
      if (table.hasGenomePositions && !table.isHidden) {
        groups[table.id] = {
          name: table.capNamePlural,
          icon: table.icon,
          items: {}
        };
        _forEach(table.properties, (prop) => {
          if (prop.showInBrowser && prop.isNumerical && prop.summaryValues) {
            groups[table.id].items[prop.id] = {
              name: prop.name,
              description: prop.description,
              icon: 'line-chart',
              payload: {
                track: 'NumericalSummaryTrack',
                name: prop.name,
                props: {
                  table: table.id,
                  track: prop.id
                }
              }
            };
          }
        });
      }
    });
    return Immutable.fromJS(groups);
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
      groupId: track.getIn(['props', 'table']),
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
                          groups: this.trackGroups(),
                          initialSelection: tracks,
                          onPick: this.handleTrackChange
                        })}/>
        </div>

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


