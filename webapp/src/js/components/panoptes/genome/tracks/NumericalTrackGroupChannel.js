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
import {findBlock} from 'util/PropertyRegionCache';
import SQL from 'panoptes/SQL';
import DataTableWithActions from 'containers/DataTableWithActions';
import {categoryColours} from 'util/Colours';
import LegendElement from 'panoptes/LegendElement';

const ALLOWED_CHILDREN = [
  'NumericalSummaryTrack'
];
const colourFunc = categoryColours('__default__');

let NumericalTrackGroupChannel = React.createClass({
  mixins: [
    FluxMixin,
    ConfigMixin,
    PureRenderWithRedirectedProps({
      redirect: [
        'setProps',
        'onClose'
      ]
    })
  ],

  propTypes: {
    width: React.PropTypes.number,
    name: React.PropTypes.string,
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

  handleTap(e) {
    const {width, sideWidth, start, end, chromosome} = this.props;
    const rect = e.target.getBoundingClientRect();
    const x = e.center.x - rect.left;
    const y = e.center.y - rect.top;
    const scaleFactor = ((width - sideWidth) / (end - start));
    const windowStart = ((x-3) / scaleFactor) + start;
    const windowEnd = ((x+3) / scaleFactor) + start;
    const {summaryWindow} = findBlock({start, end, width});
    const floor = Math.floor((windowStart+0.5)/summaryWindow) * summaryWindow;
    const ceil = Math.floor((windowEnd+0.5)/summaryWindow) * summaryWindow;
    const toOpen = {};
    React.Children.forEach(this.props.children, (child) => {
      if (child.props.table && child.props.track) {
        toOpen[child.props.table] = toOpen[child.props.table] || [];
        toOpen[child.props.table].push(child.props.track)
      }
    });

    _forEach(toOpen, (columns, table) => {
      const config = this.config.tablesById[table];
      const query = SQL.WhereClause.encode(SQL.WhereClause.AND([
        SQL.WhereClause.CompareFixed(config.chromosome, '=', this.props.chromosome),
        SQL.WhereClause.CompareFixed(config.position, '<=', ceil),
        SQL.WhereClause.CompareFixed(config.position, '>=', floor)
      ]));
      this.flux.actions.session.popupOpen(<DataTableWithActions
        table={table}
        columns={[config.primKey].concat(columns)}
        query={query}
      />);
    });
  },

  render() {
    let {width, sideWidth, children, name} = this.props;
    children = filterChildren(this, children, ALLOWED_CHILDREN);
    return (
      <CanvasGroupChannel onTap={this.handleTap} {...this.props}
        side={name ? name : ValidComponentChildren.map(children, (child) =>
              <div style={{whiteSpace: 'nowrap'}}>
                <i className="fa fa-square" style={{color:child.props.colour || colourFunc(child.props.track)}}/>
                {child.props.track}<br/>
              </div>
        )}
        onClose={this.redirectedProps.onClose}
        controls={<NumericalTrackGroupControls {...this.props} setProps={this.redirectedProps.setProps} />}
        legend={<Legend>{children}</Legend>}
        >
        {React.Children.map(children,
          (child) => React.cloneElement(child, {
            ...this.props,
            width: width - sideWidth,
            colour: child.props.colour || colourFunc(child.props.track)}))}
      </CanvasGroupChannel>
    );
  }
});

let Legend = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'children'
      ],
    })
  ],

  render() {
    return <div className="legend">
      <div className="legend-element">Tracks:</div>
      {React.Children.map(this.props.children,
          (child) => <LegendElement
            key={child.props.track}
            name={child.props.track}
            colour={child.props.colour || colourFunc(child.props.track)} />)}
    </div>
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
    setProps: React.PropTypes.func,
    children: React.PropTypes.node
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
                        itemName="numerical track"
                        pickVerb="display"
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


export default NumericalTrackGroupChannel;
