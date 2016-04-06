import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

import 'geo-marker.scss';

let GeoMarker = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    title: React.PropTypes.string,
    radius: React.PropTypes.number,
    onClick: React.PropTypes.func,
    isHighlighted: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      radius: 10
    };
  },

  render() {
    let {title, radius, onClick, isHighlighted} = this.props;

    let classNames = 'geo-marker';
    if (isHighlighted) {
      classNames += ' geo-marker-highlighted';
    }

    return (
      <svg style={{overflow: 'visible'}} width="50" height="50">
        <g className={classNames} onClick={onClick} transform={'translate(0, 0)'}>
          <title>{title}</title>
          <circle cx="0" cy="0" r={radius} />
        </g>
      </svg>
    );

  }

});

module.exports = GeoMarker;
