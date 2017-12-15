import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import DocPage from 'panoptes/DocPage';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

let DocLink = createReactClass({
  displayName: 'DocLink',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    children: PropTypes.node,
    href: PropTypes.string,
    replaceParent: PropTypes.func
  },

  handleClick(e) {
    let {href, replaceParent, children, ...other} = this.props;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    e.stopPropagation();
    if (middleClick) {
      this.getFlux().actions.session.tabOpen(<DocPage path={href} {...other}/>, false);
    } else {
      if (replaceParent) {
        replaceParent(<DocPage path={href} />);
      } else {
        this.getFlux().actions.session.tabOpen(<DocPage path={href} {...other}/>, true);
      }
    }
  },

  render() {
    return (
      <a
        onClick={(e) => this.handleClick(e)}
      >
        {this.props.children}
      </a>
    );
  },
});

export default DocLink;
