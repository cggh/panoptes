import React from 'react';
import DivIcon from 'Map/DivIcon/Widget';
import Marker from 'Map/Marker/Widget';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let ComponentMarker = React.createClass({

  mixins: [
    FluxMixin
  ],

  contextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },
  propTypes: {
    children: React.PropTypes.node,
    onClick: React.PropTypes.func,
    position: React.PropTypes.object,
    title: React.PropTypes.string,
    alt: React.PropTypes.string,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    zIndexOffset: React.PropTypes.number,
  },
  childContextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map
    };
  },

  // Event handlers
  handleClick(e) {
    this.props.onClick(e);
  },

  render() {
    let {layerContainer, map} = this.context;
    let {alt, children, onClick, position, title, zIndexOffset} = this.props;

    if (alt === undefined && title !== undefined) {
      // If not alt has been specified, then use the title.
      alt = title;
    }

    if (children === undefined) {
      children = (
          <Marker
            alt={alt}
            children={children}
            layerContainer={layerContainer}
            map={map}
            onClick={(e) => onClick(e, this)}
            position={position}
            title={title}
            zIndexOffset={zIndexOffset}
          />
      );
    }

    // NB: any className to override the default white squares set by Leaflet CSS.

    return (
      <DivIcon
        alt={alt}
        className={null}
        onClick={(e) => onClick(e, this)}
        position={position}
        title={title}
        zIndexOffset={zIndexOffset}
      >
        {React.Children.only(children)}
      </DivIcon>
    );

  }

});

module.exports = ComponentMarker;
