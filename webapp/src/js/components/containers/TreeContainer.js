import React from 'react';
import {treeTypes} from 'phylocanvas';

import _keys from 'lodash.keys';
import _map from 'lodash.map';
import _filter from 'lodash.filter';
import _keyBy from 'lodash.keyby';

import Tree from 'panoptes/Tree';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import Loading from 'ui/Loading';
import {propertyColour} from 'util/Colours';

let TreeContainer = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('tree', 'table', 'nodeColourProperty', 'branchColourProperty')
  ],

  propTypes: {
    table: React.PropTypes.string,
    tree: React.PropTypes.string,
    treeType: React.PropTypes.oneOf(_keys(treeTypes)),
    nodeColourProperty: React.PropTypes.string,
    branchColourProperty: React.PropTypes.string
  },

  getInitialState() {
    return {
      data: null,
      metadata: null,
      loadStatus: 'loaded'
    };
  },

  fetchData(props, requestContext) {
    const {table, tree, nodeColourProperty, branchColourProperty} = props;

    if (table && tree) {
      this.setState({loadStatus: 'loading'});

      let columns = _map(_filter(this.tableConfig().visibleProperties, (prop) => prop.showByDefault), (prop) => prop.id);

      let treeAPIargs = {
        database: this.config.dataset,
        table,
        tree
      };

      let tableAPIargs = {
        database: this.config.dataset,
        table,
        columns,
        start: 0,
        transpose: true
      };

      requestContext.request(
        (componentCancellation) =>
          Promise.all(
            [
              LRUCache.get(
                'treeData' + JSON.stringify(treeAPIargs),
                (cacheCancellation) =>
                  API.treeData({cancellation: cacheCancellation, ...treeAPIargs}),
                componentCancellation
              ),
              LRUCache.get(
                'query' + JSON.stringify(tableAPIargs),
                (cacheCancellation) =>
                  API.query({cancellation: cacheCancellation, ...tableAPIargs}),
                componentCancellation
              )
            ]
          )
      )
      .then((data) => {

        let nodeColourFunction = propertyColour(this.config.tablesById[table].propertiesById[nodeColourProperty]);
        let branchColourFunction = propertyColour(this.config.tablesById[table].propertiesById[branchColourProperty]);

        let metadata = _map(data[1], (obj) => ({
          key: obj.key,
          nodeColour: nodeColourFunction(obj[nodeColourProperty]),
          branchColour: branchColourFunction(obj[branchColourProperty])
        }));

        let metadataByKey = _keyBy(metadata, (obj) => obj.key);

        this.setState({
          data: data[0].data,
          metadata: metadataByKey,
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
        metadata: null,
        loadStatus: 'loaded'
      });
    }
  },


  render() {
    const {data, loadStatus, metadata} = this.state;

    return (
      <div className="tree-container">
        {data ?
          <Tree
            {...this.props}
            data={data}
            metadata={metadata}
          />
        : null}
        <Loading status={loadStatus}/>
      </div>);
  }

});

export default TreeContainer;
