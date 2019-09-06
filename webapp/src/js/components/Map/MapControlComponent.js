import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import {MapControl} from 'react-leaflet';
import {control, DomUtil} from 'leaflet';

export default class MapControlComponent extends MapControl {
  static propTypes = {
    className: PropTypes.string,
    position: PropTypes.string,
    children: PropTypes.node,
  };

  createLeafletElement({children, position, className}) {
    let con = control({position});
    con.onAdd = (map) => {
      this.div = DomUtil.create('div', `map-custom-control ${className}`);
      return this.div;
    };
    con.onRemove = (map) => {
      ReactDOM.unmountComponentAtNode(this.div);
    };
    return con;
  }

  render() {
    if (this.div)
      return ReactDOM.createPortal(
        this.props.children,
        this.div
      );
    else {
      this.forceUpdate(); //We need a second render as onAdd is only triggered by the first.
      return null;
    }
  }
}

MapControlComponent.contextTypes = {
  flux: PropTypes.object,
  map: PropTypes.object
};

MapControlComponent.displayName = 'MapControlComponent';
