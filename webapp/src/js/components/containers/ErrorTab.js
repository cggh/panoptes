import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

let ErrorTab = createReactClass({
  displayName: 'ErrorTab',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    err: PropTypes.string
  },

  icon() {
    return 'exclamation-circle';
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
  },
});

export default ErrorTab;
