/* Credit
https://github.com/jgimbel/react-leaflet-div-icon/blob/master/div-icon.js
*/
import PropTypes from 'prop-types';

import React, {Children} from 'react';
import {render, unmountComponentAtNode} from 'react-dom';
import {DivIcon as LeafletDivIcon, marker} from 'leaflet';
import {MapLayer, Popup} from 'react-leaflet';

export default class DivIcon extends MapLayer {
  static displayName = 'DivIcon';

  static propTypes = {
    opacity: PropTypes.number,
    zIndexOffset: PropTypes.number,
    popup: PropTypes.node,
  };

  static childContextTypes = {
    popupContainer: PropTypes.object,
  };

  getChildContext() {
    return {
      popupContainer: this.leafletElement,
    };
  }

  static defaultProps = {
    onClick: () => null
  };


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
    const container = this.leafletElement._icon;

    if (container) {
      render(
        Children.only(this.props.children),
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
    let {popup} = this.props;
    return popup ? <Popup minWidth={200}>{popup}</Popup> : null;
  }
}
