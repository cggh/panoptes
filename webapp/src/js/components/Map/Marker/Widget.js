import React from 'react';
import {Marker} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Lodash
import _isFunction from 'lodash/isFunction';

let MarkerWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },
  propTypes: {
    alt: React.PropTypes.string,
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    onClick: React.PropTypes.func,
    opacity: React.PropTypes.number,
    position: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.array, React.PropTypes.object]).isRequired,
    title: React.PropTypes.string,
    zIndexOffset: React.PropTypes.number
  },
  childContextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map
    };
  },

  render() {

    let {alt, children, onClick, opacity, position, title, zIndexOffset} = this.props;


    let adaptedMarkerProps = {};

    // Translate prop values from strings (used in templates)
    // into the required primitive types.

    if (children instanceof Array) {
      if (children.length > 1) {
        console.warn('MarkerWidget received more than one child. Using first child.');
        // NB: <Marker><foo /><bar /></ Marker> would error,
        // whereas <Marker><baz><foo /><bar /></baz></ Marker> is valid.
      }
      // NB: The single child object is often passed to Map components as the first element of an array.
      // However, an array would cause an error if it was passed forward as this component's children.
      adaptedMarkerProps.children = children[0];
    }

    if (onClick === undefined) {
      adaptedMarkerProps.onClick = (e) => null;
    } else {
      adaptedMarkerProps.onClick = (e) => onClick(e);
    }

    // TODO: Could also support individual positionLat and positionLng props.

    if (position instanceof Array) {
      // TODO: check the array looks like [0, 0]
      adaptedMarkerProps.position = position;
    } else if (position !== undefined && typeof position === 'object') {
      // TODO: check the object looks like {lat: 50, lng: 30} or {lat: 50, lon: 30}
      if (position.lat !== undefined) {
        adaptedMarkerProps.position = position;
      } else if (_isFunction(position.get)) {
        // TODO: check the object is a Map
        adaptedMarkerProps.position = {lat: position.get('lat'), lng: position.get('lng')};
      } else {
        console.error('position is an unhandled object: %o', position);
      }
    } else if (position !== undefined && typeof position === 'string') {
      // TODO: check the string looks like "[0, 0]" before trying to parse.
      let positionArrayFromString = JSON.parse(position);
      if (positionArrayFromString instanceof Array) {
        adaptedMarkerProps.position = positionArrayFromString;
      }
    }

    if (alt !== undefined) {
      adaptedMarkerProps.alt = alt;
    } else if (alt === undefined && title !== undefined) {
      adaptedMarkerProps.alt = title;
    }


    if (adaptedMarkerProps.position === undefined || adaptedMarkerProps.position === null) {
      console.error('MarkerWidget failed to determine position');
    }

    return (
      <Marker
        {...adaptedMarkerProps}
        opacity={opacity}
        title={title}
        zIndexOffset={zIndexOffset}
      />
    );

  }

});

module.exports = MarkerWidget;
