//This is a special case of StoreWatchMixin, which forces update on config change.
//As config changes should be rare this simplifies component code as config is kept out of component state.
//Note that this mixin requires that FluxMixin also be used, unless flux is passed as a prop.

let ConfigMixin = {
  componentWillMount() {
    if (!this.props.flux && (!this.context || !this.context.flux)) {
      let namePart = this.constructor.displayName ? ` of ${this.constructor.displayName}` : '';
      throw new Error(`Could not find flux on this.props or this.context${namePart}`);
    }
    let flux = this.props.flux || (this.context && this.context.flux);
    flux.store('ConfigStore').on('change', this._setConfigFromFlux);
    this.tableConfig = () => this.config.tablesById[this.props.table];
    this._setConfigFromFlux();
    this.propertiesByColumn = (column) => {
      let tableId, columnId = undefined;
      if (column.indexOf('.') !== -1) {
        [tableId, columnId] = column.split('.');
      } else {
        tableId = this.props.table;
        columnId = column;
      }
      if (this.config.tablesById[tableId] == undefined) {
        console.error(`Table ${tableId} does not exist in this.config.tablesById.`);
        return;
      }
      let properties = this.config.tablesById[tableId].propertiesById[columnId];
      if (properties == undefined) {
        console.error(`Properties not found for column ${columnId} in table ${tableId}.`);
        return;
      }
      return properties;
    };

  },

  componentWillUnmount() {
    let flux = this.props.flux || (this.context && this.context.flux);
    flux.store('ConfigStore').removeListener('change', this._setConfigFromFlux);
  },

  _setConfigFromFlux() {
    let flux = this.props.flux || (this.context && this.context.flux);
    this.config = flux.store('ConfigStore').getState();
    if (this.onConfigChange) this.onConfigChange();
    this.forceUpdate();
  }
};

export default ConfigMixin;
