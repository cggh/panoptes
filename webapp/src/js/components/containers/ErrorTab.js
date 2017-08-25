import PropTypes from 'prop-types';
import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

let ErrorTab = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    err: PropTypes.string
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

export default ErrorTab;
