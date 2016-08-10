import React from 'react';
import {FeatureGroup, Marker} from 'react-leaflet';
import DivIcon from 'react-leaflet-div-icon';

// Lodash
import _minBy from 'lodash/minBy';
import _maxBy from 'lodash/maxBy';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

//tmp
import HelloWorld from 'ui/HelloWorld';

function adaptMarker(payload) {

  let {props, key, markersCount, map, layerContainer} = payload;

  let adaptedMarker = null;


  if (props.isHighlighted || markersCount === 1) {
    // If this marker isHighlighted or if there is only one marker, give this marker the standard "big" icon.

    adaptedMarker = (
      <Marker
        key={key}
        position={{lat: Number(props.lat), lng: Number(props.lng)}}
        title={props.title}
        map={map}
        layerContainer={layerContainer}
      />
    );


  } else {
    // Otherwise (if this icon is not highlighted and there is more than one icon), give this marker a "small" icon.

    let L = window.L;

    // NB: L.divIcon({html: ''}) is a workaround to hide the default icon.

    // Using DivIcon so we can easily put JSX and React components in here, e.g. <HelloWorld msg="foobar" />

    //<svg height="16" width="16"><circle cx="8" cy="8" r="6" stroke="#BC0F0F" strokeWidth="1" fill="#F26C6C" /></svg>

    //<HelloWorld msg="foobar" />
console.log('adaptMarker payload: %o', payload);
console.log('adaptMarker props: %o', props);
    // adaptedMarker = (
    //   <DivIcon
    //     key={key}
    //     position={{lat: Number(props.lat), lng: Number(props.lng)}}
    //     title={props.title}
    //     icon={L.divIcon({html: ''})}
    //     map={map}
    //     layerContainer={layerContainer}
    //   >
    //     <svg className="user-location" viewBox="0 0 120 120" version="1.1"
    //       xmlns="http://www.w3.org/2000/svg">
    //       <circle cx="60" cy="60" r="50"/>
    //     </svg>
    //   </DivIcon>
    // );

    adaptedMarker = (
      <DivIcon
        key={key}
        position={{lat: Number(props.lat), lng: Number(props.lng)}}
        title={props.title}
        icon={L.divIcon({html: ''})}
        map={map}
        layerContainer={layerContainer}
      >
        <HelloWorld msg="foobar" />
      </DivIcon>
    );

  }


  return adaptedMarker;
}

let LayeredMapMarkerLayer = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    markers: React.PropTypes.arrayOf(React.PropTypes.object),
    color: React.PropTypes.string,
    children: React.PropTypes.node,
    map: React.PropTypes.object,
    layerContainer: React.PropTypes.object
  },

  handleClickMarker(e, marker) {
    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    // TODO: when left click, focus dataItemPopup. When middleclick, maintain focus on this component.
    this.getFlux().actions.panoptes.dataItemPopup({table: marker.table, primKey: marker.primKey.toString(), switchTo: !middleClick});
  },

  render() {

    let {markers, color, children, map, layerContainer} = this.props;

console.log('MarkerLayer props: %o', this.props);

// layerContainer={layerContainer} map={map} position={position}
console.log('MarkerLayer context: %o', this.context);

console.log('MarkerLayer children: %o', children);

    let mapMarkers = undefined;
    let bounds = undefined;

    if (markers === undefined && children !== undefined) {
console.log('MarkerLayer processing children');

      mapMarkers = [];

      for (let i = 0, len = children.length; i < len; i++) {
        let adaptedChild = adaptMarker({props: children[i].props, key: i, markersCount: len, map, layerContainer});
        mapMarkers.push(adaptedChild);
      }

    } else if (markers !== undefined) {

console.log('MarkerLayer processing markers');

      // TODO: bounds
      // if (markers.length >= 1) {
      //
      //   let L = window.L;
      //
      //   let northWest = L.latLng(_maxBy(markers, 'lat').lat, _minBy(markers, 'lng').lng);
      //   let southEast = L.latLng(_minBy(markers, 'lat').lat, _maxBy(markers, 'lng').lng);
      //
      //   bounds = L.latLngBounds(northWest, southEast);
      // }

      mapMarkers = [];

      for (let i = 0, len = markers.length; i < len; i++) {
        let adaptedMarker = adaptMarker({props: markers[i], key: i, markersCount: len, map, layerContainer});
        mapMarkers.push(adaptedMarker);
      }
    }

console.log('MarkerLayer mapMarkers: %o', mapMarkers);

    return <FeatureGroup color={color} map={map} layerContainer={layerContainer}>{mapMarkers}</FeatureGroup>;

  }

});

module.exports = LayeredMapMarkerLayer;
