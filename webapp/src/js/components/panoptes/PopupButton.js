import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import Button from 'ui/Button';
import filterChildren from 'util/filterChildren';

let PopupButton = createReactClass({
  displayName: 'PopupButton',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    label: PropTypes.string,
    icon: PropTypes.string, // i.e. iconName in Button
    children: PropTypes.node,
    target: PropTypes.string,
    iconComponent: PropTypes.element, // i.e. icon in Button
    variant: PropTypes.string, //'flat' | 'raised' | 'fab'
    style: PropTypes.object,
    color: PropTypes.string,
    labelStyle: PropTypes.object,
    iconInverse: PropTypes.bool,
  },

  getDefaultProps() {
    return {
      label: 'Untitled',
      icon: 'circle',
      target: 'popup',
      variant: 'raised',
      color: 'primary',
      labelStyle: {textTransform: 'inherit'},
      iconInverse: true,
    };
  },

  handleClick(e, popupContent) {
    e.stopPropagation(); //To prevent a popup containing this button bringing itself to the front
    let {target} = this.props;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    if (target === 'tab') {
      this.getFlux().actions.session.tabOpen(popupContent, !middleClick);
    } else {
      this.getFlux().actions.session.popupOpen(popupContent, !middleClick);
    }
  },

  render() {
    let {children, label, icon, iconComponent, variant, style, color, labelStyle, iconInverse} = this.props;
    children = React.Children.toArray(filterChildren(this, children)); // Want array when 1 child.

    // Don't want to set in prop default, because want to merge style.
    const defaultStyle = {
      margin: '8px 8px 0px 0px', color: 'white'
    };

    if (!children) {
      throw Error('PopupButton has no children. Requires either one child (popup content) or one Label and one Content child.');
    }

    let popupLabel = undefined;
    let popupContent = undefined;
    let otherChildren = [];
    for (let i = 0; i < children.length; i++) {
      let child  = children[i];
      if (child.type.displayName === 'Label') {
        if (popupLabel !== undefined) {
          throw Error('PopupButton does not handle more than one Label child.');
        }
        popupLabel = child.props.children;
      } else if (child.type.displayName === 'Content') {
        if (popupContent !== undefined) {
          throw Error('PopupButton does not handle more than one Content child.');
        }
        popupContent = child.props.children;
      } else {
        otherChildren.push(child);
      }
    }

    const iconName = icon ? icon : undefined;
    const buttonProps = {
      label,
      style: {...defaultStyle, style},
      color,
      icon: iconComponent,
      iconName,
      iconInverse,
      labelStyle,
      variant,
      raised: variant === 'raised' ? true : false,
      fab: variant === 'fab' ? true : false,
    };

    if (otherChildren.length === 1 && popupLabel === undefined && popupContent === undefined) {
      return (
        <Button
          {...buttonProps}
          onClick={(e) => this.handleClick(e, otherChildren)}
        />
      );
    } else if (otherChildren.length === 0 && popupLabel !== undefined && popupContent !== undefined) {
      return (
        <Button
          {...buttonProps}
          onClick={(e) => this.handleClick(e, popupContent)}
        >
          {popupLabel}
        </Button>
      );
    } else {
      console.error('otherChildren: ', otherChildren);
      console.error('popupLabel: ', popupLabel);
      console.error('popupContent: ', popupContent);
      throw Error('PopupButton requires either one child (popup content) or one Label and one Content child.');
    }

  },
});

export default PopupButton;
