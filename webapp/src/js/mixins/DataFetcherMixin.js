var _each = require("lodash/collection/forEach");
const Immutable = require('immutable');

var DataFetcherMixin = function() {
  var propsToWatch = Array.prototype.slice.call(arguments);
  return {
    componentWillMount() {
      this.getDataIfNeeded({}, this.props);
    },
    componentWillReceiveProps(nextProps) {
      this.getDataIfNeeded(this.props, nextProps);
    },

    getDataIfNeeded(lastProps, nextProps) {
      let update_needed = false;
      propsToWatch.forEach((key) => {
        if (!Immutable.is(lastProps[key], nextProps[key]))
          update_needed = true;
      });
      if (update_needed)
        this.fetchData(nextProps);
    }
  };
};

DataFetcherMixin.componentWillMount = function() {
  throw new Error("DataFetcherMixin is a function that takes one or more " +
    "prop names to watch as parameters and returns the mixin, e.g.: " +
    "mixins: [DataFetcherMixin(\"Prop1\", \"Prop2\")]");
};

module.exports = DataFetcherMixin;
