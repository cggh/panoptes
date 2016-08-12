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
    position: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.array]).isRequired,
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

    let adaptedPosition = undefined;

    if (position instanceof Array) {
      adaptedPosition = position;
    }
    if (typeof position === 'string') {
      // TODO: check the string looks like "[0, 0]" before trying to parse.
      let positionArrayFromString = JSON.parse(position);
      if (positionArrayFromString instanceof Array) {
        adaptedPosition = positionArrayFromString;
      }
    }

    if (adaptedPosition === undefined || adaptedPosition === null) {
      console.error('ComponentMarkerWidget failed to determine position');
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
    } else if (children instanceof Array) {
      children = children[0];
    }

    return (
      <DivIcon
        alt={alt}
        children={children}
        onClick={(e) => onClick(e, this)}
        position={position}
        title={title}
      />
    );

  }

});

module.exports = ComponentMarkerWidget;
