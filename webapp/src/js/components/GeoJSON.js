import PropTypes from 'prop-types';
import React from 'react';
import {GeoJSON as LeafletGeoJSON} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let GeoJSON = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    json: PropTypes.object.isRequired,
    colour: PropTypes.string,
    weight: PropTypes.number,
    opacity: PropTypes.number
  },

  getDefaultProps() {
    return {
      colour: '#006400',
      weight: 2,
      opacity: 0.65
    };
  },

  render() {
    let {json, colour, weight, opacity} = this.props;

    let style = {
      color: colour,
      weight,
      opacity
    };

    return (<LeafletGeoJSON data={json} style={style} />);

  }

});

export default GeoJSON;
