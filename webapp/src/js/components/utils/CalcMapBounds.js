// Lodash
import _maxBy from 'lodash/maxBy';
import _minBy from 'lodash/minBy';

function calcMapBounds(markers) {
  let L = window.L;
  let bounds = undefined;

  // FIXME ???
  let markersArray = markers.toArray();

  if (markersArray !== undefined && markersArray.length >= 1) {

    let northWest = L.latLng(_maxBy(markersArray, (marker) => marker.get('lat')).get('lat'), _minBy(markersArray, (marker) => marker.get('lng')).get('lng'));
    let southEast = L.latLng(_minBy(markersArray, (marker) => marker.get('lat')).get('lat'), _maxBy(markersArray, (marker) => marker.get('lng')).get('lng'));

    bounds = L.latLngBounds(northWest, southEast);
  }

  return bounds;
}

module.exports = {
  calcMapBounds
};
