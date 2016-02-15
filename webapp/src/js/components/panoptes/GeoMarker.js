import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

import 'geo-marker.scss';

// Constants in this component
// TODO: to go in config?
const DEFAULT_OUTER_RADIUS = 10;

let GeoMarker = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    name: React.PropTypes.string,
    radius: React.PropTypes.number,
    onClick: React.PropTypes.func,
    lat: React.PropTypes.number,
    lng: React.PropTypes.number,
    originalLat: React.PropTypes.number,
    originalLng: React.PropTypes.number
  },

  getDefaultProps() {
    return {
      residualFractionName: 'Other'
    };
  },

  render() {
    let {name, radius, onClick} = this.props;
    let geoService = this.props.$geoService;

    let outerRadius = DEFAULT_OUTER_RADIUS;
    if (radius) {
      outerRadius = geoService.project({lat: 0, lng: radius}).x - geoService.project({lat: 0, lng: 0}).x;
    }

    let height = 50;
    let width = 50;
    let translateX = 0;
    let translateY = 0;

    let location = geoService.project(this.props);
    let originalLocation = geoService.project({lat: this.props.originalLat, lng: this.props.originalLng});

    return (
      <svg style={{overflow: 'visible'}} width={width} height={height}>
          <g className="geo-marker" onClick={onClick} transform={'translate(' + translateX + ', ' + translateY + ')'}>
            <title>{name}</title>
            <circle cx="0" cy="0" r={outerRadius} />
          </g>
        <line className="geo-marker-line"
              x1="0" y1="0"
              x2={originalLocation.x - location.x} y2={originalLocation.y - location.y}/>
      </svg>
    );

  }

});

module.exports = GeoMarker;
