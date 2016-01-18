const _ = require('lodash');
const React = require('react');

let ConfigMixin = {
  componentWillMount: function() {
    if (!this.props.config && (!this.context || !this.context.config)) {
        var namePart = this.constructor.displayName ? ' of ' + this.constructor.displayName : '';
        throw new Error('Could not find config on this.props or this.context' + namePart);
      }
    this.config = this.getConfig();
  },

  childContextTypes: {
    config: React.PropTypes.object
  },

  contextTypes: {
    config: React.PropTypes.object
  },

  getChildContext: function() {
    return {
        config: this.getConfig()
      };
  },

  getConfig: function() {
    return this.props.config || (this.context && this.context.config);
  }
};

module.exports = ConfigMixin;
