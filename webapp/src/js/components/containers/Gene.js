import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

let Gene = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    geneId: React.PropTypes.string.isRequired
  },

  getDefaultProps() {
    return {
      title: 'Gene',
      icon: 'bitmap:genomebrowser.png',
      initialPane: null
    };
  },

  icon() {
    return this.props.icon;
  },

  title() {
    return 'Gene ' + this.props.geneId;
  },

  render() {
    let {geneId} = this.props;

    return (
      <div>
        <p>geneId: {geneId}</p>
        <p>TODO: open in GenomeBrowser; table query popup/tab; GeneDB</p>
      </div>
    );

  }

});

module.exports = Gene;
