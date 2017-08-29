import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import _filter from 'lodash.filter';
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
import _map from 'lodash.map';

// UI components
import Loading from 'ui/Loading';

let PropertyGroup = createReactClass({
  displayName: 'PropertyGroup',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey')
  ],

  propTypes: {
    title: PropTypes.string,
    table: PropTypes.string,
    primKey: PropTypes.string,
    propertyGroupId: PropTypes.string,
    className: PropTypes.string
  },

  getInitialState() {
    return {
      loadStatus: 'loaded'
    };
  },

  fetchData(props, requestContext) {
    let {table, primKey, propertyGroupId} = props;

    this.setState({loadStatus: 'loading'});

    let APIargs = {
      database: this.config.dataset,
      table,
      columns: _map(_filter(this.config.tablesById[table].properties, {groupId: propertyGroupId} ), 'id'),
      primKey: this.config.tablesById[table].primKey,
      primKeyValue: primKey
    };

    requestContext.request((componentCancellation) =>
      LRUCache.get(
        `fetchSingleRecord${JSON.stringify(APIargs)}`,
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
    return (
      <div>
        {data ? <PropertyList table={table}
          propertiesData={
            _map(
              _filter(this.config.tablesById[table].properties, {groupId: propertyGroupId} ),
              ({id}) => ({id, value: data[id]}))}
          className={className}
        /> : null}
        <Loading status={loadStatus}/>
      </div>
    );
  },
});

export default PropertyGroup;
