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
import getDisplayName from 'util/getDisplayName';

let withAPIData = (WrappedComponent, APIArgsFromProps) => createReactClass({
  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin()
  ],

  contextTypes: WrappedComponent.contextTypes,
  childContextTypes: WrappedComponent.childContextTypes,
  propTypes: WrappedComponent.propTypes,
  displayName: getDisplayName(WrappedComponent.displayName),

  getInitialState() {
    return {
      loadStatus: 'loading'
    };
  },

  getChildContext() {
    return WrappedComponent.getChildContext ? WrappedComponent.getChildContext.bind(this)() : {};
  },

  getDefaultProps() {
    return WrappedComponent.getDefaultProps ? WrappedComponent.getDefaultProps.bind(this)() : {};
  },

  componentDidMount() {
    this.lastAPIArgs = null;
  },

  icon() {
    return WrappedComponent.icon ? WrappedComponent.icon.bind(this)() : '';
  },

  title() {
    return WrappedComponent.title ? WrappedComponent.title.bind(this)() : '';
  },

  fetchData(props, requestContext) {
    let APIArgSet = APIArgsFromProps.bind(this)({config: this.config, props});
    if (_isEqual(this.lastAPIArgs, APIArgSet.requests)) {
      return;
    }
    this.setState({loadStatus: 'loading'});
    this.lastAPIArgs = APIArgSet.requests;
    const keys = _keys(APIArgSet.requests);
    const values = _values(APIArgSet.requests);
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
        ... APIArgSet.postProcess ? APIArgSet.postProcess.bind(this)(result) : result,
      });
    })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((xhr) => {
        this.lastAPIArgs = null;
        ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
        this.setState({loadStatus: 'error', data: null});
      });
  },
  render() {
    return <WrappedComponent {...this.state} {...this.props} config={this.config}/>;
  }
});

export default withAPIData;
