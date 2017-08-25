import React from 'react';
import createReactClass from 'create-react-class';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import _isEqual from 'lodash.isequal';
import _keys from 'lodash.keys';
import _values from 'lodash.values';
import _map from 'lodash.map';
import _forEach from 'lodash.foreach';
import _zip from 'lodash.zip';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import getDisplayName from 'react-display-name';

let withAPIData = (WrappedComponent, APIArgsFromProps) => {
  return createReactClass({
    mixins: [
      FluxMixin,
      ConfigMixin,
      DataFetcherMixin()
    ],

    propTypes: WrappedComponent.propTypes,
    displayName: getDisplayName(WrappedComponent.displayName),

    getInitialState() {
      return {
        loadStatus: 'loading'
      };
    },

    getDefaultProps() {
      return WrappedComponent.getDefaultProps ? WrappedComponent.getDefaultProps() : {};
    },

    componentDidMount() {
      this.lastAPIArgs = null;
    },

    icon() {
      return WrappedComponent.icon ? WrappedComponent.icon() : '';
    },

    title() {
      return WrappedComponent.title ? WrappedComponent.title() : '';
    },

    fetchData(props, requestContext) {
      let APIArgSet = APIArgsFromProps({config: this.config, props});
      if (_isEqual(this.lastAPIArgs, APIArgSet)) return;
      const keys = _keys(APIArgSet);
      const values = _values(APIArgSet);
      requestContext.request((componentCancellation) =>
        Promise.all(_map(values, ({method, args}) => LRUCache.get(
          method + JSON.stringify(args),
          (cacheCancellation) =>
            API[method]({cancellation: cacheCancellation, ...args}),
          componentCancellation
        )))
      ).then((data) => {
        const result = {};
        _forEach(_zip(keys, data), ([key, value]) => result[key] = value);
        this.setState({
          loadStatus: 'loaded',
          ...result,
        });
      })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((xhr) => {
          ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
          this.setState({loadStatus: 'error', data: null});
        });
    },
    render()
    {
      return <WrappedComponent {...this.state} {...this.props} config={this.config}/>;
    }
  });
};

export default withAPIData;
