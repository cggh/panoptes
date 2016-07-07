  import React from 'react';

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
import GenomeBrowser from 'panoptes/genome/GenomeBrowser';
import AnnotationChannel from 'panoptes/genome/tracks/AnnotationChannel';
import DetectResize from 'utils/DetectResize';

// UI
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';

import _forEach from 'lodash/forEach';

import "genomebrowser.scss";

let Gene = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('geneId')
  ],

  propTypes: {
    geneId: React.PropTypes.string.isRequired
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
    return 'Gene ' + this.props.geneId;
  },

  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {geneId} = props;

    if (geneId !== null) {
      this.setState({loadStatus: 'loading'});
      let APIargs = {
        database: this.config.dataset,
        geneId: geneId
      };
      requestContext.request((componentCancellation) =>
          LRUCache.get(
            'fetchGene' + JSON.stringify(APIargs),
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
    const {componentUpdate} = this.props;
    const {geneData, loadStatus} = this.state;

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
          <PopupButton key={table}
                       label={'Show ' + table + ' in ' + geneData['fname']}
                       icon={table.icon}
                       componentPath={table.listView ? 'containers/ListWithActions' : 'containers/DataTableWithActions'}
                       componentUpdate={componentUpdate}
                       table={table}
                       query={genomePositionTableQuery}
          />
        );
        genomePositionTableButtons.push(genomePositionTableButton);
      }
    });

    let externalGeneLinks = JSON.parse(this.config.settings.externalGeneLinks);
    let externalGeneLinkButtons = [];
    for (let i = 0, len = externalGeneLinks.length; i < len; i++) {
      let externalGeneLinkButton = (
        <ExternalLinkButton key={'externalGeneLinkButton_' + i}
                            label={externalGeneLinks[i].Name}
                            urls={[externalGeneLinks[i].Url.replace('{Id}', geneData['fid'])]}
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
            { this.config.settings.refSequenceSumm ?
              <ReferenceSequence {...trackProps}/> :
              null }
            <AnnotationChannel name="Structure" {...trackProps} />
            <div className="grow">
              <table className="table-col">
                <tbody>
                  <tr><th className="table-col-header">Name: </th><td className="table-col-cell">{geneData['fname']}</td></tr>
                  <tr><th className="table-col-header">Alternatives: </th><td className="table-col-cell">{geneData['fnames'].split(',').join(', ')}</td></tr>
                  <tr><th className="table-col-header">Description: </th><td className="table-col-cell">{geneData['descr']}</td></tr>
                  <tr><th className="table-col-header">Position: </th><td className="table-col-cell">{geneData['chromid']}:{geneData['fstart']}-{geneData['fstop']}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="horizontal stack wrap">
              <PopupButton  label="Show in Genome Browser"
                            icon="bitmap:genomebrowser.png"
                            componentPath="containers/GenomeBrowserWithActions"
                            componentUpdate={componentUpdate}
                            chromosome={geneData['chromid']}
                            start={parseInt(geneData['fstart'])}
                            end={parseInt(geneData['fstop'])}
              />
              {genomePositionTableButtons}
              {externalGeneLinkButtons}
            </div>
          </div>
          <Loading status={loadStatus}/>
        </div>
      </DetectResize>
  );

  }

});

module.exports = Gene;
