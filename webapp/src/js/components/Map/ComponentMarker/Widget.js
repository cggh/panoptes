import React from 'react';
import DivIcon from 'Map/DivIcon/Widget';

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
    opacity: React.PropTypes.number,
    zIndexOffset: React.PropTypes.number,
    fillColour: React.PropTypes.string,
    iconColour: React.PropTypes.string
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

  getDefaultProps() {
    return {
      fillColour: '#ff4081',
      iconColour: 'white'
    };
  },

  // Event handlers
  handleClick(e) {
    this.props.onClick(e);
  },

  render() {
    let {alt, children, fillColour, iconColour, onClick, opacity, position, title, zIndexOffset} = this.props;

    if (alt === undefined && title !== undefined) {
      // If not alt has been specified, then use the title.
      alt = title;
    }


    /* Credit: https://materialdesignicons.com */

    if (children === undefined) {
      children = (
        <svg style={{overflow: 'visible', width: '25px', height: '25px'}} viewBox="0 0 24 24">
          <g transform="translate(-6, -14)">
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
        onClick={(e) => onClick(e, this)}
        opacity={opacity}
        position={position}
        title={title}
        zIndexOffset={zIndexOffset}
      >
        {React.Children.only(children)}
      </DivIcon>
    );

  }

});

export default ComponentMarker;
