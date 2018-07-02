import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Panoptes components
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';

// Utils
import LRUCache from 'util/LRUCache';

// Material UI components
import {List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core';
import ListSubheader from '@material-ui/core/ListSubheader';

// UI components
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';

let RegionGenesList = createReactClass({
  displayName: 'RegionGenesList',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chromosome', 'startPosition', 'endPosition')
  ],

  propTypes: {
    chromosome: PropTypes.string.isRequired,
    onSelectGene: PropTypes.func.isRequired,
    startPosition: PropTypes.oneOfType([PropTypes.number.isRequired, PropTypes.string.isRequired]),
    endPosition: PropTypes.oneOfType([PropTypes.number.isRequired, PropTypes.string.isRequired]),
    icon: PropTypes.string
  },

  getDefaultProps() {
    return {
      chromosome: null,
      startPosition: 0,
      endPosition: 100000
    };
  },

  getInitialState() {
    return {
      regionGenesData: [],
      loadStatus: 'loaded'
    };
  },

  //Called by DataFetcherMixin
  fetchData(props, requestContext) {

    let {chromosome, startPosition, endPosition} = props;

    this.setState({loadStatus: 'loading'});

    let APIargs = {
      database: this.config.dataset,
      chromosome,
      startPosition,
      endPosition
    };

    requestContext.request((componentCancellation) =>
      LRUCache.get(
        `findGenesInRegion${JSON.stringify(APIargs)}`,
        (cacheCancellation) =>
          API.findGenesInRegion({cancellation: cacheCancellation, ...APIargs}),
        componentCancellation
      )
    )
      .then((data) => {
        this.setState({
          loadStatus: 'loaded',
          regionGenesData: data
        });

      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((xhr) => {
        ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
        this.setState({loadStatus: 'error'});
      });
  },

  handleSelectGene(e, geneId) {
    this.props.onSelectGene(e, geneId);
  },

  render() {
    let {icon, chromosome, startPosition, endPosition} = this.props;
    let {loadStatus, regionGenesData} = this.state;

    if (loadStatus !== 'loaded') {
      return (
        <div>
          <Loading status={loadStatus}/>
        </div>
      );
    }

    let subheaderText = (
      <span>No genes found.</span>
    );
    if (regionGenesData.length > 0) {
      subheaderText = (
        <span>Found {regionGenesData.length} genes on chromosome {chromosome} between positions {startPosition} and {endPosition}:</span>
      );
    }

    let listItems = [];

    for (let i = 0, len = regionGenesData.length; i < len; i++) {

      listItems.push(
        <ListItem
          button
          key={regionGenesData[i].fid}
          onClick={(e) => this.handleSelectGene(e, regionGenesData[i].fid, regionGenesData[i].descr.split(';').join('; ').split(',').join(', '))}
        >
          <ListItemIcon>
            <Icon fixedWidth={true} name={icon} />
          </ListItemIcon>
          <ListItemText
            primary={
              <span>
                <span>{regionGenesData[i].fname}</span>
                <span> between </span>
                <span>{regionGenesData[i].fstart} and {regionGenesData[i].fstop}</span>
              </span>
            }
            secondary={regionGenesData[i].descr.split(';').join('; ').split(',').join(', ')}
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

export default RegionGenesList;
