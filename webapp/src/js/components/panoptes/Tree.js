import PropTypes from 'prop-types';
import React from 'react';
import Phylocanvas from 'react-phylocanvas';
import {treeTypes} from 'phylocanvas';

import _keys from 'lodash.keys';
import _isEqual from 'lodash.isequal';

import PureRenderMixin from 'mixins/PureRenderMixin';
import DetectResize from 'utils/DetectResize';

import 'tree.scss';

let Tree = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    data: PropTypes.string,
    metadata: PropTypes.object,
    treeType: PropTypes.oneOf(_keys(treeTypes))
  },

  componentDidMount() {
    this.updateTree();
  },

  componentDidUpdate(prevProps) {
    if (!_isEqual(this.props.metadata, prevProps.metadata)) {
      this.updateTree();
    }
  },

  handleResize(size) {
    var tree = this.phylocanvas.tree;
    if (tree) {
      tree.resizeToContainer();
      tree.fitInPanel();
      tree.draw();
    }
  },

  updateTree() {

    this.phylocanvas.tree.setNodeSize(8);

    for (let i = 0, len = this.phylocanvas.tree.leaves.length; i < len; i++) {

      let leaf = this.phylocanvas.tree.leaves[i];
      let nodeColour = this.props.metadata[leaf.label] !== undefined ? this.props.metadata[leaf.label].nodeColour : 'inherit';
      let branchColour = this.props.metadata[leaf.label] !== undefined ? this.props.metadata[leaf.label].branchColour : 'inherit';

      leaf.setDisplay({
        colour: branchColour,
        leafStyle: {
          strokeStyle: nodeColour,
          fillStyle: nodeColour
        },
        labelStyle: {
          colour: nodeColour
        },
      });

    }

    this.phylocanvas.tree.draw();
  },

  render() {
    return (
      <DetectResize onResize={this.handleResize}>
        <Phylocanvas
          ref={(ref) => this.phylocanvas = ref}
          className="tree"
          {...this.props}
        />
      </DetectResize>
    );
  }

});

export default Tree;
