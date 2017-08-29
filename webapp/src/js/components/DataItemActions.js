import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import PopupButton from 'panoptes/PopupButton';
import ExternalLinkButton from 'panoptes/ExternalLinkButton';
import _forEach from 'lodash.foreach';
import ErrorReport from 'panoptes/ErrorReporter';
import GenomeBrowserWithActions from 'containers/GenomeBrowserWithActions';
import TreeWithActions from 'containers/TreeWithActions';
import PerRowIndicatorChannel from 'panoptes/genome/tracks/PerRowIndicatorChannel';
import _map from 'lodash.map';

let DataItemActions = createReactClass({
  displayName: 'DataItemActions',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey')
  ],

  propTypes: {
    table: PropTypes.string.isRequired,
    primKey: PropTypes.string.isRequired
  },

  getInitialState() {
    return {
      data: null
    };
  },

  fetchData(props, requestContext) {
    let {table, primKey} = props;


    let APIargs = {
      database: this.config.dataset,
      table,
      columns: _map(this.config.tablesById[table].properties, 'id'),
      primKey: this.config.tablesById[table].primKey,
      primKeyValue: primKey
    };

    requestContext.request((componentCancellation) =>
      LRUCache.get(
        `fetchSingleRecord${JSON.stringify(APIargs)}`,
        (cacheCancellation) =>
          API.fetchSingleRecord({cancellation: cacheCancellation, ...APIargs}),
        componentCancellation
      )
    )
      .then((data) => {
        this.setState({data});
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
        throw error;
      });
  },

  render() {
    const {table, primKey} = this.props;
    const {data} = this.state;
    const tableConfig = this.tableConfig();
    if (!data)
      return null;

    const treeLinks = [];
    const crossLink = `${table}::${primKey}`;
    _forEach(this.config.visibleTables, (treeTable) => {
      _forEach(treeTable.trees || [], (tree, id) => {
        if (crossLink === tree.crossLink) {
          treeLinks.push(
            <PopupButton label={`Show associated ${this.config.tablesById[treeTable.id].capNameSingle} tree`} icon="tree">
              <TreeWithActions
                table={treeTable.id}
                tree={id}
                key={id} />
            </PopupButton>
          );
        }
      });
    });

    return (
      <div>
        {tableConfig.hasGenomePositions ?
          <PopupButton label="Show in Genome Browser" icon="bitmap:genomebrowser.png">
            <GenomeBrowserWithActions
              chromosome={data[tableConfig.chromosome]}
              start={parseInt(data[tableConfig.position]) - 50}
              end={parseInt(data[tableConfig.position]) + 50} >
              <PerRowIndicatorChannel table={table} />
            </GenomeBrowserWithActions>
          </PopupButton>
          : null}
        {tableConfig.isRegionOnGenome ?
          <PopupButton label="Show in Genome Browser" icon="bitmap:genomebrowser.png">
            <GenomeBrowserWithActions
              chromosome={data[tableConfig.chromosome]}
              start={parseInt(data[tableConfig.regionStart]) - 50}
              end={parseInt(data[tableConfig.regionStop]) + 50} >
              <div>RegionChannel table={table}</div>
            </GenomeBrowserWithActions>
          </PopupButton>
          : null}
        {tableConfig.properties.map((prop) => {
          if (prop.externalUrl) {
            return <ExternalLinkButton key={prop.id}
              label={prop.name}
              urls={data[prop.id].split(';').map((value) => prop.externalUrl.replace('{value}', value))}
            />;

          } else {
            return null;
          }
        })}
        {treeLinks}



      </div>
    );

  },
});

export default DataItemActions;
