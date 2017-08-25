import PropTypes from 'prop-types';
import React from 'react';

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
    DataFetcherMixin('chromosome', 'startPosition', 'endPosition')
  ],

  propTypes: {
    chromosome: PropTypes.string.isRequired,
    onSelectGene: PropTypes.func.isRequired,
    startPosition: PropTypes.number.isRequired,
    endPosition: PropTypes.number.isRequired,
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
      chromosome: chromosome,
      startPosition: startPosition,
      endPosition: endPosition
    };

    requestContext.request((componentCancellation) =>
          LRUCache.get(
            'findGenesInRegion' + JSON.stringify(APIargs),
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
        <ListItem key={regionGenesData[i].fid}
                  primaryText={
                    <div>
                          <span>{regionGenesData[i].fname}</span>
                          <span> between </span>
                          <span>{regionGenesData[i].fstart} and {regionGenesData[i].fstop}</span>
                    </div>
                  }
                  secondaryText={
                    <div>
                          {regionGenesData[i].descr.split(';').join('; ').split(',').join(', ')}
                    </div>
                  }
                  secondaryTextLines={2}
                  onClick={(e) => this.handleSelectGene(e, regionGenesData[i].fid, regionGenesData[i].descr.split(';').join('; ').split(',').join(', '))}
                  leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
        />
      );

    }


    return (
      <div>
        <List>
          <Subheader>{subheaderText}</Subheader>
          {listItems}
        </List>
        <Loading status={loadStatus}/>
      </div>
    );

  }

});

export default RegionGenesList;
