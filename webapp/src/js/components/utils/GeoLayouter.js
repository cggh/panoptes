import {forceSimulation, forceLink, forceManyBody, forceCollide} from 'd3-force';
import React from 'react';

// Lodash
import _forEach from 'lodash/forEach';
import _values from 'lodash/values';
import _cloneDeep from 'lodash/cloneDeep';
import _assign from 'lodash/assign';

let GeoLayouter = React.createClass({
  propTypes: {
    nodes: React.PropTypes.array.isRequired,
    children: React.PropTypes.func.isRequired
  },

  shouldComponentUpdate() {
    return false;
  },

  getDefaultProps() {
    return {
      nodes: []
    };
  },

  contextTypes: {
    map: React.PropTypes.object,
  },

  updateNodes(nodes) {
    const {map} = this.context;
    //Work out which nodes we are adding, removing and updating by key
    let updatedRenderNodesByKey = {};
    let updatedFixedNodesByKey = {};
    let updateLinks = [];
    let fixedRadius = map.project(map.unproject({y: 0, x: 10}), 0).x
    let radiusScale = map.project(map.unproject({y: 0, x: 1}), 0).x;

    _forEach(nodes, (node) => {
      let {x, y} = map.project(node, 0);
      let {lat, lng} = node;
      let key = node.key;
      if (this.fixedNodesByKey[key] && this.renderNodesByKey[key]) {
        //We've seen this node copy across
        updatedFixedNodesByKey[key] = this.fixedNodesByKey[key];
        updatedRenderNodesByKey[key] = this.renderNodesByKey[key];
        //It's position might have changed so update the fixed node
        _assign(updatedFixedNodesByKey[key], {x, y, fx:x, fy:y, lat, lng}); //For the fixed node just move it so the linked node gets dragged towards it
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
        updatedFixedNodesByKey[key] = {x, y, fx:x, fy:y, lat, lng, fixed: true};
        updatedRenderNodesByKey[key] = Object.assign(node, {x, y, fixed: false, fixedNode: updatedFixedNodesByKey[key]})
      }
      updatedFixedNodesByKey[key].collisionRadius = fixedRadius;
      updatedRenderNodesByKey[key].collisionRadius = updatedRenderNodesByKey[key].radius * radiusScale
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
    this.sim.alpha(1);
    this.sim.restart();
  },
  // Lifecycle methods
  componentWillMount() {
    this.renderNodesByKey = {}; //Moving nodes that get rendered
    this.fixedNodesByKey = {}; //Fixed nodes that aren't rendered but provide collision points to prevent nodes covering their geopositions
    this.sim = forceSimulation()
    // Set up force options.
      .force("collide", forceCollide((node) => node.collisionRadius).strength(1))
      .force("link", forceLink().distance((link) => link.distance))
      .force("repel", forceManyBody().distanceMin(0.1).strength((node) => node.fixed ? 0 : -.30))
    ;
    this.updateNodes(this.props.nodes);
    // On every tick event triggered by d3's layout force, this.handleTick will be called.
    // The (x, y) of every force-applied node will be updated (potentially) on every tick.
    this.sim.on('tick', this.handleTick);
  },

  componentWillUnmount() {
    this.sim.stop();
  },

  componentWillReceiveProps(nextProps) {
    this.updateNodes(nextProps.nodes);
  },

  // Event handlers
  handleTick() {
    this.forceUpdate();
  },

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
});

export default GeoLayouter;
