const RequestContext = require('util/RequestContext');

var DataFetcherMixin = function() {
  var propsToWatch = Array.prototype.slice.call(arguments);
  return {
    componentWillMount() {
      this._requestContext = new RequestContext();
      this._getDataIfNeeded({}, this.props);
    },
    componentWillReceiveProps(nextProps) {
      this._getDataIfNeeded(this.props, nextProps);
    },

    _getDataIfNeeded(lastProps, nextProps) {
      if (propsToWatch.some((key) => lastProps[key] !== nextProps[key]))
        this.fetchData(nextProps, this._requestContext);
    },
    componentWillUnmount() {
      this._requestContext.destroy();
    }

  };
};

DataFetcherMixin.componentWillMount = function() {
  throw new Error('DataFetcherMixin is a function that takes one or more ' +
    'prop names to watch as parameters and returns the mixin, e.g.: ' +
    'mixins: [DataFetcherMixin("Prop1", "Prop2")]');
};

module.exports = DataFetcherMixin;
