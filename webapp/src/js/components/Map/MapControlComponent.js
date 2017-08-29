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
      ReactDOM.render(React.cloneElement(React.Children.only(children), {flux: this.context.flux}), this.div);
      return this.div;
    };
    con.onRemove = (map) => {
      ReactDOM.unmountComponentAtNode(this.div);
    };
    return con;
  }
}

MapControlComponent.contextTypes = {
  flux: PropTypes.object,
  map: PropTypes.object
};

MapControlComponent.displayName = 'MapControlComponent';
