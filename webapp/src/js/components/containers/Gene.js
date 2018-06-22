import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Panoptes
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';
import PopupButton from 'panoptes/PopupButton';
import ExternalLinkButton from 'panoptes/ExternalLinkButton';
import ReferenceSequence from 'panoptes/genome/tracks/ReferenceSequence';
import GenomeScale from 'panoptes/genome/tracks/GenomeScale';
import AnnotationChannel from 'panoptes/genome/tracks/AnnotationChannel';
import DetectResize from 'utils/DetectResize';
import ListWithActions from 'containers/ListWithActions';
import DataTableWithActions from 'containers/DataTableWithActions';
import GenomeBrowserWithActions from 'containers/GenomeBrowserWithActions';

// UI
import Loading from 'ui/Loading';
import Button from 'ui/Button';
import Icon from 'ui/Icon';

import _forEach from 'lodash.foreach';

import 'genomebrowser.scss';

let Gene = createReactClass({
  displayName: 'Gene',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('geneId')
  ],

  propTypes: {
    icon: PropTypes.string,
    geneId: PropTypes.string.isRequired
  },

  getDefaultProps() {
    return {
      title: 'Gene',
      icon: 'bitmap:genomebrowser.png',
      initialPane: null
    };
  },

  getInitialState() {
    return {
      geneData: null,
      loadStatus: 'loaded',
      width: 300,
      height: 0
    };
  },

  icon() {
    return this.props.icon;
  },

  title() {
    return `Gene ${this.props.geneId}`;
  },

  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {geneId} = props;

    if (geneId !== null) {
      this.setState({loadStatus: 'loading'});
      let APIargs = {
        database: this.config.dataset,
        geneId
      };
      requestContext.request((componentCancellation) =>
        LRUCache.get(
          `fetchGene${JSON.stringify(APIargs)}`,
          (cacheCancellation) =>
            API.fetchGene({cancellation: cacheCancellation, ...APIargs}),
          componentCancellation
        )
      )
        .then((data) => {
          this.setState({
            loadStatus: 'loaded',
            geneData: data
          });
        })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((xhr) => {
          ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(props, requestContext));
          this.setState({loadStatus: 'error'});
        });
    } else {
      this.setState({geneData: null});
    }
  },

  render() {
    const {geneData, loadStatus} = this.state;
    const {annotation} = this.config.genome;
    const actions = this.flux.actions.session;

    if (!geneData) return null;

    let genomePositionTableButtons = [];
    _forEach(this.config.visibleTables, (table) => {
      if (table.hasGenomePositions || table.isRegionOnGenome) {
        let genomePositionTableQuery = null;
        if (table.hasGenomePositions) {
          genomePositionTableQuery = SQL.WhereClause.encode(SQL.WhereClause.AND([
            SQL.WhereClause.CompareFixed(table.chromosome, '=', geneData['chromid']),
            SQL.WhereClause.CompareFixed(table.position, '>=', parseInt(geneData['fstart'])),
            SQL.WhereClause.CompareFixed(table.position, '<=', parseInt(geneData['fstop']))
          ]));
        } else if (table.isRegionOnGenome) {
          genomePositionTableQuery = SQL.WhereClause.encode(SQL.WhereClause.AND([
            SQL.WhereClause.CompareFixed(table.chromosome, '=', geneData['chromid']),
            SQL.WhereClause.CompareFixed(table.regionStart, '<=', parseInt(geneData['fstop'])),
            SQL.WhereClause.CompareFixed(table.regionStop, '>=', parseInt(geneData['fstart']))
          ]));
        }
        let genomePositionTableButton = (
          <PopupButton key={table.id}
            label={`Show ${table.namePlural} in ${geneData['fname']}`}
            icon={table.icon} >
            {table.listView ? <ListWithActions table={table.id}
              query={genomePositionTableQuery} /> :
              <DataTableWithActions table={table.id}
                query={genomePositionTableQuery} />}
          </PopupButton>
        );
        genomePositionTableButtons.push(genomePositionTableButton);
      }
    });

    let externalGeneLinks = this.config.genome.externalGeneLinks;
    let externalGeneLinkButtons = [];
    for (let i = 0, len = externalGeneLinks.length; i < len; i++) {
      let externalGeneLinkButton = (
        <ExternalLinkButton key={`externalGeneLinkButton_${i}`}
          label={externalGeneLinks[i].name}
          urls={[externalGeneLinks[i].url.replace('{Id}', geneData['fid'])]}
        />
      );
      externalGeneLinkButtons.push(externalGeneLinkButton);
    }

    const trackProps = {
      width: this.state.width,
      sideWidth: 150,
      chromosome: geneData['chromid'],
      start: parseInt(geneData['fstart']),
      end: parseInt(geneData['fstop'])
    };
    return (
      <DetectResize onResize={(size) => this.setState(size)}>
        <div>
          <div className="vertical stack">
            <GenomeScale {...trackProps}/>
            <ReferenceSequence {...trackProps}/>
            { annotation ?
              <AnnotationChannel name="Structure" {...trackProps} /> : null
            }

            <div className="grow">
              <table className="table-col">
                <tbody>
                  <tr><th className="table-col-header">ID: </th><td className="table-col-cell">{geneData['fid']}</td></tr>
                  <tr><th className="table-col-header">Name: </th><td className="table-col-cell">{geneData['fname']}</td></tr>
                  <tr><th className="table-col-header">Alternatives: </th><td className="table-col-cell">{geneData['fnames'].split(',').join(', ')}</td></tr>
                  <tr><th className="table-col-header">Description: </th><td className="table-col-cell">{geneData['descr']}</td></tr>
                  <tr><th className="table-col-header">Position: </th><td className="table-col-cell">{geneData['chromid']}:{geneData['fstart']}-{geneData['fstop']}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="horizontal stack wrap">
              <Button
                raised="true"
                style={{margin: '7px', color: 'white'}}
                label="Show in Genome Browser"
                color="primary"
                iconName="bitmap:genomebrowser.png"
                iconInverse={true}
                labelStyle={{textTransform: 'inherit'}}
                onClick={(e) => {
                  e.stopPropagation(); //To prevent a popup containing this button bringing itself to the front                e.stopPropagation();
                  actions.reuseComponentOrPopup('GenomeBrowserWithActions',
                    {
                      chromosome: geneData['chromid'],
                      start: parseInt(geneData['fstart']),
                      end: parseInt(geneData['fstop'])
                    }
                  );
                }}
              />
              {genomePositionTableButtons}
              {externalGeneLinkButtons}
            </div>
          </div>
          <Loading status={loadStatus}/>
        </div>
      </DetectResize>
    );

  },
});

export default Gene;
