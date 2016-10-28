//This is a special case of StoreWatchMixin, which forces update on config change.
//As config changes should be rare this simplifies component code as config is kept out of component state.
//Note that this mixin requires that FluxMixin also be used, unless flux is passed as a prop.

let ConfigMixin = {
  componentWillMount: function() {
    if (!this.props.flux && (!this.context || !this.context.flux)) {
      let namePart = this.constructor.displayName ? ' of ' + this.constructor.displayName : '';
      throw new Error('Could not find flux on this.props or this.context' + namePart);
    }
    let flux = this.props.flux || (this.context && this.context.flux);
    flux.store('ConfigStore').on('change', this._setConfigFromFlux);
    this.tableConfig = () => this.config.tablesById[this.props.table];
    this._setConfigFromFlux();

  },

  componentWillUnmount: function() {
    let flux = this.props.flux || (this.context && this.context.flux);
    flux.store('ConfigStore').removeListener('change', this._setStateFromFlux);
  },

  _setConfigFromFlux: function() {
    let flux = this.props.flux || (this.context && this.context.flux);
    this.config = flux.store('ConfigStore').getState();
    this.forceUpdate();
  }
};

export default ConfigMixin;
