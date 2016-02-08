import React from 'react';
import d3 from 'd3';
import _cloneDeep from 'lodash/cloneDeep';
import _each from 'lodash/each';
import _zip from 'lodash/zip';
import _keyBy from 'lodash/keyBy';
import {latlngToMercatorXY, mercatorXYtolatlng} from 'util/WebMercator';


// Mixins
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';

// TODO: How to best name and place such helper functions?
function updateXYUsingLngLat(node) {
  let {x, y} = latlngToMercatorXY(node);
  node.x = x;
  node.y = y;
}
function updateLngLatUsingXY(node) {
  let {lat, lng} = mercatorXYtolatlng(node);
  node.lng = lng;
  node.lat = lat;
}
function setRadius(node) {
  //Convert the radius from degress to the -1 - 1 mercator projection.
  node.collisionRadius = latlngToMercatorXY({lat: 0, lng: node.radius}).x;
}


let GeoLayouter = React.createClass({

  propTypes: {
    nodes: ImmutablePropTypes.list
  },

  getDefaultProps() {
    return {
      nodes: Immutable.List(),
      positionOffsetFraction: 0, // TODO: Deprecate?
      zoom: 1
    };
  },

  componentWillMount() {

    // Invoked once, both on the client and server, immediately before the initial rendering occurs.
    //  If you call setState within this method, render() will see the updated state and will be executed only once despite the state change.

    this.renderNodes = [];

    // Since this.force.stop() needs to occur in componentWillUnmount(), this.force is also initialized here.
    this.force = d3.layout.force();
    this.force.on('tick', this.onTick);

    this.force.gravity(0); // 0 is gravityless
    this.force.friction(0.1); // 1 is frictionless
    this.force.linkStrength(0.9); // 1 is rigid
    this.force.linkDistance(0); // Ideally renderNodes should be on top of fixedNodes
    this.force.charge(0); // negative is repulsive

    // TODO: .size([width, height]) according to box size
    //let width = 1500, height = 1400;
    //this.force.size([width, height]); // Affects the gravitational center, i.e. [ x/2, y/2 ]

    // tmp
    this.force.on('start', this.onStarted);
    this.force.on('end', this.onStopped);

  },

  componentWillUnmount() {
    this.force.stop();
  },

  componentWillReceiveProps(nextProps) {
    //Before we do anything check to see if there are any meaningful changes
    if (this.props.nodes === nextProps.nodes)
      return;
    let nodes = nextProps.nodes.toJS();
    nodes.forEach(updateXYUsingLngLat);
    nodes.forEach(setRadius);

    let fixedNodes = _cloneDeep(nodes);
    _zip(fixedNodes, nodes).forEach(([fixedNode, renderNode]) => {
      fixedNode.fixed = true;
      renderNode.fixed = false;
        //Assign the fixed node so that the renderNode knows where it came from.
      renderNode.originalNode = fixedNode;
    }
    );

    //Copy over existing positions
    let existingRenderNodesByKey = _keyBy(this.renderNodes, 'key');
    nodes.forEach((node) => {
      if (existingRenderNodesByKey[node.key])
        ['x', 'y', 'lat', 'lng'].forEach((val) => node[val] = existingRenderNodesByKey[node.key][val]);
    });

    this.force.nodes(fixedNodes.concat(nodes));
    let forceLinks = [];
    for (let i = 0; i < nodes.length; i++) {
      forceLinks.push({source: i, target: nodes.length + i});
    }
    this.force.links(forceLinks);
    this.renderNodes = nodes;
    this.force.start();
  },

  collide(node) {
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
  },

  detectCollisions() {
    let q = d3.geom.quadtree(this.renderNodes);
    _each(this.renderNodes, (node) =>
      q.visit(this.collide(node))
    );
  },

  onStarted() {
  },

  onStopped() {
  },

  onTick() {
    this.detectCollisions();
    this.forceUpdate();
  },

  render() {
    // Extract the renderNodes from the forceNodes
    _each(this.renderNodes, updateLngLatUsingXY);
    return this.props.children(this.renderNodes);
  }
});

module.exports = GeoLayouter;
