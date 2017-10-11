// Lodash
import _maxBy from 'lodash.maxby';
import _minBy from 'lodash.minby';
import leaflet from 'leaflet';

function calcMapBounds(markers) {
  let bounds = undefined;
  if (markers !== undefined && markers.length >= 1) {
    let northWest = leaflet.latLng(_maxBy(markers, (marker) => marker.lat).lat, _minBy(markers, (marker) => marker.lng).lng);
    let southEast = leaflet.latLng(_minBy(markers, (marker) => marker.lat).lat, _maxBy(markers, (marker) => marker.lng).lng);
    bounds = leaflet.latLngBounds(northWest, southEast);
  }
  return bounds;
}

function calcMapBoundsFromGeoJsonObjects(objects) {
  let bounds = undefined;
  objects.forEach((object) => {
    let newBounds = leaflet.geoJson(object).getBounds();
    if (bounds) {
      bounds.extend(newBounds);
    } else {
      bounds = newBounds;
    }
  });
  return bounds
}

export default {
  calcMapBounds,
  calcMapBoundsFromGeoJsonObjects
};
