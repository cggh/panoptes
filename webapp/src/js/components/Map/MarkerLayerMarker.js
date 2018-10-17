import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import PropTypes from 'prop-types';

//Child of MarkersLayer

let MarkerLayerMarker = createReactClass({
  displayName: 'MarkerLayerMarker',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    children: PropTypes.node,
  },

  render() {
    return undefined; // This component is just a wrapper. See MarkersLayer.
  },
});

export default MarkerLayerMarker;
