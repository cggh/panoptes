import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import DocPage from 'panoptes/DocPage';
import Button from 'ui/Button';

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
    replaceParent: PropTypes.func,
    button: PropTypes.bool,
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
    const {children, button} = this.props;

    if (button) {
      return (
        <Button
          onClick={(e) => this.handleClick(e)}
          color="primary"
          raised={true}
          target="popup"
        >
          {children}
        </Button>
      );
    } else {
      return (
        <a
          onClick={(e) => this.handleClick(e)}
        >
          {children}
        </a>
      );
    }
  },
});

export default DocLink;
