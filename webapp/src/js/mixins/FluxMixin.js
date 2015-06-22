const Fluxxor = require('fluxxor');
const React = require('react');
let FluxMixin = Fluxxor.FluxMixin(React);

FluxMixin.componentWillMount = function() {
  this.flux = this.getFlux();
};

module.exports = FluxMixin;
