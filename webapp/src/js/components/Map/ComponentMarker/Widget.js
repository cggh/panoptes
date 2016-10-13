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
    alt: React.PropTypes.string
  },

  // Event handlers
  handleClick(e) {
    this.props.onClick(e);
  },

  render() {
    let {layerContainer, map} = this.context;
    let {alt, children, onClick, position, title} = this.props;

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
          />
      );
    }

    return (
      <DivIcon
        alt={alt}
        className="panoptes-map-componentmarker"
        onClick={(e) => onClick(e, this)}
        position={position}
        title={title}
      >
        {React.Children.only(children)}
      </DivIcon>
    );

  }

});

module.exports = ComponentMarker;
