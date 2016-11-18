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
import _filter from 'lodash/filter';
import QueryString from 'panoptes/QueryString';
import FilterButton from 'panoptes/FilterButton';

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
    table: React.PropTypes.string, //If specified limits choices in add/remove and enables query picking
    query: React.PropTypes.string, //Only used if table specified
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number,
    children: React.PropTypes.node,
    setProps: React.PropTypes.func,
    childrenHash: React.PropTypes.number  //Perf - passed down to Legend and Side
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
    const {width, sideWidth, start, end} = this.props;
    const rect = e.target.getBoundingClientRect();
    const x = e.center.x - rect.left;
    const y = e.center.y - rect.top;
    const scaleFactor = ((width - sideWidth) / (end - start));
    const windowStart = ((x - 3) / scaleFactor) + start;
    const windowEnd = ((x + 3) / scaleFactor) + start;
    const {summaryWindow} = findBlock({start, end, width});
    const floor = Math.floor((windowStart + 0.5) / summaryWindow) * summaryWindow;
    const ceil = Math.floor((windowEnd + 0.5) / summaryWindow) * summaryWindow;
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

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  render() {
    let {width, sideWidth, children, table, query, childrenHash} = this.props;
    if (table) {
      query = this.getDefinedQuery(query, table);
    }
    children = filterChildren(this, children, ALLOWED_CHILDREN);
    children = React.Children.map(children,
          (child) => React.cloneElement(child, {
            ...this.props,
            width: width - sideWidth,
            colour: child.props.colour || this.tableConfig().propertiesById[child.props.track].colour || colourFunc(child.props.track),
            query: table ? query : undefined
          }));
    return (
      <CanvasGroupChannel onTap={this.handleTap} {...this.props}
                          side={<Side {...this.props} setProps={this.redirectedProps.setProps} query={query}>
                            {children}
                            </Side>}
                          onClose={this.redirectedProps.onClose}
                          controls={<NumericalTrackGroupControls {...this.props}
                                                                 setProps={this.redirectedProps.setProps}
                                                                 query={query} />}
                          legend={<Legend childrenHash={childrenHash} setProps={this.redirectedProps.setProps}>
                                    {children}
                                  </Legend>}
        >
        {children}
      </CanvasGroupChannel>
    );
  }
});

let Side = React.createClass({
  mixins: [
    FluxMixin,
    ConfigMixin,
    PureRenderWithRedirectedProps({
      check: [
        'table',
        'query',
        'childrenHash'
      ],
      redirect: [
        'setProps'
      ]
    })
  ],
  render() {
    let {children, query, table} = this.props;
    children = React.Children.toArray(children);
    let trackNames = ValidComponentChildren.map(children, (child, i) =>
      <LegendElement
        key={child.props.track}
        name={child.props.track}
        colour={child.props.colour}
        onPickColour={(colour) =>
          this.redirectedProps.setProps(
            (props) => props.setIn(['children', i, 'props', 'colour'], colour)
          )
        }

    />);
    if (trackNames.length > 3) {
      let n = trackNames.length;
      trackNames = trackNames.slice(0,2).concat(<div>+ {n-2} more</div>)
    }
    return <div>
      <div>{((query !== SQL.nullQuery) && table ? 'Filtered ' : '') + (table ? this.tableConfig().capNamePlural+':' : '')}</div>
      <div>{trackNames}</div>
    </div>;
  }

});

let Legend = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'childrenHash'
      ],
      redirect: [
        'setProps'
      ]
    })
  ],

  render() {
    return <div className="legend">
      <div className="legend-element">Tracks:</div>
      {React.Children.map(this.props.children,
        (child, i) => <LegendElement
          key={child.props.track}
          name={child.props.track}
          colour={child.props.colour}
          onPickColour={(colour) =>
            this.redirectedProps.setProps(
              (props) => props.setIn(['children', i, 'props', 'colour'], colour)
            )
          }
        />)}
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
        'childrenHash',
        'query'
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
    query: React.PropTypes.string,
    children: React.PropTypes.node
  },

  trackGroups() {
    const {table} = this.props;
    let trackGroups = {};
    _forEach(this.config.tables, (iTable) => {
      if (iTable.id === table || !table) {
        trackGroups[iTable.id] = {
          name: iTable.capNamePlural,
          icon: iTable.icon,
        };
        let propertiesByPropertyGroupId = {};
        //_UNGROUPED_ items will be placed above groups in the picker
        let undefinedPropertyGroupId = '_UNGROUPED_';
        _forEach(
          _filter(iTable.properties,
            (prop) => prop.showInBrowser &&
              prop.id !== iTable.chromosome &&
              prop.id !== iTable.position &&
              prop.isNumerical &&
              !prop.isCategorical),
            (prop) => {
              let definedPropertyGroupId = prop.groupId !== undefined ? prop.groupId : undefinedPropertyGroupId;
              // If this propertyGroup hasn't been created yet, create it.
              if (!propertiesByPropertyGroupId.hasOwnProperty(definedPropertyGroupId)) {
                propertiesByPropertyGroupId[definedPropertyGroupId] = {
                  name: iTable.propertyGroupsById[definedPropertyGroupId].name,
                  items: {}
                };
              }
              propertiesByPropertyGroupId[definedPropertyGroupId].items[prop.id] = {
                name: prop.name,
                description: prop.description,
                icon: prop.icon,
                payload: serialiseComponent(
                  <NumericalSummaryTrack name={prop.name} table={iTable.id} track={prop.id}/>
                )
              };
          });
        trackGroups[iTable.id].itemGroups = propertiesByPropertyGroupId;
      }
    });
    return trackGroups;
  },


  handleTrackChange(tracks) {
    this.getFlux().actions.session.modalClose();
    this.redirectedProps.setProps((props) => props.set('children', Immutable.List(tracks)));
  },

  handleQueryPick(query) {
    this.redirectedProps.setProps({query});
  },


  render() {
    let {autoYScale, yMin, yMax, children, table, query} = this.props;

    let actions = this.getFlux().actions;

    return (
      <div className="channel-controls">
        <div className="control-group">
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
                            itemGroupId: this.config.tablesById[child.props.table].propertiesById[child.props.track].groupId || '_UNGROUPED_',
                            itemId: child.props.track,
                          }))}
                          onPick={this.handleTrackChange}
                        />)}
            />
          </div>
        </div>
        <div className="control-group">
          {table ? <div className="control">
            <QueryString prepend="Filter:" table={table} query={query} />
          </div> : null}
          {table ? <div className="control">
            <FilterButton table={table} query={query} onPick={this.handleQueryPick}/>
          </div> : null}
        </div>
        <div className="control-group">
          <div className="control">
            <div className="label">Auto Y Scale:</div>
            <Checkbox
              name="autoYScale"
              value="toggleValue1"
              checked={autoYScale}
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

      </div>
    );
  }

});


export default NumericalTrackGroupChannel;
