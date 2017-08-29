import Immutable from 'immutable';
import RequestContext from 'util/RequestContext';

let DataFetcherMixin = function() {
  let propsToWatch = Array.prototype.slice.call(arguments);
  return {
    componentWillMount() {
      this._requestContext = new RequestContext();
      this._getDataIfNeeded({}, this.props);
    },
    componentWillReceiveProps(nextProps) {
      this._getDataIfNeeded(this.props, nextProps);
    },

    forceFetch() {
      this.fetchData(this.props, this._requestContext);
    },

    _getDataIfNeeded(lastProps, nextProps) {
      if (!(propsToWatch.length > 0) || propsToWatch.some((key) => !Immutable.is(lastProps[key], nextProps[key])))
        this.fetchData(nextProps, this._requestContext);
    },
    componentWillUnmount() {
      this._requestContext.destroy();
    }

  };
};

DataFetcherMixin.componentWillMount = function() {
  throw new Error('DataFetcherMixin is a function that takes one or more prop names to watch as parameters and returns the mixin, e.g.: mixins: [DataFetcherMixin("Prop1", "Prop2")]');
};

export default DataFetcherMixin;
