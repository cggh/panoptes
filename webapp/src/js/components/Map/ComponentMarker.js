import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import DivIcon from 'Map/DivIcon';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let ComponentMarker = createReactClass({
  displayName: 'ComponentMarker',

  mixins: [
    FluxMixin
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
  },

  propTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    children: PropTypes.node,
    onClick: PropTypes.func,
    position: PropTypes.object, // Alternatively provide lat & lng
    title: PropTypes.string,
    alt: PropTypes.string,
    opacity: PropTypes.number,
    zIndexOffset: PropTypes.number,
    fillColour: PropTypes.string,
    iconColour: PropTypes.string,
    popup: PropTypes.node,
    lat: PropTypes.number,
    lng: PropTypes.number,
  },

  childContextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map,
    };
  },

  getDefaultProps() {
    return {
      fillColour: '#ff4081',
      iconColour: 'white'
    };
  },

  render() {
    const {
      fillColour, iconColour, onClick, opacity, title,
      zIndexOffset, popup, lat, lng, ...otherProps
    } = this.props;
    let {position, alt, children} = this.props;

    if (position === undefined && (lat !== undefined && lng !== undefined)) {
      // If no position has been specified, then use lat & lng (if available)
      position = {lat, lng};
    }

    if (alt === undefined && title !== undefined) {
      // If no alt has been specified, then use title.
      alt = title;
    }

    let child = undefined;
    if (!children || children.length === 0) {
      /* Credit: https://materialdesignicons.com */
      child = (
        <svg style={{overflow: 'visible', width: '25px', height: '25px'}} viewBox="0 0 27 27">
          <g transform="translate(-12, -24)">
            <g transform="scale(0.4) translate(18, 10)">
              <path
                fill={iconColour}
                d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
              />
            </g>
            <path
              fill={fillColour}
              d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"
              stroke="black"
              strokeWidth="1"
            />
          </g>
        </svg>
      );
    } else {
      child = React.cloneElement(React.Children.only(children), otherProps);
    }

    // NOTE: Using any className (null) to override the default, set by Leaflet CSS, which otherwise causes white squares.
    return (
      <DivIcon
        alt={alt}
        className={null}
        opacity={opacity}
        position={position}
        title={title}
        iconSize={0}
        zIndexOffset={zIndexOffset}
        popup={popup}
        onClick={onClick}
      >
        {child}
      </DivIcon>
    );

  },
});

export default ComponentMarker;
