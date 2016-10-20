import React from 'react';
import Immutable from 'immutable';

import _isFinite from 'lodash/isFinite';
import _forEach from 'lodash/forEach';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';

import CanvasGroupChannel from 'panoptes/genome/tracks/CanvasGroupChannel';
import Checkbox from 'material-ui/Checkbox';
import FlatButton from 'material-ui/FlatButton';
import serialiseComponent from 'util/serialiseComponent';
import NumericalSummaryTrack from 'panoptes/genome/tracks/NumericalSummaryTrack';
import filterChildren from 'util/filterChildren';
import ValidComponentChildren from 'util/ValidComponentChildren';
import ItemPicker from 'containers/ItemPicker';

const ALLOWED_CHILDREN = [
  'NumericalSummaryTrack'
];


let NumericalTrackGroupChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'setProps',
        'onClose'
      ]
    })
  ],

  propTypes: {
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number,
    children: React.PropTypes.node,
    setProps: React.PropTypes.func
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
    let {width, sideWidth, children} = this.props;
    children = filterChildren(this, children, ALLOWED_CHILDREN);
    return (
      <CanvasGroupChannel {...this.props}
        side={
          <span>
            {ValidComponentChildren.map(children, (track) => track.props.name).join(', ')}
          </span>
        }
        onClose={this.redirectedProps.onClose}
        controls={<NumericalTrackGroupControls {...this.props} setProps={this.redirectedProps.setProps} />}
        >
        {React.Children.map(children,
          (child) => React.cloneElement(child, {...this.props, width: width - sideWidth}))}
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
        'children'
      ],
      redirect: ['setProps']
    })
  ],

  propTypes: {
    interpolation: React.PropTypes.string,
    tension: React.PropTypes.number,
    autoYScale: React.PropTypes.bool,
    yMin: React.PropTypes.number,
    yMax: React.PropTypes.number,
    setProps: React.PropTypes.func
  },

  trackGroups() {
    let groups = {
    };

    _forEach(this.config.tables, (table) => {
      if (table.hasGenomePositions && !table.isHidden) {
        groups[table.id] = {
          name: table.capNamePlural,
          icon: table.icon,
          items: {}
        };
        _forEach(table.properties, (prop) => {
          if (prop.showInBrowser && prop.isNumerical) {
            groups[table.id].items[prop.id] = {
              name: prop.name,
              description: prop.description,
              icon: 'line-chart',
              payload: serialiseComponent(
                <NumericalSummaryTrack name={prop.name} table={table.id} track={prop.id} />
              )
            };
          }
        });
      }
    });
    return groups;
  },


  handleTrackChange(tracks) {
    this.getFlux().actions.session.modalClose();
    this.redirectedProps.setProps((props) => props.set('children', Immutable.List(tracks)));
  },

  render() {
    let {autoYScale, yMin, yMax, children} = this.props;

    let actions = this.getFlux().actions;

    return (
      <div className="channel-controls">
        <div className="control">
          <FlatButton label="Add/Remove Tracks"
                      primary={true}
                      onClick={() => actions.session.modalOpen(<ItemPicker
                        title="Pick tracks to be displayed"
                        itemName="Numerical track"
                        itemVerb="display"
                        groups={this.trackGroups()}
                        initialSelection={React.Children.map(children, (child) => ({
                          groupId: child.props.table,
                          itemId: child.props.track,
                        }))}
                        onPick={this.handleTrackChange}
                      />)}
          />
        </div>

        <div className="control">
          <div className="label">Auto Y Scale:</div>
          <Checkbox
            name="autoYScale"
            value="toggleValue1"
            defaultChecked={autoYScale}
            style={{width: 'inherit'}}
            onCheck={(e, checked) => this.redirectedProps.setProps({autoYScale: checked})}/>
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
                     this.redirectedProps.setProps({yMin: value});
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
                     this.redirectedProps.setProps({yMax: value});
                 }
                                }/>
        </div>
          : null}

      </div>
    );
  }

});


module.exports = NumericalTrackGroupChannel;


