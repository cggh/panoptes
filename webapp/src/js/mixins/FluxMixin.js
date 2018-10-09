import {FluxMixin as FM}  from '@demiazz/fluxxor';
import React from 'react';
let FluxMixin = FM;

FluxMixin.componentWillMount = function() {
  //As in this app we use a single flux instance we can fix it on init
  this.flux = this.getFlux();
};

export default FluxMixin;
