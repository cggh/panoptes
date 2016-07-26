import _bind from 'lodash/bind';

let StoreWatchMixin = function() {
  let storeNames = Array.prototype.slice.call(arguments);
  return {
    componentDidMount: function() {
      if (!this.props.flux && (!this.context || !this.context.flux)) {
        let namePart = this.constructor.displayName ? ' of ' + this.constructor.displayName : '';
        throw new Error('Could not find flux on this.props or this.context' + namePart);
      }
      let flux = this.props.flux || (this.context && this.context.flux);
      storeNames.forEach(_bind(function(store) {
        flux.store(store).on('change', this._setStateFromFlux);
      }, this));
    },

    componentWillUnmount: function() {
      let flux = this.props.flux || (this.context && this.context.flux);
      storeNames.forEach(_bind(function(store) {
        flux.store(store).removeListener('change', this._setStateFromFlux);
      }, this));
    },

    _setStateFromFlux: function() {
      this.setState(this.getStateFromFlux());
    },

    getInitialState: function() {
      return this.getStateFromFlux();
    }
  };
};

StoreWatchMixin.componentWillMount = function() {
  throw new Error('StoreWatchMixin is a function that takes one or more ' +
    'store names as parameters and returns the mixin, e.g.: ' +
    'mixins: [StoreWatchMixin("Store1", "Store2")]');
};

module.exports = StoreWatchMixin;
