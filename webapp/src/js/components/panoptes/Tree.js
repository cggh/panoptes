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
    metadata: React.PropTypes.object,
    treeType: React.PropTypes.oneOf(_keys(treeTypes))
  },

  componentDidMount() {

    for (let i = 0, len = this.refs.phylocanvas.tree.leaves.length; i < len; i++) {

      let leaf = this.refs.phylocanvas.tree.leaves[i];

      let nodeColour = this.props.metadata[leaf.label] !== undefined ? this.props.metadata[leaf.label].nodeColour : 'inherit';
      let branchColour = this.props.metadata[leaf.label] !== undefined ? this.props.metadata[leaf.label].branchColour : 'inherit';

      leaf.setDisplay({
        colour: branchColour,
        shape: 'circle', // or square, triangle, star
        size: 10, // ratio of the base node size
        leafStyle: {
          strokeStyle: nodeColour,
          fillStyle: nodeColour
        },
        labelStyle: {
          colour: nodeColour
        },
      });

    }

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

export default Tree;
