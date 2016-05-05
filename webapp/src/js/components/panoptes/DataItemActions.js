import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import RaisedButton from 'material-ui/RaisedButton';


let DataItemActions = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired,
  },

  getInitialState() {
    return {
      data: null
    };
  },

  fetchData(props, requestContext) {
    let {table, primKey} = props;


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
        this.setState({data: data});
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
      });
  },


  render() {
    const {table, primKey} = this.props;
    const {data} = this.state;
    const config = this.config.tables[table];
    if (!data)
      return null;
    console.log(config, data);
    return (
      <div>

      </div>
    );

  }

});

export default DataItemActions;
