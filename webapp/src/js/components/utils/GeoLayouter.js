import d3 from 'd3';
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
    return false
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
    _forEach(_cloneDeep(nodes), (node) => {
      let {x, y} = map.project(node,0);
      node.x = x;
      node.y = y;
      let key = node.key;
      if (this.fixedNodesByKey[key] && this.renderNodesByKey[key]) {
        //We've seen this node so just copy across and update it's properties
        updatedFixedNodesByKey[key] = this.fixedNodesByKey[key];
        updatedRenderNodesByKey[key] = this.renderNodesByKey[key];
        let {x, y, px, py, index, weight, ...others} = node;
        _assign(updatedFixedNodesByKey[key], {x, y}); //For the fixed node just move it so the linked node gets dragged towards it
        _assign(updatedRenderNodesByKey[key], others); //For the render node change everything but force-related quantities
      } else {
        //This node is new
        let {x, y, lat, lng} = node;
        updatedFixedNodesByKey[key] = {x, y, lat, lng, fixed: true};
        node.fixed = false;
        node.fixedNode = updatedFixedNodesByKey[key];
        updatedRenderNodesByKey[key] = node;
      }
      updateLinks.push({source: updatedFixedNodesByKey[key], target: updatedRenderNodesByKey[key]});
    });
    this.fixedNodesByKey = updatedFixedNodesByKey;
    this.renderNodesByKey = updatedRenderNodesByKey;
    this.renderNodes = _values(updatedRenderNodesByKey);
    //Update the collision radius
    let radiusScale = map.project(map.unproject({y:0, x:1}),0).x;
    _forEach(this.renderNodes, (node) => node.collisionRadius = node.radius * radiusScale);
    this.force.nodes(_values(updatedFixedNodesByKey).concat(this.renderNodes));
    this.force.links(updateLinks);
    this.force.start();
  },
  // Lifecycle methods
  componentWillMount() {
    this.renderNodesByKey = {}; //Moving nodes that get rendered
    this.fixedNodesByKey = {}; //Fixed nodes that aren't rendered but provide a restoring force to the moving nodes actual position
    this.force = d3.layout.force();
    // On every tick event triggered by d3's layout force, this.handleTick will be called.
    // The (x, y) of every force-applied node will be updated (potentially) on every tick.
    this.force.on('tick', this.handleTick);

    // Set up force options.
    this.force.gravity(0); // 0 is gravityless
    this.force.friction(0.1); // 1 is frictionless
    this.force.linkStrength(0.9); // 1 is rigid
    this.force.linkDistance(0); // Ideally renderNodes should be on top of fixedNodes
    this.force.charge(0); // negative is repulsive

    // TODO: .size([width, height]) according to box size
    //let width = 1500, height = 1400;
    //this.force.size([width, height]); // Affects the gravitational center, i.e. [ x/2, y/2 ]

    this.updateNodes(this.props.nodes);
  },

  componentWillUnmount() {
    this.force.stop();
  },

  componentWillReceiveProps(nextProps) {
    this.updateNodes(nextProps.nodes);
  },

  // Event handlers
  handleTick() {
    let q = d3.geom.quadtree(this.renderNodes);
    _forEach(this.renderNodes, (node) => {
        let r = node.collisionRadius + 16;
        let nx1 = node.x - r;
        let nx2 = node.x + r;
        let ny1 = node.y - r;
        let ny2 = node.y + r;
        q.visit((quad, x1, y1, x2, y2) => {
          if (quad.point && (quad.point !== node)) {
            let x = node.x - quad.point.x,
              y = node.y - quad.point.y,
              l = Math.sqrt(x * x + y * y),
              r = node.collisionRadius + quad.point.collisionRadius;
            if (l < r) {
              l = (l - r) / l * .5;
              node.x -= x *= l * 0.15;
              node.y -= y *= l * 0.15;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
      }
    );
    this.forceUpdate();
  },

  render() {
    // NB: this.forceUpdate(), which is called by this.handleTick(), causes a re-render,
    // in case the (x, y) of this.renderNodes has been updated by this.force() and this.detectCollisions()

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
