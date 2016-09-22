import d3 from 'd3';
import React from 'react';

// Lodash
import _cloneDeep from 'lodash/cloneDeep';
import _each from 'lodash/each';
import _keyBy from 'lodash/keyBy';
import _zip from 'lodash/zip';

// Panoptes
import {latlngToMercatorXY, mercatorXYtolatlng} from 'util/WebMercator';

// External functions
function collide(node) {
  let r = node.collisionRadius + 16,
    nx1 = node.x - r,
    nx2 = node.x + r,
    ny1 = node.y - r,
    ny2 = node.y + r;
  return (quad, x1, y1, x2, y2) => {
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
  };
}
function createFixedAndNextRenderNodes(payload) {

  let {propNodes, prevRenderNodes} = payload;

  // The next set of nodes to render will be based on the nodes provided as props.
  let nextRenderNodes = _cloneDeep(propNodes);

  // The propNodes don't have an (x, y), but we can derive from their (lng, lat).
  nextRenderNodes.forEach(updateXYUsingLngLat);

  // The propNodes don't have radii suited for the -1 - 1 mercator projection,
  // but we can derive from their radii in degrees.
  nextRenderNodes.forEach(setCollisionRadius);

  // The fixedNodes will be at the coordinates of the original propNodes.
  let fixedNodes = _cloneDeep(propNodes);

  // Create the relationship between each fixedNode (which won't be rendered)
  // and its associated renderNode, and configure each fixedNode as fixed.
  _zip(fixedNodes, nextRenderNodes).forEach(
    ([fixedNode, nextRenderNode]) => {
      fixedNode.fixed = true;
      nextRenderNode.fixed = false;
        //Assign the fixed node so that the nextRenderNode knows where it came from.
      nextRenderNode.originalNode = fixedNode;
    }
  );

  // Copy all of the position data (x, y, lat, lng)
  // from the previous renderNodes (prevRenderNodes)
  // to the new set of renderNodes (nextRenderNodes).
  let existingRenderNodesByKey = _keyBy(prevRenderNodes, 'key');
  nextRenderNodes.forEach((node) => {
    if (existingRenderNodesByKey[node.key])
      ['x', 'y', 'lat', 'lng'].forEach((val) => node[val] = existingRenderNodesByKey[node.key][val]);
  });

  return {fixedNodes, nextRenderNodes};
}
function setCollisionRadius(node) {
  //Convert the radius from degrees to the -1 - 1 mercator projection.
  node.collisionRadius = latlngToMercatorXY({lat: 0, lng: node.radius}).x;
}
function updateLngLatUsingXY(node) {
  let {lat, lng} = mercatorXYtolatlng(node);
  node.lng = lng;
  node.lat = lat;
}
function updateXYUsingLngLat(node) {
  let {x, y} = latlngToMercatorXY(node);
  node.x = x;
  node.y = y;
}


let GeoLayouter = React.createClass({

  // GeoLayouter returns its children ("renderNodes") as a simple array.
  propTypes: {
    nodes: React.PropTypes.array.isRequired,
    children: React.PropTypes.func.isRequired
  },

  getDefaultProps() {
    return {
      nodes: []
    };
  },

  // Lifecycle methods
  componentWillMount() {

    // NB: renderNodes is a simple array, not immutable.
    this.renderNodes = [];

    // Since this.force.stop() will occur in componentWillUnmount(), this.force is initialized here.
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

    this.initForceUsingProps();
    this.force.start();

  },
  componentWillUnmount() {
    this.force.stop();
  },


  // Event handlers
  handleTick() {
    this.detectCollisions();
    this.forceUpdate();
  },

  // Internal functions
  detectCollisions() {
    let q = d3.geom.quadtree(this.renderNodes);
    _each(this.renderNodes, (node) =>
      q.visit(collide(node))
    );
  },
  initForceUsingProps() {

    // Convert the prop nodes from an Immutable List to a simple array.
    // .toArray() is shallow, .toJS() is deep.
    let propNodesAsArray = this.props.nodes;

    // Derive the fixedNodes and nextRenderNodes from the propNodes and previous renderNodes.
    let {fixedNodes, nextRenderNodes} = createFixedAndNextRenderNodes({propNodes: propNodesAsArray, prevRenderNodes: this.renderNodes});

    // Provide the force engine with all the nodes.
    this.force.nodes(fixedNodes.concat(nextRenderNodes));

    // Provide the force engine with all the links between the fixedNodes and their renderNodes
    // known by preceding .concat(nextRenderNodes)
    let forceLinks = [];
    for (let i = 0; i < fixedNodes.size; i++) {
      forceLinks.push({source: i, target: fixedNodes.size + i});
    }
    this.force.links(forceLinks);

    // Remember the new renderNodes (to render them on the next render).
    this.renderNodes = nextRenderNodes;
  },

  render() {

    // NB: this.forceUpdate(), which is called by this.handleTick(), causes a re-render,
    // in case the (x, y) of this.renderNodes has been updated by this.force() and this.detectCollisions()

    // Update the (lng, lat) of each renderNode using its (x, y)
    _each(this.renderNodes, updateLngLatUsingXY);

    return this.props.children(this.renderNodes);
  }
});

module.exports = GeoLayouter;
