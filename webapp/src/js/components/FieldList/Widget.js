import React from 'react';
import _cloneDeep from 'lodash/cloneDeep';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import _map from 'lodash/map';

// Utils
import LRUCache from 'util/LRUCache';

// Panoptes components
import API from 'panoptes/API';
import PropertyList from 'panoptes/PropertyList';
import ErrorReport from 'panoptes/ErrorReporter';

// UI components
import Loading from 'ui/Loading';

let FieldList = React.createClass({

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
    fields: React.PropTypes.array,
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
      table,
      columns: _map(this.config.tablesById[table].properties, 'id'),
      primKey: this.config.tablesById[table].primKey,
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
    let {table, fields, className} = this.props;
    let {data, loadStatus} = this.state;

    if (!data) return null;

    let propertiesDataIndexes = {};

    // Make a clone of the propertiesData, which will be augmented.
    let propertiesData = _cloneDeep(this.config.tablesById[table].properties);

    for (let i = 0; i < propertiesData.length; i++) {
      // Augment the array element (an object) with the fetched value of the property.
      propertiesData[i].value = data[propertiesData[i].id];

      // Record which array index in propertiesData relates to which property Id.
      propertiesDataIndexes[propertiesData[i].id] = i;
    }

    // Collect the propertiesData for the specified list of fields.
    let fieldListPropertiesData = [];
    fields.forEach((field) => {
      let propertiesDataIndex = propertiesDataIndexes[field];
      if (typeof propertiesDataIndex !== 'undefined') {
        fieldListPropertiesData.push(propertiesData[propertiesDataIndex]);
      } else {
        console.warn('Foreign property: ' + field);
      }
    });


    return (
        <div>
          <PropertyList propertiesData={fieldListPropertiesData} className={className} />
          <Loading status={loadStatus}/>
        </div>
    );
  }

});

module.exports = FieldList;
