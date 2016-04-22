import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Highlight from 'react-highlighter';
import _uniq from 'lodash/uniq';
import _keys from 'lodash/keys';
import striptags from 'striptags';
// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Panoptes components
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';
import ItemTemplate from 'panoptes/ItemTemplate';
import DataDecoders from 'panoptes/DataDecoders';

// Utils
import LRUCache from 'util/LRUCache';
import templateFieldsUsed from 'util/templateFieldsUsed';

// Material UI components
import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';

// UI components
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';

let GeneListView = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('search')
  ],

  propTypes: {
    search: React.PropTypes.string.isRequired
  },

  getDefaultProps() {
    return {
      search: '',
      maxMatches: 51
    };
  },

  getInitialState() {
    return {
      matchData: [],
      loadStatus: 'loaded'
    };
  },


  //Called by DataFetcherMixin
  fetchData(props, requestContext) {

    let {search, maxMatches} = props;

    // NOTE
    let queryURL = API.serverURL;
    queryURL += '?datatype' + '=' + 'findgene';
    queryURL += '&pattern' + '=' + search;
    queryURL += '&count' + '=' + maxMatches;
    queryURL += '&reportall' + '=' + 1;
    queryURL += '&database' + '=' + this.config.dataset;
    queryURL += '&table' + '=' + 'annotation';
console.log('queryURL: ' + queryURL);


    this.setState({loadStatus: 'loading'});

    let APIargs = {
      database: this.config.dataset,
      pattern: search,
      count: maxMatches,
      reportall: 1
    };

    requestContext.request((componentCancellation) =>
          LRUCache.get(
            'findGene' + JSON.stringify(APIargs),
            (cacheCancellation) =>
              API.findGene({cancellation: cacheCancellation, ...APIargs}),
            componentCancellation
          )
        )
        .then((data) => {
          this.setState({
            loadStatus: 'loaded',
            matchData: data
          });

        })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((xhr) => {
          ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
          this.setState({loadStatus: 'error'});
        });
  },


  // TODO: open genes in popup, not a modal switch (allow open more than one).
  // But the search dialog is still in modal ?!

  handleSwitchModal(container, props) {
    this.getFlux().actions.session.modalClose();
    this.getFlux().actions.session.modalOpen(container, props);
  },

  handleSelectGene(geneId) {
    // Add selected geneId to list of recently found genes.
    this.getFlux().actions.session.geneFound(geneId);
    this.handleSwitchModal('containers/Gene', {geneId: geneId});
  },

  render() {
    let {icon, search, maxMatches} = this.props;
    let {loadStatus, matchData} = this.state;

console.log('matchData: %o', matchData);

    if (matchData.ids && matchData.ids.length > 0) {

      let subheaderText = null;

      // TODO: "Found over 100 matching genes"
      if (matchData.ids.length === maxMatches) {

        let maxMatchesUnderstated = maxMatches - 1;

        subheaderText = (
          <span>Found over {maxMatchesUnderstated} matching genes:</span>
        );

      } else {

        subheaderText = (
          <span>Found {matchData.ids.length} matching genes:</span>
        );
      }

      // FIXME: secondaryText is not wrapping properly (so isn't showing highlighted matched text)

      let listItems = [];

      for (let i = 0, len = matchData.ids.length; i < len; i++) {

        listItems.push(
          <ListItem key={matchData.ids[i]}
                    primaryText={
                      <div>
                        <Highlight search={search}>
                            <span>{matchData.ids[i]}</span>
                            <span> on </span>
                            <span>{matchData.chromosomes[i]}</span>
                        </Highlight>
                      </div>
                    }
                    secondaryText={
                      <div>
                        <Highlight search={search}>
                            {matchData.descriptions[i]}
                        </Highlight>
                      </div>
                    }
                    secondaryTextLines={2}
                    onClick={() => this.handleSelectGene(matchData.ids[i])}
                    leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
          />
        );

      }


      return (
        <div style={{width: '80vw', height: '60vh', overflow: 'auto'}}>
          <List>
            <Subheader>{subheaderText}</Subheader>
            {listItems}
          </List>
          <Loading status={loadStatus}/>
        </div>
      );

    } else {
      return (
        <div>
          <p>No match</p>
        </div>
      );
    }
  }

});

module.exports = GeneListView;
