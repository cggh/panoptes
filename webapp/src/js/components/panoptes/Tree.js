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

    console.log('Tree this.refs.phylocanvas.tree: %o', this.refs.phylocanvas.tree);
    console.log('Tree this.props.metadata: %o', this.props.metadata);

    console.log('Tree this.props: %o', this.props);

    for (let i = 0, len = this.refs.phylocanvas.tree.leaves.length; i < len; i++) {

      this.refs.phylocanvas.tree.leaves[i].setDisplay({
        colour: 'red',
        shape: 'circle', // or square, triangle, star
        size: 3, // ratio of the base node size
        leafStyle: {
          strokeStyle: '#0000ff',
          fillStyle: 'rgb(0, 255, 0)',
          lineWidth: 2,
        },
        labelStyle: {
          colour: 'black',
          textSize: 20, // points
          font: 'Arial',
          format: 'bold',
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
