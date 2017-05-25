import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {MapControl} from 'react-leaflet';
import {control, DomUtil} from 'leaflet';

export default class MapControlComponent extends MapControl {
  static propTypes = {
    className: React.PropTypes.string,
    position: React.PropTypes.string,
    children: React.PropTypes.node,
  };

  createLeafletElement({children, position, className}) {
    let con = control({position});
    con.onAdd = (map) => {
      let div = DomUtil.create('div', 'map-custom-control ' + className);
      div.innerHTML = ReactDOMServer.renderToStaticMarkup(React.cloneElement(React.Children.only(children), {flux: this.context.flux}));
      return div;
    };
    return con;
  }
}

MapControlComponent.contextTypes = {
  flux: React.PropTypes.object,
  map: React.PropTypes.object
};

