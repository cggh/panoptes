import React from 'react';
import Phylocanvas from 'react-phylocanvas';
import {treeTypes} from 'phylocanvas';
import _keys from 'lodash/keys';

import PureRenderMixin from 'mixins/PureRenderMixin';
import DetectResize from 'utils/DetectResize';

import 'tree.scss';

let Tree = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    data: React.PropTypes.string,
    treeType: React.PropTypes.oneOf(_keys(treeTypes))
  },

  handleResize(size) {
    if (this.refs.phylocanvas.tree) {
      this.refs.phylocanvas.tree.resizeToContainer();
      this.refs.phylocanvas.tree.fitInPanel();
      this.refs.phylocanvas.tree.draw();
    }
  },

  render() {
    return (
      <DetectResize onResize={this.handleResize}>
        <Phylocanvas
          ref="phylocanvas"
          className="tree"
          {...this.props}
        />
      </DetectResize>
    );
  }

});

module.exports = Tree;
