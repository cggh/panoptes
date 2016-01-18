const React = require('react');
const _ = require('lodash');
// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const DataFetcherMixin = require('mixins/DataFetcherMixin');

// Panoptes components
const API = require('panoptes/API');
const PropertyList = require('panoptes/PropertyList');
const ErrorReport = require('panoptes/ErrorReporter');

// Utils
const LRUCache = require('util/LRUCache');

// UI components
const Loading = require('ui/Loading');

let PropertyGroupTab = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey')
  ],

  propTypes: {
    title: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired
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
      this.setState({loadStatus: 'loaded', data: data});
    })
    .catch(API.filterAborted)
    .catch(LRUCache.filterCancelled)
    .catch((error) => {
      ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
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
    let propertiesData = _.cloneDeep(this.config.tables[table].properties);

    for (let i = 0; i < propertiesData.length; i++) {
      if (propertiesData[i].settings.groupId === propertyGroupId) {
        // Only collect data for the specified propertyGroup.

        // Augment the array element (an object) with the fetched value of the property.
        propertiesData[i].value = data[propertiesData[i].propid];

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

module.exports = PropertyGroupTab;
