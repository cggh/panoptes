import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import Highlight from 'react-highlighter';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import LRUCache from 'util/LRUCache';
import {List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core';
import ListSubheader from '@material-ui/core/ListSubheader';
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';

let GeneSearchResultsList = createReactClass({
  displayName: 'GeneSearchResultsList',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('search')
  ],

  propTypes: {
    search: PropTypes.string.isRequired,
    onSelectGene: PropTypes.func.isRequired,
    maxMatches: PropTypes.number,
    icon: PropTypes.string
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

  handleSelectGene(e, geneId, geneDesc) {
    this.props.onSelectGene(e, geneId, geneDesc);
  },

  //Called by DataFetcherMixin
  fetchData(props, requestContext) {

    let {search, maxMatches} = props;

    this.setState({loadStatus: 'loading'});

    let APIargs = {
      database: this.config.dataset,
      search,
      maxMatches
    };

    requestContext.request((componentCancellation) =>
      LRUCache.get(
        `findGene${JSON.stringify(APIargs)}`,
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

  render() {
    let {icon, search, maxMatches} = this.props;
    let {loadStatus, matchData} = this.state;

    if (loadStatus !== 'loaded') {
      return (
        <div>
          <Loading status={loadStatus}/>
        </div>
      );
    }

    let subheaderText = (
      <span>No match.</span>
    );

    let maxMatchesUnderstated = maxMatches - 1;

    if (matchData.ids.length === maxMatches) {
      subheaderText = (
        <span>Found over {maxMatchesUnderstated} matching genes:</span>
      );
    } else if (matchData.ids.length > 0) {
      subheaderText = (
        <span>Found {matchData.ids.length} matching genes:</span>
      );
    }


    // FIXME: Highlighting isn't working since adapting to new ListItemText component.

    let listItems = [];

    for (let i = 0, len = matchData.ids.length; i < len; i++) {

      listItems.push(
        <ListItem
          button
          key={matchData.ids[i]}
          onClick={(e) => this.handleSelectGene(e, matchData.ids[i], matchData.descriptions[i].split(',').join(', ').split(';').join('; '))}
        >
          <ListItemIcon>
            <Icon fixedWidth={true} name={icon}/>
          </ListItemIcon>
          <ListItemText
            primary={
              <Highlight search={search}>
                <span>{matchData.ids[i]}</span>
                <span> on </span>
                <span>{matchData.chromosomes[i]}</span>
              </Highlight>
            }
            secondary={
              <Highlight search={search}>
                <span>{matchData.descriptions[i].split(',').join(', ').split(';').join('; ')}</span>
              </Highlight>
            }
          />
        </ListItem>
      );

    }

    return (
      <div>
        <List>
          <ListSubheader>{subheaderText}</ListSubheader>
          {listItems}
        </List>
        <Loading status={loadStatus}/>
      </div>
    );

  },
});

export default GeneSearchResultsList;
