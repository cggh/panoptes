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

// UI
import Loading from 'ui/Loading';


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
      geneData: [],
      loadStatus: 'loaded'
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
          ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
          this.setState({loadStatus: 'error'});
        });
    } else {
      this.setState({rows: []});
    }
  },

  render() {
    let {geneData, loadStatus} = this.state;

    if (!geneData) return null;

    return (
      <div>
        <table>
          <tbody>
            <tr><th>Id: </th><td>{geneData['fid']}</td></tr>
            <tr><th>Name: </th><td>{geneData['fname']}</td></tr>
            <tr><th>Alternatives: </th><td>{geneData['fnames']}</td></tr>
            <tr><th>Description: </th><td>{geneData['descr']}</td></tr>
            <tr><th>Position: </th><td>{geneData['chromid']}:{geneData['fstart']}-{geneData['fstop']}</td></tr>
          </tbody>
        </table>
        <Loading status={loadStatus}/>
        <p>TODO: open in GenomeBrowser; table query popup/tab; GeneDB</p>
      </div>
    );

  }

});

module.exports = Gene;
