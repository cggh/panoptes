import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import filterChildren from 'util/filterChildren';
import Anchor from 'panoptes/Anchor';
import Content from 'panoptes/Content';

let CustomButton = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    target: React.PropTypes.string,
    children: function(props, propName, componentName) {
      // Only accept a single child, of the appropriate type
      let children = filterChildren(this, React.Children.toArray(props[propName]));
      if (!(children[0].type === Anchor && children[1].type === Content))
        return new Error(
          '`' + componentName + '` ' +
          'should have two children: one Anchor followed by one Content'
        );
    }
  },

  getDefaultProps() {
    return {
      target: 'popup'
    };
  },

  handleClick(e) {
    e.stopPropagation(); //To prevent a popup containing this button bringing itself to the front
    let {children, target} = this.props;
    children = filterChildren(this, React.Children.toArray(children));
    let [anchor, content] = children;
    const middleClick = e.button == 1 || e.metaKey || e.ctrlKey;
    if (target === 'tab') {
      this.getFlux().actions.session.tabOpen(content, !middleClick);
    } else {
      this.getFlux().actions.session.popupOpen(content, !middleClick);
    }
  },

  render() {
    let {children} = this.props;
    children = filterChildren(this, React.Children.toArray(children));
    if (!((children[0].type === Anchor && children[1].type === Content) ||
      (children[1].type === Anchor && children[0].type === Content)))
      throw Error(
        'CustomButton should have two children: one Anchor followed by one Content'
      );

    let [anchor, content] = children;
    return React.cloneElement(anchor, {onClick: this.handleClick})
  }
});

export default CustomButton;
