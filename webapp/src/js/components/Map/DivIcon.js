/* Credit
https://github.com/jgimbel/react-leaflet-div-icon/blob/master/div-icon.js
*/
import PropTypes from 'prop-types';

import React, {Children} from 'react';
import {render, unmountComponentAtNode} from 'react-dom';
import {DivIcon as LeafletDivIcon, marker} from 'leaflet';
import {MapLayer, Popup, PropTypes as mapPropTypes} from 'react-leaflet';

export default class DivIcon extends MapLayer {
  static displayName = 'DivIcon';

  static propTypes = {
    opacity: PropTypes.number,
    zIndexOffset: PropTypes.number,
    popup: PropTypes.node,
  };

  static childContextTypes = {
    popupContainer: PropTypes.object,
    flux: PropTypes.object
  };

  static contextTypes = {
    flux: PropTypes.object,
    map: mapPropTypes.map,
    layerContainer: mapPropTypes.layerContainer,
    pane: PropTypes.string
  };

  getChildContext() {
    return {
      popupContainer: this.leafletElement,
      flux: this.props.flux || (this.context && this.context.flux)
    };
  }

  createLeafletElement(props) {
    const {position, ...otherProps} = props;
    this.icon = new LeafletDivIcon(otherProps);
    let leafletElement = marker(position, {icon: this.icon,  ...otherProps});
    leafletElement.on('add', this.renderContent.bind(this));
    leafletElement.on('remove', this.removeContent.bind(this));
    return leafletElement;
  }

  updateLeafletElement(prevProps, props) {
    if (props.position !== prevProps.position) {
      this.leafletElement.setLatLng(props.position);
    }
    if (props.zIndexOffset !== prevProps.zIndexOffset) {
      this.leafletElement.setZIndexOffset(props.zIndexOffset);
    }
    if (props.opacity !== prevProps.opacity) {
      this.leafletElement.setOpacity(props.opacity);
    }
    if (props.draggable !== prevProps.draggable) {
      if (props.draggable) {
        this.leafletElement.dragging.enable();
      } else {
        this.leafletElement.dragging.disable();
      }
    }
    this.renderContent();
  }

  renderContent() {
    const {children, ...otherProps} = this.props;
    const container = this.leafletElement._icon;
    if (container) {
      const child = Children.only(children);
      render(
        // FIXME: popups (map tooltip bubbles) aren't triggered when child is Circle.
        // Maybe related to panes? https://gis.stackexchange.com/questions/207706/how-to-position-leaflet-circlemarkers-on-top-of-markers
        typeof child.type === 'function' ? React.cloneElement(child, {...otherProps, flux:this.props.flux || (this.context && this.context.flux)}) : child,
        container
      );
    }
  }

  removeContent() {
    const container = this.leafletElement._icon;
    if (container) {
      unmountComponentAtNode(container);
    }
  }

  render() {
    let {popup, ...otherProps} = this.props;
    if (!popup) return null;
    //We pass onChange so that when the popup resizes it moves the map so that it is in view
    popup = React.cloneElement(popup, {onChange: () => this.forceUpdate(), flux:this.props.flux || (this.context && this.context.flux)});
    return <Popup minWidth={200} {...otherProps}>{popup}</Popup>;
  }
}
