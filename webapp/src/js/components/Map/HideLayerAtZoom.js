import PropTypes from 'prop-types';
import React from 'react';
import {MapComponent} from 'react-leaflet';
import _isUnDef from 'lodash.isundefined'

export default class HideLayerAtZoom extends MapComponent {
  static displayName = 'HideLayerAtZoom';

  constructor(props, context) {
    super(props, context);
    this.state = {
      zoom: undefined
    };
  }

  static propTypes = {
    above: PropTypes.number,
    below: PropTypes.number
  };

  static contextTypes = {
    map: PropTypes.object,
  };

  componentWillMount() {
    this.setState({zoom: this.context.map.getZoom()});
  }

  componentWillReceiveProps() {
    this.context.map.on('zoom', () => {
      this.setState({zoom: this.context.map.getZoom()})
    });
  }

  render() {
    let {children, above, below} = this.props;
    let {zoom} = this.state;
    if (!_isUnDef(above)) {
      return (zoom <= above) ? children : null;

    } else if (!_isUnDef(below)) {
      return (zoom > below) ? children : null;
    }

    return children;
  }
};
