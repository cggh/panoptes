import React from 'react';
import _cloneDeep from 'lodash/cloneDeep';
// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Panoptes components
import API from 'panoptes/API';
import PropertyList from 'panoptes/PropertyList';
import ErrorReport from 'panoptes/ErrorReporter';

// Utils
import LRUCache from 'util/LRUCache';

// UI components
import Loading from 'ui/Loading';

let PropertyGroup = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey')
  ],

  propTypes: {
    title: React.PropTypes.string,
    table: React.PropTypes.string,
    primKey: React.PropTypes.string,
    propertyGroupId: React.PropTypes.string,
    className: React.PropTypes.string
  },

  getInitialState() {
    return {
      loadStatus: 'loaded'
    };
  },

  fetchData(props, requestContext) {
    let {table, primKey} = props;

    this.setState({loadStatus: 'loading'});

    let APIargs = {
      database: this.config.dataset,
      tableConfig: this.tableConfig(),
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
      this.setState({loadStatus: 'loaded', data: data});
    })
    .catch(API.filterAborted)
    .catch(LRUCache.filterCancelled)
    .catch((error) => {
      ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
      this.setState({loadStatus: 'error'});
    });
  },

  title() {
    return this.props.title;
  },

  render() {
    let {table, propertyGroupId, className} = this.props;
    let {data, loadStatus} = this.state;

    if (!data) return null;

    if (!propertyGroupId) return null;

    // Collect the propertiesData for the specified propertyGroup.
    let propertyGroupPropertiesData = [];

    // Make a clone of the propertiesData, which will be augmented.
    let propertiesData = _cloneDeep(this.config.tablesById[table].properties);

    for (let i = 0; i < propertiesData.length; i++) {
      if (propertiesData[i].groupId === propertyGroupId) {
        // Only collect data for the specified propertyGroup.

        // Augment the array element (an object) with the fetched value of the property.
        propertiesData[i].value = data[propertiesData[i].id];

        // Push the array element (an object) into the array of propertiesData for the specified propertyGroup.
        propertyGroupPropertiesData.push(propertiesData[i]);
      }
    }

    return (
        <div>
          <PropertyList propertiesData={propertyGroupPropertiesData} className={className} />
          <Loading status={loadStatus}/>
        </div>
    );
  }

});

module.exports = PropertyGroup;
