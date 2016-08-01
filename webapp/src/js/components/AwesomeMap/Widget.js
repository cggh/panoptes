import React from 'react';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let AwesomeMapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  title() {
    return this.props.title;
  },

  render() {
    return (
      <div style={{backgroundColor: 'red', height: '100%'}}>This is awesome!</div>
    );

  }

});

module.exports = AwesomeMapWidget;
