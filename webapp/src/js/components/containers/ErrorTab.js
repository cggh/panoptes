import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

let ErrorTab = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    err: React.PropTypes.string
  },

  icon() {
    return 'warning';
  },
  title() {
    return 'Error';
  },

  render() {
    return (
      <div className="centering-container">
        <div className="error"> Error: {this.props.err} </div>
      </div>
    );
  }
});

module.exports = ErrorTab;
