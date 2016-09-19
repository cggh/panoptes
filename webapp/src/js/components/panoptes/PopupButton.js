import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import Icon from 'ui/Icon';
import RaisedButton from 'material-ui/RaisedButton';
import filterChildren from 'util/filterChildren';
import _isArray from 'lodash/isArray';

let PopupButton = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    label: React.PropTypes.string,
    icon: React.PropTypes.string,
    children: React.PropTypes.node
  },

  getDefaultProps() {
    return {
      label: 'Untitled',
      icon: 'circle'
    };
  },

  handleClick(e) {
    let {children} = this.props;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    this.getFlux().actions.session.popupOpen(filterChildren(this, children), !middleClick);
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

    return <RaisedButton
      style={{margin: '7px', color: 'white'}}
      label={label}
      primary={true}
      icon={icon ? <Icon inverse={true} name={icon} /> : null}
      labelStyle={{textTransform: 'inherit'}}
      onClick={this.handleClick}
    />;
  }

});

export default PopupButton;
