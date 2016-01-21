const React = require('react');
const d3 = require('d3');
const _cloneDeep = require('lodash/cloneDeep');
const _each = require('lodash/each');
const _zip = require('lodash/zip');
const {latlngToMercatorXY, mercatorXYtolatlng} = require('util/WebMercator');


// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

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

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  getDefaultProps() {
    return {
      nodes: [],
      positionOffsetFraction: 0, // TODO: Deprecate?
      zoom: 1
    };
  },

  componentWillMount() {

    // Invoked once, both on the client and server, immediately before the initial rendering occurs.
    //  If you call setState within this method, render() will see the updated state and will be executed only once despite the state change.

    console.log('componentWillMount');

    // Since this.forceNodes is used in render(), this.forceNodes is initialized here.
    this.forceNodes = [];
    this.renderNodes = [];

    // Since this.force.stop() needs to occur in componentWillUnmount(), this.force is also initialized here.
    this.force = d3.layout.force();
    this.force.on('tick', this.onTick);

    this.force.gravity(0); // 0 is gravityless
    this.force.friction(0.1); // 1 is frictionless
    this.force.linkStrength(0.1); // 1 is rigid
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

    // Invoked immediately before a component is unmounted from the DOM.
    // Perform any necessary cleanup in this method, such as invalidating timers
    //  or cleaning up any DOM elements that were created in componentDidMount.

    console.log('componentWillUnmount');

    this.force.stop();
  },

  componentWillReceiveProps() {

    // Invoked when a component is receiving new props. This method is not called for the initial render.
    // Use this as an opportunity to react to a prop transition before render() is called by updating the state using this.setState().
    //  The old props can be accessed via this.props. Calling this.setState() within this function will not trigger an additional render.

    console.log('componentWillReceiveProps');

    // NB: The first time this is invoked, this.props.nodes is [] but not because of getDefaultProps()

    if (this.props.nodes.length > 0) {

      let fixedNodes = _cloneDeep(this.props.nodes); // props should be treated as immutable
      _each(fixedNodes, updateXYUsingLngLat);
      _each(fixedNodes, setRadius);

      // Clone needs to be deep, otherwise it will get fixed = true when fixedNodes is mutated later.
      this.renderNodes = _cloneDeep(fixedNodes);
      //Assign the fixed node so that the renderNode knows where it came from.
      _each(_zip(fixedNodes, this.renderNodes), ([fixedNode, renderNode]) =>
        renderNode.originalNode = fixedNode
      );

      this.forceLinks = [];
      for (let i = 0; i < this.props.nodes.length; i++) {
        this.forceLinks.push({source: i, target: this.props.nodes.length + i});
        fixedNodes[i].fixed = true;
        this.renderNodes[i].fixed = false;
      }

      this.forceNodes = fixedNodes.concat(this.renderNodes);

      this.force.nodes(this.forceNodes);
      this.force.links(this.forceLinks);
      this.force.start();

    }

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
          node.x -= x *= l;
          node.y -= y *= l;
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
    console.log('onStarted');
  },

  onStopped() {
    console.log('onStopped');
  },

  onTick() {
    this.detectCollisions();
    this.forceUpdate();
  },

  render() {
    console.log('render');
    // Extract the renderNodes from the forceNodes
    _each(this.renderNodes, updateLngLatUsingXY);
    return this.props.children(this.renderNodes);
  }
});

module.exports = GeoLayouter;
