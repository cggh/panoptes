import React from 'react';
import Immutable from 'immutable';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import serialiseComponent from 'util/serialiseComponent';

import _map from 'lodash/map';
import _forEach from 'lodash/forEach';
import _filter from 'lodash/filter';
import _isNumber from 'lodash/isNumber';
import _head from 'lodash/head';
import _keys from 'lodash/keys';
import _values from 'lodash/values';

import Sidebar from 'react-sidebar';
import Divider from 'material-ui/Divider';
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import GenomeBrowser from 'panoptes/genome/GenomeBrowser';
import CategoricalChannel from 'panoptes/genome/tracks/CategoricalChannel';
import NumericalSummaryTrack from 'panoptes/genome/tracks/NumericalSummaryTrack';
import NumericalTrackGroupChannel from 'panoptes/genome/tracks/NumericalTrackGroupChannel';
import GenotypesChannel from 'panoptes/genome/tracks/GenotypesChannel';
import PerRowNumericalChannel from 'panoptes/genome/tracks/PerRowNumericalChannel';
import PerRowIndicatorChannel from 'panoptes/genome/tracks/PerRowIndicatorChannel';
import ItemPicker from 'containers/ItemPicker';
import FlatButton from 'material-ui/FlatButton';
import scrollbarSize from 'scrollbar-size';
import ListWithActions from 'containers/ListWithActions';
import DataTableWithActions from 'containers/DataTableWithActions';
import SQL from 'panoptes/SQL';
import DataDownloader from 'util/DataDownloader';
import Alert from 'ui/Alert';

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

    // NB: table properties (columns) will be grouped by their propertyGroup
    // and assigned to channelGroups[table.id].itemGroups
    // In contrast, twoDTables will be assigned to channelGroups['_2D_tables_'].items
    // tableBasedSummaryValues for each table will be assigned to channelGroups[`_per_${table.id}`].items
    let channelGroups = {};

    //Normal summaries

    // For each table...
    _forEach(this.config.tables, (table) => {

      // Only include properties for tables that have genome positions and are not hidden.
      if (table.hasGenomePositions && !table.isHidden) {

        channelGroups[table.id] = {
          name: table.capNamePlural,
          icon: table.icon
        };

        let propertiesByPropertyGroupId = {};

        //_UNGROUPED_ items will be placed above groups in the picker
        let undefinedPropertyGroupId = '_UNGROUPED_';

        // For each table property...
        _forEach(
          // NB: The table's chromosome and position properties are excluded.
          _filter(table.properties, (prop) => prop.id !== table.chromosome && prop.id !== table.position),
          (prop) => {

            let definedPropertyGroupId = prop.groupId !== undefined ? prop.groupId : undefinedPropertyGroupId;

            // If this propertyGroup hasn't been created yet, create it.
            if (!propertiesByPropertyGroupId.hasOwnProperty(definedPropertyGroupId)) {
              propertiesByPropertyGroupId[definedPropertyGroupId] = {
                name: table.propertyGroupsById[definedPropertyGroupId].name,
                items: []
              };
            }

            if (prop.showInBrowser && (prop.isCategorical || prop.isBoolean)) {

              // If this property is showInBrowser and either categorical or boolean,
              // then add it with a CategoricalChannel component payload.

              propertiesByPropertyGroupId[definedPropertyGroupId].items.push({
                name: prop.name,
                description: prop.description,
                icon: prop.icon,
                payload: serialiseComponent(<CategoricalChannel name={prop.name} table={table.id} track={prop.id}/>)
              });

            } else if (prop.showInBrowser && prop.isNumerical) {

              // Otherwise, if this property is showInBrowser and numerical,
              // then add it with a NumericalTrackGroupChannel component payload.

              propertiesByPropertyGroupId[definedPropertyGroupId].items.push({
                name: prop.name,
                description: prop.description,
                icon: prop.icon,
                payload: serialiseComponent(<NumericalTrackGroupChannel>
                  <NumericalSummaryTrack name={prop.name} table={table.id} track={prop.id}/>
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
            payload: serialiseComponent(<PerRowIndicatorChannel table={table.id} />)
          }
        );

      }
    });

    // If there are any 2D tables...
    if (this.config.twoDTables.length > 0) {

      // Use a group named "_2D_tables_" to collect the twoDTables as its items.
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
    //               name={channel.name}
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

  handleDownload() {
    DataDownloader.downloadGenotypeData(
      {
        dataset: this.config.dataset,
        onLimitBreach: this.handleDownloadLimitBreach
      }
    );
  },

  handleDownloadLimitBreach(payload) {
    let {totalDataPoints, maxDataPoints} = payload;
    let message = `You have asked to download ${totalDataPoints} data points, which is more than our current limit of ${maxDataPoints}. Please use a stricter filter or fewer columns, or contact us directly.`;
    this.getFlux().actions.session.modalOpen(<Alert title="Warning" message={message}/>);
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
          >
          </FlatButton>
        );
        genomePositionTableButtons.push(genomePositionTableButton);
      }
    });

    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader
          icon={this.icon()}
          description="A browser for exploring the reference genome and per-sample data including coverage and mapping qualities."
        />
        <FlatButton
          label="Add Channels"
          primary={true}
          icon={<Icon fixedWidth={true} name="plus"/>}
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
        />
        <Divider />
        <FlatButton label="Download data"
                    primary={true}
                    onClick={() => this.handleDownload()}
                    icon={<Icon fixedWidth={true} name="download" />}
        />
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
            <Icon
              className="pointer icon"
              name={sidebar ? 'arrow-left' : 'bars'}
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
