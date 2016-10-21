import React from 'react';
import Immutable from 'immutable';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _map from 'lodash/map';
import _forEach from 'lodash/forEach';
import _filter from 'lodash/filter';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import serialiseComponent from 'util/serialiseComponent';

import Sidebar from 'react-sidebar';
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
            payload: serialiseComponent(<PerRowIndicatorChannel table={table.id} />)
          }
          ]
        };
        _forEach(table.properties, (prop) => {
          if (prop.showInBrowser && (prop.isCategorical || prop.isBoolean)) {
            groups[table.id].items.push({
              name: prop.name,
              description: prop.description,
              icon: prop.icon,
              payload: serialiseComponent(<CategoricalChannel name={prop.name} table={table.id} track={prop.id} />)
            });
          } else if (prop.showInBrowser && prop.isNumerical) {
            groups[table.id].items.push({
              name: prop.name,
              description: prop.description,
              icon: prop.icon,
              payload: serialiseComponent(<NumericalTrackGroupChannel>
                         <NumericalSummaryTrack name={prop.name} table={table.id} track={prop.id} />
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
              payload: serialiseComponent(<PerRowNumericalChannel name={channel.name} table={table.id} channel={channel.id} />)
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
    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()}
                       description="A browser for exploring the reference genome and per-sample data including coverage and mapping qualities."/>
        <FlatButton label="Add Channels"
                    primary={true}
                    onClick={() => actions.session.modalOpen(<ItemPicker
                      title="Pick channels to be added"
                      itemName="channel"
                      itemVerb="add"
                      groups={this.channelGroups()}
                      onPick={this.handleChannelAdd}
                    />)}/>
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

module.exports = GenomeBrowserWithActions;
