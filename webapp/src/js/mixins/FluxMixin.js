import Fluxxor from 'fluxxor';
import React from 'react';
let FluxMixin = Fluxxor.FluxMixin(React);

FluxMixin.componentWillMount = function() {
  //As in this app we use a single flux instance we can fix it on init
  this.flux = this.getFlux();
};

module.exports = FluxMixin;
