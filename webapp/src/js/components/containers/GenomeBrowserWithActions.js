import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import Immutable from 'immutable';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import serialiseComponent from 'util/serialiseComponent';

import _map from 'lodash.map';
import _forEach from 'lodash.foreach';
import _filter from 'lodash.filter';
import _isNumber from 'lodash.isnumber';
import _head from 'lodash.head';
import _keys from 'lodash.keys';
import _values from 'lodash.values';

import Sidebar from 'ui/Sidebar';
import Divider from '@material-ui/core/Divider';
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import GenomeBrowser from 'panoptes/genome/GenomeBrowser';
import CategoricalChannel from 'panoptes/genome/tracks/CategoricalChannel';
import NumericalSummaryTrack from 'panoptes/genome/tracks/NumericalSummaryTrack';
import NumericalTrackGroupChannel from 'panoptes/genome/tracks/NumericalTrackGroupChannel';
import GenotypesChannel from 'panoptes/genome/tracks/GenotypesChannel';
import PerRowIndicatorChannel from 'panoptes/genome/tracks/PerRowIndicatorChannel';
import ItemPicker from 'containers/ItemPicker';
import ModalInput from 'ui/ModalInput';
import Button from 'ui/Button';
import {List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core';
import ListSubheader from '@material-ui/core/ListSubheader';
import IconButton from '@material-ui/core/IconButton';
import scrollbarSize from 'scrollbar-size';
import ListWithActions from 'containers/ListWithActions';
import DataTableWithActions from 'containers/DataTableWithActions';
import SQL from 'panoptes/SQL';
import ReferenceSequence from 'panoptes/genome/tracks/ReferenceSequence';
import AnnotationChannel from 'panoptes/genome/tracks/AnnotationChannel';
import deserialiseComponent from 'util/deserialiseComponent';

let GenomeBrowserWithActions = createReactClass({
  displayName: 'GenomeBrowserWithActions',
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

  propTypes: {
    setProps: PropTypes.func,
    title: PropTypes.string,
    sidebar: PropTypes.bool,
    chromosome: PropTypes.string,
    start: PropTypes.number,
    end: PropTypes.number,
    childrenHash: PropTypes.number
  },

  getDefaultProps() {
    return {
      sidebar: true,
    };
  },

  icon() {
    return 'bitmap:genomebrowser.png';
  },

  title() {
    return this.props.title || 'Genome Browser';
  },

  render() {
    let {sidebar, setProps, children, ...subProps} = this.props;
    //Insert an extra child to hint to the user how to add tracks
    children = React.Children.toArray(children);
    if (children.length === 0) {
      this.config.settings.genomeBrowserChannelSets.forEach(({name, description, channels}) => {
        if (name === 'Default') {
          children = channels.map((channel) => deserialiseComponent(Immutable.fromJS(channel), null, {
            setProps: this.props.setProps,
          }));
          return false;
        }
      })
    }
    children.push(<AddChannelMessage key="_ACM_" setProps={this.props.setProps}/>);
    //Add fixed children to the top
    children.push(<ReferenceSequence key="_ref_" fixed/>);
    children.push(<AnnotationChannel key="_annot_" fixed/>);

    return (
      <Sidebar
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        docked={sidebar}
        sidebar={<SidebarContent {...this.props} />}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon
              className="pointer icon"
              name={sidebar ? 'arrow-left' : 'bars'}
              onClick={() => setProps({sidebar: !sidebar})}
              title={sidebar ? 'Expand' : 'Sidebar'}
            />
          </div>
          <div className="grow">
            <GenomeBrowser setProps={setProps} sideWidth={150} {...subProps} >
              {children}
            </GenomeBrowser>
          </div>
        </div>
      </Sidebar>
    );
  },
});

let AddChannelMessage = createReactClass({
  displayName: 'AddChannelMessage',
  mixins: [FluxMixin, ConfigMixin],

  shouldComponentUpdate() {
    return false;
  },

  setProps(u) {  //Redirect setProps so we never need to re-render
    this.props.setProps(u);
  },

  render() {
    return <div className="centering-container"> <div style={{backgroundColor: 'white'}}>
      <AddChannelsButton setProps={this.setProps}/>
      {this.config.settings.genomeBrowserChannelSets.length > 0 ?
        <span> or pick from example channel sets on the sidebar</span>
        : null
      }
    </div></div>;
  },
});


let AddChannelsButton = createReactClass({
  displayName: 'AddChannelsButton',
  mixins: [FluxMixin, ConfigMixin],

  shouldComponentUpdate() {
    return false;
  },

  channelGroups() {
    // NB: table properties (columns) will be grouped by their propertyGroup
    // and assigned to channelGroups[table.id].itemGroups
    // In contrast, twoDTables will be assigned to channelGroups['_2D_tables_'].items
    // tableBasedSummaryValues for each table will be assigned to channelGroups[`_per_${table.id}`].items
    let channelGroups = {};
    //Normal summaries
    _forEach(this.config.tables, (table) => {
      if (table.hasGenomePositions && !table.isHidden) {
        channelGroups[table.id] = {
          name: table.capNamePlural,
          icon: table.icon
        };
        let propertiesByPropertyGroupId = {};
        //_UNGROUPED_ items will be placed above groups in the picker
        let undefinedPropertyGroupId = '_UNGROUPED_';
        _forEach(
          _filter(table.properties, (prop) => prop.showInBrowser && prop.id !== table.chromosome && prop.id !== table.position),
          (prop) => {
            let definedPropertyGroupId = prop.groupId !== undefined ? prop.groupId : undefinedPropertyGroupId;
            // If this propertyGroup hasn't been created yet, create it.
            if (!propertiesByPropertyGroupId.hasOwnProperty(definedPropertyGroupId)) {
              propertiesByPropertyGroupId[definedPropertyGroupId] = {
                name: table.propertyGroupsById[definedPropertyGroupId].name,
                items: []
              };
            }
            if (prop.isCategorical || prop.isBoolean) {
              // If this property is showInBrowser and either categorical or boolean,
              // then add it with a CategoricalChannel component payload.
              propertiesByPropertyGroupId[definedPropertyGroupId].items.push({
                name: prop.name,
                description: prop.description,
                icon: prop.icon,
                payload: serialiseComponent(<CategoricalChannel table={table.id} track={prop.id}/>)
              });

            } else if (prop.isNumerical) {
              // Otherwise, if this property is showInBrowser and numerical,
              // then add it with a NumericalTrackGroupChannel component payload.
              propertiesByPropertyGroupId[definedPropertyGroupId].items.push({
                name: prop.name,
                description: prop.description,
                icon: prop.icon,
                payload: serialiseComponent(<NumericalTrackGroupChannel table={table.id}>
                  <NumericalSummaryTrack table={table.id} track={prop.id}/>
                </NumericalTrackGroupChannel>)
              });
            }
          }
        );

        // Assign the propertyGroups (with their properties) as an object
        // to the relevant channelGroups[table.id].itemGroups
        // e.g. itemGroups = {'_UNGROUPED_': {id: 'Info', name: 'Variant Info', properties: [...]}, ...}
        channelGroups[table.id].itemGroups = propertiesByPropertyGroupId;
        // Add table positions as a PerRowIndicatorChannel component.
        channelGroups[table.id].itemGroups[undefinedPropertyGroupId] = channelGroups[table.id].itemGroups[undefinedPropertyGroupId] || {
          items: []
        };
        channelGroups[table.id].itemGroups[undefinedPropertyGroupId].items.unshift(
          {
            name: table.capNamePlural,
            description: `Positions of ${table.namePlural}`,
            icon: 'caret-up',
            payload: serialiseComponent(<PerRowIndicatorChannel table={table.id}/>)
          }
        );
      }
    });

    if (this.config.twoDTables.length > 0) {
      let groupId = '_2D_tables_';
      channelGroups[groupId] = {
        name: 'Genotypes',
        icon: 'bitmap:genomebrowser.png',
      };
      let items = _map(
        _filter(this.config.twoDTables, 'showInGenomeBrowser'),
        (twoDTable) => ({
          name: twoDTable.namePlural,
          description: twoDTable.description,
          icon: 'table',
          payload: serialiseComponent(<GenotypesChannel table={twoDTable.id}/>)
        })
      );
      channelGroups[groupId].items = _values(items);
    }

    //Per-row based summaries
    // For each visible table...
    // _forEach(this.config.visibleTables, (table) => {
    //
    //   // If there are any tableBasedSummaryValues for this table...
    //   if (table.tableBasedSummaryValues.length > 0) {
    //
    //     // Use a groupId named `_per_${table.id}` to collect the tableBasedSummaryValues as its items.
    //     let groupId = `_per_${table.id}`;
    //
    //     channelGroups[groupId] = {
    //       name: `Per ${table.capNameSingle}`,
    //       icon: table.icon
    //     };
    //
    //     let items = _map(
    //       table.tableBasedSummaryValuesById,
    //       (channel) => (
    //         {
    //           name: channel.name,
    //           description: 'Description needs to be implemented',
    //           icon: 'line-chart',
    //           payload: serialiseComponent(
    //             <PerRowNumericalChannel
    //               table={table.id}
    //               channel={channel.id}
    //             />
    //           )
    //         }
    //       )
    //     );
    //
    //     channelGroups[groupId].items = _values(items);
    //   }
    // });
    return channelGroups;
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
    const actions = this.getFlux().actions;
    return <Button
      label="Add Channels"
      color="primary"
      iconName="plus"
      onClick={() => actions.session.modalOpen(
        <ItemPicker
          title="Pick channels to be added"
          itemName="channel"
          groupName="group"
          pickVerb="add"
          groups={this.channelGroups()}
          onPick={this.handleChannelAdd}
        />
      )}
    />;
  },
});


let SidebarContent = createReactClass({
  displayName: 'SidebarContent',
  mixins: [FluxMixin, ConfigMixin],

  shouldComponentUpdate() {
    return false;
  },

  setProps(u) {  //Redirect setProps so we never need to rerender
    this.props.setProps(u);
  },

  render() {
    const actions = this.getFlux().actions;
    return (
      <div className="sidebar">
        <SidebarHeader
          icon="bitmap:genomebrowser.png"
          description="A browser for exploring the reference genome and per-sample data including coverage and mapping qualities."
        />
        <AddChannelsButton setProps={this.setProps}/>
        <Divider />
        {this.config.settings.genomeBrowserChannelSets.length ?
          <List>
            <ListSubheader>Example channel sets:</ListSubheader>
            {
              _map(this.config.settings.genomeBrowserChannelSets, (channelSet, i) => {
                const {name, description, channels} = channelSet;
                return (
                  <ListItem
                    button
                    key={i}
                    onClick={() => this.props.setProps((props) => props.set('children', Immutable.fromJS(channels)))}
                  >
                    <ListItemText
                      primary={name}
                      secondary={description}
                    />
                    {this.config.user.isManager ?
                      <ListItemIcon>
                        <IconButton
                          tooltip="Delete"
                          onClick={(e) => actions.api.modifyConfig({
                            dataset: this.config.dataset,
                            path: `settings.genomeBrowserChannelSets.${i}`,
                            action: 'delete'
                          })}
                        >
                          <Icon name={'trash-o'} inverse={false} />
                        </IconButton>
                      </ListItemIcon>
                      : null
                    }
                  </ListItem>
                );
              })
            }
          </List>
          : null
        }
        {this.config.user.isManager ?
          <Button
            label="Save channel set"
            color="primary"
            iconName="floppy-o"
            onClick={() => actions.session.modalOpen(
              <ModalInput
                inputs={['name', 'description']}
                names={['Name', 'Description']}
                action="save"
                actionIcon="floppy-o"
                onCancel={actions.session.modalClose}
                onAction={({name, description}) => {
                  actions.api.modifyConfig({
                    dataset: this.config.dataset,
                    path: 'settings.genomeBrowserChannelSets',
                    action: 'merge',
                    content: [{
                      name,
                      description,
                      channels: React.Children.map(this.props.children, serialiseComponent)
                    }]
                  });
                  actions.session.modalClose();
                }}
              />
            )}
          /> : null}
        {this.config.user.isManager ?
          <Divider /> : null}
        <ListSubheader>Open tables for:</ListSubheader>
        {_map(this.config.visibleTables, (table) => {
          if (table.hasGenomePositions || table.isRegionOnGenome) {
            return (
              <Button
                key={table.id}
                label={`${table.namePlural} in view`}
                color="primary"
                iconName={table.icon}
                onClick={() => {
                  let {chromosome, start, end} = this.props;
                  //Set default bounds
                  start = _isNumber(start) ? start : 0;
                  end = (_isNumber(end) ? end : this.config.chromosomes[chromosome]) || 10000;
                  chromosome = chromosome || _head(_keys(this.config.chromosomes));
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
              />
            );
          }
        })}
      </div>
    );
  },
});


export default GenomeBrowserWithActions;
