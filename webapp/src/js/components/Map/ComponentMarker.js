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

  contextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
  },

  propTypes: {
    children: PropTypes.node,
    onClick: PropTypes.func,
    position: PropTypes.object,
    title: PropTypes.string,
    alt: PropTypes.string,
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    opacity: PropTypes.number,
    zIndexOffset: PropTypes.number,
    fillColour: PropTypes.string,
    iconColour: PropTypes.string,
    popup: PropTypes.node
  },

  childContextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map
    };
  },

  getDefaultProps() {
    return {
      fillColour: '#ff4081',
      iconColour: 'white'
    };
  },

  render() {
    let {alt, children, fillColour, iconColour, onClick, opacity, position, title, zIndexOffset, popup} = this.props;

    if (alt === undefined && title !== undefined) {
      // If not alt has been specified, then use the title.
      alt = title;
    }


    /* Credit: https://materialdesignicons.com */

    if (!children) {
      children = (
        <svg style={{overflow: 'visible', width: '25px', height: '25px'}} viewBox="0 0 24 24">
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
    }

    // NB: any className to override the default white squares set by Leaflet CSS.

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
        {React.Children.only(children)}
      </DivIcon>
    );

  },
});

export default ComponentMarker;
