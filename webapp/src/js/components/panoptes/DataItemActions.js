import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import PopupButton from 'panoptes/PopupButton';
import ExternalLinkButton from 'panoptes/ExternalLinkButton';
import Immutable from 'immutable';
import _forEach from 'lodash/forEach';
import ErrorReport from 'panoptes/ErrorReporter';

let DataItemActions = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired
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
      table: table,
      primKeyField: this.config.tables[table].primkey,
      primKeyValue: primKey
    };

    requestContext.request((componentCancellation) =>
        LRUCache.get(
          'fetchSingleRecord' + JSON.stringify(APIargs),
          (cacheCancellation) =>
            API.fetchSingleRecord({cancellation: cacheCancellation, ...APIargs}),
          componentCancellation
        )
      )
      .then((data) => {
        this.setState({data: data});
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
      });
  },


  render() {
    const {table, primKey} = this.props;
    const {data} = this.state;
    const tableConfig = this.config.tables[table];
    if (!data)
      return null;

    const treeLinks = [];
    const crossLink = `${table}::${primKey}`;
    _forEach(this.config.tables, (treeTable) => {
      if (treeTable.settings.isHidden === undefined || !treeTable.settings.isHidden) {
        treeTable.trees.forEach((tree) => {
          if (crossLink === tree.crossLink) {
            treeLinks.push(<PopupButton label={`Show associated ${this.config.tables[treeTable.id].tableCapNameSingle} tree`}
                                        icon="tree"
                                        componentPath="containers/TreeWithActions"
                                        table={treeTable.id}
                                        tree={tree.id}
                                        key={tree.id}
              />
            );
          }
        });
      }
    });

    return (
      <div>
        {tableConfig.hasGenomePositions ? <PopupButton label="Show in Genome Browser"
                     icon="bitmap:genomebrowser.png"
                     componentPath="containers/GenomeBrowserWithActions"
                     chromosome={data[tableConfig.chromosomeField]}
                     start={parseInt(data[tableConfig.positionField]) - 50}
                     end={parseInt(data[tableConfig.positionField]) + 50}
                     channels={Immutable.fromJS({
                       [table]: {
                         channel: 'PerRowIndicatorChannel',
                         props: {
                           table: table
                         }
                       }
                     })}
          />
        : null}
        {tableConfig.hasGenomeRegions ? <PopupButton label="Show in Genome Browser"
                                                  icon="bitmap:genomebrowser.png"
                                                  componentPath="containers/GenomeBrowserWithActions"
                                                  chromosome={data[tableConfig.chromosomeField]}
                                                  start={parseInt(data[tableConfig.startPositionField]) - 50}
                                                  end={parseInt(data[tableConfig.stopPositionField]) + 50}
                                                  channels={Immutable.fromJS({
                                                    [table]: {
                                                      channel: 'RegionChannel',
                                                      props: {
                                                        table: table
                                                      }
                                                    }
                                                  })}
        />
          : null}
        {tableConfig.properties.map((prop) => {
          if (prop.externalUrl) {
            return <ExternalLinkButton key={prop.propid}
                                       label={prop.name}
                                       urls={data[prop.propid].split(';').map((value) => prop.externalUrl.replace('{value}', value))}
            />;

          } else {
            return null;
          }
        })}
        {treeLinks}



      </div>
    );

  }

});

export default DataItemActions;
