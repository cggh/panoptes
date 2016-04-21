import React from 'react';
import {treeTypes} from 'phylocanvas';
import _keys from 'lodash/keys';


import Tree from 'panoptes/Tree';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';

import Loading from 'ui/Loading';

let TreeContainer = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('tree', 'table')
  ],

  propTypes: {
    table: React.PropTypes.string,
    tree: React.PropTypes.string,
    treeType: React.PropTypes.oneOf(_keys(treeTypes))
  },

  getInitialState() {
    return {
      data: null,
      loadStatus: 'loaded'
    };
  },

  fetchData(props, requestContext) {
    const {table, tree} = props;
    if (table && tree) {
      this.setState({loadStatus: 'loading'});
      let APIargs = {
        database: this.config.dataset,
        table,
        tree
      };
      requestContext.request((componentCancellation) =>
          LRUCache.get(
            'treeData' + JSON.stringify(APIargs),
            (cacheCancellation) =>
              API.treeData({cancellation: cacheCancellation, ...APIargs}),
            componentCancellation
          )
        )
        .then((data) => {
          this.setState({
            data: data.data,
            loadStatus: 'loaded'
          });
        })
        .catch((error) => {
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
          this.setState({loadStatus: 'error'});
        });
    } else {
      this.setState({
        data: null,
        loadStatus: 'loaded'
      });
    }
  },


  render() {
    const { data, loadStatus } = this.state;
    return (
      <div className="tree-container">
        {data ?
          <Tree
            {...this.props}
            data={data}
          />
        : null}
        <Loading status={loadStatus}/>
      </div>);
  }

});

module.exports = TreeContainer;
