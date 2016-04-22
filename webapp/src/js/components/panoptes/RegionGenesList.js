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

let RegionGenesList = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('search')
  ],

  propTypes: {
    chromosome: React.PropTypes.string.isRequired,
    onSelectGene: React.PropTypes.func.isRequired
  },

  getDefaultProps() {
    return {
      chromosome: null,
      start: 0,
      end: 100000,
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

    let {chromosome, start, end} = props;

    this.setState({loadStatus: 'loading'});

    let APIargs = {
      database: this.config.dataset,
      chromosome: chromosome,
      start: start,
      end: end
    };

    requestContext.request((componentCancellation) =>
          LRUCache.get(
            'findGenesInRegion' + JSON.stringify(APIargs),
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

  handleSelectGene(geneId) {
    this.props.onSelectGene(geneId);
  },

  render() {
    let {icon, chromosome, start, end} = this.props;
    let {loadStatus, matchData} = this.state;

    if (matchData.ids && matchData.ids.length > 0) {

      let subheaderText = (
        <span>Found {matchData.ids.length} genes in the region:</span>
      );

      // FIXME: secondaryText is not wrapping properly (so isn't showing highlighted matched text)

      let listItems = [];

      for (let i = 0, len = matchData.ids.length; i < len; i++) {

        listItems.push(
          <ListItem key={matchData.ids[i]}
                    primaryText={
                      <div>
                            <span>{matchData.ids[i]}</span>
                            <span> on </span>
                            <span>{matchData.chromosomes[i]}</span>
                      </div>
                    }
                    secondaryText={
                      <div>
                            {matchData.descriptions[i]}
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
          <p>No genes found in this region</p>
        </div>
      );
    }
  }

});

module.exports = RegionGenesList;
