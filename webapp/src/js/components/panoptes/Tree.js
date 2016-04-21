import React from 'react';
import Phylocanvas from 'react-phylocanvas';

import PureRenderMixin from 'mixins/PureRenderMixin';
import DetectResize from 'utils/DetectResize';

import 'tree.scss';

let Tree = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    data: React.PropTypes.string
  },

  handleResize(size) {
    if (this.refs.phylocanvas.tree) {
      this.refs.phylocanvas.tree.resizeToContainer();
      this.refs.phylocanvas.tree.fitInPanel();
      this.refs.phylocanvas.tree.draw();
    }
  },

  render() {
    const {data} = this.props;
    return (
      <DetectResize onResize={this.handleResize}>
        <Phylocanvas ref="phylocanvas" className="tree" data={data} />
      </DetectResize>
    );
  }

});

module.exports = Tree;
