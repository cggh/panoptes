/* Credit
https://github.com/jgimbel/react-leaflet-div-icon/blob/master/div-icon.js
*/
import {PropTypes, Children} from 'react';
import {render, unmountComponentAtNode} from 'react-dom';
import {DivIcon as LeafletDivIcon, marker} from 'leaflet';
import {MapLayer} from 'react-leaflet';

export default class DivIcon extends MapLayer {
  static displayName = 'DivIcon'

  static propTypes = {
    opacity: PropTypes.number,
    zIndexOffset: PropTypes.number,
  }

  componentWillMount() {
    super.componentWillMount();
    const {position, ...props} = this.props;
    this.icon = new LeafletDivIcon(props);
    this.leafletElement = marker(position, {icon: this.icon,  ...props});
    this.leafletElement.on('add', this.renderContent.bind(this));
    this.leafletElement.on('remove', this.removeContent.bind(this));
  }

  componentDidUpdate(prevProps) {
    if (this.props.position !== prevProps.position) {
      this.leafletElement.setLatLng(this.props.position);
    }
    if (this.props.zIndexOffset !== prevProps.zIndexOffset) {
      this.leafletElement.setZIndexOffset(this.props.zIndexOffset);
    }
    if (this.props.opacity !== prevProps.opacity) {
      this.leafletElement.setOpacity(this.props.opacity);
    }
    if (this.props.draggable !== prevProps.draggable) {
      if (this.props.draggable) {
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
    return null;
  }
}
