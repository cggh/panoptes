import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

let Finder = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  getDefaultProps() {
    return {
      title: 'Find item',
      icon: 'search'
    };
  },

  icon() {
    return this.props.icon;
  },
  title() {
    return this.props.title;
  },

  render() {
    return (
      <div>
        <p>Please select what kind of element you want to search for:</p>
      </div>
    );
  }
});

module.exports = Finder;
