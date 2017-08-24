import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import filterChildren from 'util/filterChildren';
import _isArray from 'lodash.isarray';
import CustomButton from 'panoptes/CustomButton';
import Anchor from 'panoptes/Anchor';
import Content from 'panoptes/Content';

let TextButton = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    label: React.PropTypes.string,
    children: React.PropTypes.node,
    target: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      label: 'Untitled',
      target: 'tab'
    };
  },

  render() {
    let {children, label, target} = this.props;
    children = filterChildren(this, children);
    if (_isArray(children)) {
      throw Error('TextButton can only have one child');
    }
    if (!children) {
      throw Error('TextButton can only have one child not none');
    }

    return <CustomButton target={target}>
      <Anchor><span style={{textDecoration: 'underline', cursor: 'pointer'}}>{label}</span></Anchor>
      <Content>{children}</Content>
    </CustomButton>;

  }

});

export default TextButton;
