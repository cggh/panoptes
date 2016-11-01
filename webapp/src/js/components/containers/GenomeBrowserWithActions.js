import React from 'react';
import Immutable from 'immutable';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _map from 'lodash/map';
import _forEach from 'lodash/forEach';
import _filter from 'lodash/filter';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import serialiseComponent from 'util/serialiseComponent';
import _isNumber from 'lodash/isNumber';
import _head from 'lodash/head';
import _keys from 'lodash/keys';

import Sidebar from 'react-sidebar';
import Divider from 'material-ui/Divider';
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import GenomeBrowser from 'panoptes/genome/GenomeBrowser';
import PerRowIndicatorChannel from 'panoptes/genome/tracks/PerRowIndicatorChannel';
import CategoricalChannel from 'panoptes/genome/tracks/CategoricalChannel';
import NumericalSummaryTrack from 'panoptes/genome/tracks/NumericalSummaryTrack';
import NumericalTrackGroupChannel from 'panoptes/genome/tracks/NumericalTrackGroupChannel';
import GenotypesChannel from 'panoptes/genome/tracks/GenotypesChannel';
import PerRowNumericalChannel from 'panoptes/genome/tracks/PerRowNumericalChannel';
import ItemPicker from 'containers/ItemPicker';
import FlatButton from 'material-ui/FlatButton';
import scrollbarSize from 'scrollbar-size';
import ListWithActions from 'containers/ListWithActions';
import DataTableWithActions from 'containers/DataTableWithActions';
import SQL from 'panoptes/SQL';

let GenomeBrowserWithActions = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

  propTypes: {
    setProps: React.PropTypes.func,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
  },

  getDefaultProps() {
    return {
      sidebar: true,
    };
  },

  channelGroups() {
    let groups = {};
    //Normal summaries
    _forEach(this.config.tables, (table) => {
      if (table.hasGenomePositions && !table.isHidden) {
        groups[table.id] = {
          name: table.capNamePlural,
          icon: table.icon,
          items: [{
            name: table.capNamePlural,
            description: `Positions of ${table.capNamePlural}`,
            icon: 'arrow-down',
            payload: serialiseComponent(<PerRowIndicatorChannel table={table.id}/>)
          }
          ]
        };
        _forEach(table.properties, (prop) => {
          if (prop.showInBrowser && (prop.isCategorical || prop.isBoolean)) {
            groups[table.id].items.push({
              name: prop.name,
              description: prop.description,
              icon: prop.icon,
              payload: serialiseComponent(<CategoricalChannel name={prop.name} table={table.id} track={prop.id}/>)
            });
          } else if (prop.showInBrowser && prop.isNumerical) {
            groups[table.id].items.push({
              name: prop.name,
              description: prop.description,
              icon: prop.icon,
              payload: serialiseComponent(<NumericalTrackGroupChannel>
                <NumericalSummaryTrack name={prop.name} table={table.id} track={prop.id}/>
              </NumericalTrackGroupChannel>)
            });
          }
        });
      }
    });
    if (this.config.twoDTables.length > 0) {
      groups['_twoD'] = {
        name: 'Genotypes',
        icon: 'bitmap:genomebrowser.png',
        items: _map(_filter(this.config.twoDTables, 'showInGenomeBrowser'), (table) => (
          {
            name: table.namePlural,
            description: table.description,
            icon: 'table',
            payload: serialiseComponent(<GenotypesChannel table={table.id}/>)
          })
        )
      };
    }

    //Per-row based summaries
    _forEach(this.config.visibleTables, (table) => {
      if (table.tableBasedSummaryValues.length > 0) {
        groups[`_per_${table.id}`] = {
          name: `Per ${table.capNameSingle}`,
          icon: table.icon,
          items: _map(table.tableBasedSummaryValuesById, (channel) => (
            {
              name: channel.name,
              description: 'Description needs to be implemented',
              icon: 'line-chart',
              payload: serialiseComponent(<PerRowNumericalChannel name={channel.name} table={table.id}
                                                                  channel={channel.id}/>)
            }
          ))
        };
      }
    });
    return groups;
  },


  icon() {
    return 'bitmap:genomebrowser.png';
  },

  title() {
    return this.props.title || 'Genome Browser';
  },

  handleChannelAdd(newChannels) {
    this.getFlux().actions.session.modalClose();
    this.props.setProps(
      (props) => props.update('children', Immutable.List(),
        (children) => children.concat(newChannels)
      )
    );
  },

  render() {
    let actions = this.getFlux().actions;
    let {sidebar, setProps, ...subProps} = this.props;
    let genomePositionTableButtons = [];
    _forEach(this.config.visibleTables, (table) => {
      if (table.hasGenomePositions || table.isRegionOnGenome) {
        let genomePositionTableButton = (
          <FlatButton key={table.id}
                      label={table.namePlural + ' in view'}
                      primary={true}
                      icon={<Icon fixedWidth={true} name={table.icon}/>}
                      onClick={() => {
                        let {chromosome, start, end} = this.props;
                        //Set default bounds
                        start = _isNumber(start) ? start : 0;
                        end = (_isNumber(end) ? end : this.config.chromosomes[chromosome]) || 10000;
                        chromosome = chromosome || _head(_keys(this.config.chromosomes))
                        let genomePositionTableQuery = null;
                        if (table.hasGenomePositions) {
                          genomePositionTableQuery = SQL.WhereClause.encode(SQL.WhereClause.AND([
                            SQL.WhereClause.CompareFixed(table.chromosome, '=', chromosome),
                            SQL.WhereClause.CompareFixed(table.position, '>=', Math.floor(start)),
                            SQL.WhereClause.CompareFixed(table.position, '<=', Math.ceil(end))
                          ]));
                        } else if (table.isRegionOnGenome) {
                          genomePositionTableQuery = SQL.WhereClause.encode(SQL.WhereClause.AND([
                            SQL.WhereClause.CompareFixed(table.chromosome, '=', chromosome),
                            SQL.WhereClause.CompareFixed(table.regionStart, '<=', Math.ceil(end)),
                            SQL.WhereClause.CompareFixed(table.regionStop, '>=', Math.floor(start))
                          ]));
                        }
                        if (table.listView) {
                          this.flux.actions.session.tabOpen(<ListWithActions table={table.id}
                                                                             query={genomePositionTableQuery}/>, true);
                        } else {
                          this.flux.actions.session.tabOpen(<DataTableWithActions table={table.id}
                                                                                  query={genomePositionTableQuery}/>, true);
                        }

                      }}
          >
          </FlatButton>
        );
        genomePositionTableButtons.push(genomePositionTableButton);
      }
    });
    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()}
                       description="A browser for exploring the reference genome and per-sample data including coverage and mapping qualities."/>
        <FlatButton label="Add Channels"
                    primary={true}
                    icon={<Icon fixedWidth={true} name="plus"/>}
                    onClick={() => actions.session.modalOpen(<ItemPicker
                      title="Pick channels to be added"
                      itemName="channel"
                      itemVerb="add"
                      groups={this.channelGroups()}
                      onPick={this.handleChannelAdd}
                    />)}/>
        <Divider />
        {genomePositionTableButtons}
      </div>
    );
    return (
      <Sidebar
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        docked={sidebar}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrows-h' : 'bars'}
                  onClick={() => setProps({sidebar: !sidebar})}
                  title={sidebar ? 'Expand' : 'Sidebar'}
            />
          </div>
          <GenomeBrowser setProps={setProps} sideWidth={150} {...subProps} />
        </div>
      </Sidebar>
    );
  }
});

export default GenomeBrowserWithActions;
