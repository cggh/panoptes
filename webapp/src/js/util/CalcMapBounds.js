// Lodash
import _maxBy from 'lodash/maxBy';
import _minBy from 'lodash/minBy';

function calcMapBounds(markers) {
  let L = window.L;
  let bounds = undefined;
  if (markers !== undefined && markers.length >= 1) {
    let northWest = L.latLng(_maxBy(markers, (marker) => marker.lat).lat, _minBy(markers, (marker) => marker.lng).lng);
    let southEast = L.latLng(_minBy(markers, (marker) => marker.lat).lat, _maxBy(markers, (marker) => marker.lng).lng);
    bounds = L.latLngBounds(northWest, southEast);
  }
  return bounds;
}

module.exports = {
  calcMapBounds
};
