import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import Button from 'ui/Button';
import filterChildren from 'util/filterChildren';
import _isArray from 'lodash.isarray';

let PopupButton = createReactClass({
  displayName: 'PopupButton',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    label: PropTypes.string,
    icon: PropTypes.string,
    children: PropTypes.node,
    target: PropTypes.string
  },

  getDefaultProps() {
    return {
      label: 'Untitled',
      icon: 'circle',
      target: 'popup'
    };
  },

  handleClick(e) {
    e.stopPropagation(); //To prevent a popup containing this button bringing itself to the front
    let {children, target} = this.props;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    if (target === 'tab') {
      this.getFlux().actions.session.tabOpen(filterChildren(this, children), !middleClick);
    } else {
      this.getFlux().actions.session.popupOpen(filterChildren(this, children), !middleClick);
    }
  },

  render() {
    let {children, label, icon} = this.props;
    children = filterChildren(this, children);
    if (_isArray(children)) {
      throw Error('PopupButton can only have one child');
    }
    if (!children) {
      throw Error('PopupButton can only have one child not none');
    }

    return <Button
      raised
      style={{margin: '7px', color: 'white'}}
      label={label}
      color="primary"
      iconName={icon ? icon : undefined}
      iconInverse={true}
      labelStyle={{textTransform: 'inherit'}}
      onClick={this.handleClick}
    />;
  },
});

export default PopupButton;
