import {forceSimulation, forceLink, forceManyBody, forceCollide} from 'd3-force';
import PropTypes from 'prop-types';
import React from 'react';

// Lodash
import _forEach from 'lodash.foreach';
import _values from 'lodash.values';
import _assign from 'lodash.assign';
import _min from 'lodash.min';

const NODE_MARGIN = 5;

//Cribbed from https://github.com/d3/d3-force/blob/master/src/link.js
let forceCrossLink = function(links) {
  if (links == null) links = [];
  function force(alpha) {
    for (let i = 0, n = links.length; i < n; i++) {
      //Source is fixed node, target is render
      let linkA = links[i], sourceA = linkA.source, targetA = linkA.target;
      for (let j = i + 1; j < n; j++) {
        let linkB = links[j], sourceB = linkB.source, targetB = linkB.target;
        let s1_x, s1_y, s2_x, s2_y;
        s1_x = targetA.x - sourceA.x;
        s1_y = targetA.y - sourceA.y;
        s2_x = targetB.x - sourceB.x;
        s2_y = targetB.y - sourceB.y;
        let s, t;
        s = (-s1_y * (sourceA.x - sourceB.x) + s1_x * (sourceA.y - sourceB.y)) / (-s2_x * s1_y + s1_x * s2_y);
        t = ( s2_x * (sourceA.y - sourceB.y) - s2_y * (sourceA.x - sourceB.x)) / (-s2_x * s1_y + s1_x * s2_y);

        if (s >= 0 && s <= 1 && t >= 0 && t <= 1 && !(sourceA.x === sourceB.x && sourceA.y === sourceB.y)) {
          // Collision detected - swap the positions of the targets
          [targetA.x, targetB.x] = [targetB.x, targetA.x];
          [targetA.y, targetB.y] = [targetB.y, targetA.y];
        }
      }
    }
  }

  force.links = function(_) {
    links = _;
  };
  return force;
};

class GeoLayouter extends React.Component {
  static displayName = 'GeoLayouter';

  static contextTypes = {
    map: PropTypes.object,
  };

  static defaultProps = {
    nodes: []
  };

  static propTypes = {
    nodes: PropTypes.array.isRequired,
    children: PropTypes.func.isRequired
  };

  // Lifecycle methods
  componentWillMount() {
    this.renderNodesByKey = {}; //Moving nodes that get rendered
    this.fixedNodesByKey = {}; //Fixed nodes that aren't rendered but provide collision points to prevent nodes covering their geopositions
    this.sim = forceSimulation()
    // Set up force options.
      .force('collide', forceCollide((node) => node.collisionRadius).strength(1))
      .force('link', forceLink().distance((link) => link.distance).strength(1))
      .force('cross', forceCrossLink())
      // .force("repel", forceManyBody().strength((node) => node.fixed ? 0 : -.10).distanceMax(1))
    ;
    this.updateNodes(this.props.nodes);
    // On every tick event triggered by d3's layout force, this.handleTick will be called.
    // The (x, y) of every force-applied node will be updated (potentially) on every tick.
    this.sim.on('tick', this.handleTick);
  }

  componentWillReceiveProps(nextProps) {
    this.updateNodes(nextProps.nodes);
  }

  shouldComponentUpdate() {
    return false;
  }

  componentWillUnmount() {
    this.sim.stop();
  }

  // Event handlers
  handleTick = () => {
    this.forceUpdate();
  };

  updateNodes = (nodes) => {
    const {map} = this.context;
    //Work out which nodes we are adding, removing and updating by key
    let updatedRenderNodesByKey = {};
    let updatedFixedNodesByKey = {};
    let updateLinks = [];
    let fixedRadius = map.project(map.unproject({y: 0, x: 5}), 0).x;
    let radiusScale = map.project(map.unproject({y: 0, x: 1}), 0).x;

    let onlyNewNodes = true;
    _forEach(nodes, (node) => {
      let {x, y} = map.project(node, 0);
      let {lat, lng} = node;
      let key = node.key;
      if (this.fixedNodesByKey[key] && this.renderNodesByKey[key]) {
        //We've seen this node copy across
        onlyNewNodes = false;
        updatedFixedNodesByKey[key] = this.fixedNodesByKey[key];
        updatedRenderNodesByKey[key] = this.renderNodesByKey[key];
        //It's position might have changed so update the fixed node
        _assign(updatedFixedNodesByKey[key], {x, y, fx: x, fy: y, lat, lng}); //For the fixed node just move it so the linked node gets dragged towards it
        let clone = Object.assign({}, node);
        delete clone.x;
        delete clone.y;
        delete clone.lat;
        delete clone.lng;
        delete clone.vx;
        delete clone.vy;
        delete clone.index;
        //Don't modify the position or velocity of the render node, just copy across all other properties
        _assign(updatedRenderNodesByKey[key], clone); //For the render node change everything but force-related quantities
      } else {
        //This node is new
        updatedFixedNodesByKey[key] = {x, y, fx: x, fy: y, lat, lng, fixed: true};
        const initialOffset = Math.sqrt(Math.pow((node.radius + NODE_MARGIN) * radiusScale, 2) / 2);
        updatedRenderNodesByKey[key] = Object.assign(node, {x: x - initialOffset, y: y - initialOffset, fixed: false, fixedNode: updatedFixedNodesByKey[key]});
      }
      updatedFixedNodesByKey[key].collisionRadius = fixedRadius;
      updatedRenderNodesByKey[key].collisionRadius = (updatedRenderNodesByKey[key].radius + NODE_MARGIN) * radiusScale;
      updateLinks.push({
        source: updatedFixedNodesByKey[key],
        target: updatedRenderNodesByKey[key],
        distance: updatedRenderNodesByKey[key].collisionRadius + updatedFixedNodesByKey[key].collisionRadius
      });
    });
    this.fixedNodesByKey = updatedFixedNodesByKey;
    this.renderNodesByKey = updatedRenderNodesByKey;
    this.renderNodes = _values(updatedRenderNodesByKey);
    let allNodes = _values(_values(updatedFixedNodesByKey)).concat(this.renderNodes);
    this.sim.nodes(allNodes);
    this.sim.force('link').links(updateLinks);
    this.sim.force('cross').links(updateLinks);
    this.sim.alpha(1);
    this.sim.restart();
    if (onlyNewNodes) {
      for (let i = 0; i < 500; i++) {
        this.sim.tick();
      }
    }
  };

  render() {
    // NB: this.forceUpdate(), which is called by this.handleTick(), causes a re-render,
    // in case the (x, y) of this.renderNodes has been updated by this.sim() and this.detectCollisions()

    // Update the (lng, lat) of each renderNode using its (x, y)
    _forEach(this.renderNodes, (node) => {
      let {lat, lng} = this.context.map.unproject(node, 0);
      // lat = Math.random()*10+lat
      node.lng = lng;
      node.lat = lat;
    });

    return this.props.children(this.renderNodes);
  }
}

export default GeoLayouter;
