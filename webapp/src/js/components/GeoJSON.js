import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {GeoJSON as LeafletGeoJSON, Popup} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let GeoJSON = createReactClass({
  displayName: 'GeoJSON',

  mixins: [
    FluxMixin
  ],

  propTypes: {
    json: PropTypes.object.isRequired,
    colour: PropTypes.string,
    weight: PropTypes.number,
    opacity: PropTypes.number,
    onClick: PropTypes.func,
    popup: PropTypes.node,
  },

  getDefaultProps() {
    return {
      colour: '#006400',
      weight: 2,
      opacity: 0.65
    };
  },

  render() {
    let {json, colour, weight, opacity, onClick, popup} = this.props;

    let style = {
      color: colour,
      weight,
      opacity
    };

    return (
      <LeafletGeoJSON data={json} style={style} onClick={onClick}>
        {popup ? <Popup minWidth={300}>{popup}</Popup> : null}
      </LeafletGeoJSON>);

  },
});

export default GeoJSON;
