const React = require('react');
const d3 = require('d3');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

// TODO: How to best name and place such helper functions?
function updateXYUsingLngLat(nodes) {

  for (let i = 0; i < nodes.length; i++) {

    nodes[i].x = nodes[i].lng * Math.cos(nodes[i].lat / 180 * Math.PI) * 40000 / 360;
    nodes[i].y = nodes[i].lat / 360 * 40000;
  }

  return nodes;
}


let GeoLayouter = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  getDefaultProps() {
    return {
      initialNodes: [],
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

    // Since this.force.stop() needs to occur in componentWillUnmount(), this.force is also initialized here.
    this.force = d3.layout.force();
    this.force.on('tick', this.onTick);

    this.force.gravity(0.2); // 0 is gravityless
    this.force.friction(0.1); // 1 is frictionless
    this.force.linkStrength(0.5); // 1 is rigid
    //this.force.linkDistance('100'); // TODO: positionOffset, deprecated?
    //this.force.charge(-999); // negative is repulsive

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

    // NB: The first time this is invoked, this.props.initialNodes is [] but not because of getDefaultProps()

    if (this.props.initialNodes.length > 0) {

      let fixedNodes = _.cloneDeep(this.props.initialNodes); // props should be treated as immutable
      fixedNodes = updateXYUsingLngLat(fixedNodes);

      // Clone needs to be deep, otherwise it will get fixed = true when fixedNodes is mutated later.
      let renderNodes = _.cloneDeep(fixedNodes);

      if (this.forceLinks) {
        // Remove the old lines from the map.
        for (let i = 0; i < this.forceLinks.length; i++) {
          if (this.forceLinks[i].line) {
            this.forceLinks[i].line.setMap(null);
          }
        }
      }

      this.forceLinks = [];
      for (let i = 0; i < this.props.initialNodes.length; i++) {

        this.forceLinks.push({source: i, target: this.props.initialNodes.length + i});

        fixedNodes[i].fixed = true;
        fixedNodes[i].render = false;
        fixedNodes[i].radius = 0;

        renderNodes[i].fixed = false;
        renderNodes[i].render = true;
        renderNodes[i].zoom = this.props.zoom;

        renderNodes[i].initialLng = this.props.initialNodes[i].lng;
        renderNodes[i].initialLat = this.props.initialNodes[i].lat;
      }

      this.forceNodes = fixedNodes.concat(renderNodes);

      this.force.nodes(this.forceNodes);
      this.force.links(this.forceLinks);

      // Don't apply any charge to fixedNodes.
      // Negative charge is repulsive.
      // Charge should be proportional to radius and inversely propoprtional to zoom level.
      this.force.charge(function(d) { return d.fixed ? 0 : (-2500 * d.radius * d.radius) / (d.zoom ? d.zoom : 1); });

      this.force.start();

    }

  },

  onStarted: function() {
    console.log('onStarted');
  },

  onStopped: function() {
    console.log('onStopped');
  },

  onTick: function() {

    // Define a dashed-line symbol for the force link Polyline.
    let lineSymbol = {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      scale: 1,
      strokeColor: '#000000',
      strokeWeight: 2
    };

    for (let i = 0; i < this.forceLinks.length; i++) {

      // Remove the old line from the map.
      if (this.forceLinks[i].line) {
        this.forceLinks[i].line.setMap(null);
      }

      // Create a new Polyline using the maps API.
      this.forceLinks[i].line = new this.props.maps.Polyline({
        path: [
          new this.props.maps.LatLng(this.forceLinks[i].source.lat, this.forceLinks[i].source.lng),
          new this.props.maps.LatLng(this.forceLinks[i].target.lat, this.forceLinks[i].target.lng)
        ],
        strokeOpacity: 0,
        icons: [{
          icon: lineSymbol,
          offset: '0',
          repeat: '6px'
        }]
      });

      // Add the Polyline to the map.
      this.forceLinks[i].line.setMap(this.props.map);

    }

    this.forceUpdate();
  },

  render: function() {

    console.log('render');

    // Extract the renderNodes from the forceNodes

    let renderNodes = [];
    for (let i = 0; i < this.forceNodes.length; i++) {

      if (this.forceNodes[i].render) {

        // Update the (lng, lat) of this node using the new (x, y) coordinates.
        this.forceNodes[i].lng = this.forceNodes[i].x / Math.cos(this.forceNodes[i].lat / 180 * Math.PI) / 40000 * 360;
        this.forceNodes[i].lat = this.forceNodes[i].y / 40000 * 360;

        renderNodes.push(this.forceNodes[i]);
      }

    }

    return this.props.children(renderNodes);
  }
});

module.exports = GeoLayouter;
