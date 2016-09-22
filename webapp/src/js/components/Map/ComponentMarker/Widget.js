import React from 'react';
import DivIcon from 'Map/DivIcon/Widget';
import MarkerWidget from 'Map/Marker/Widget';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let ComponentMarkerWidget = React.createClass({

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
    position: React.PropTypes.object.isRequired,
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
          <MarkerWidget
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
        children={React.Children.only(children)}
        className="panoptes-map-componentmarker"
        onClick={(e) => onClick(e, this)}
        position={position}
        title={title}
      />
    );

  }

});

module.exports = ComponentMarkerWidget;
