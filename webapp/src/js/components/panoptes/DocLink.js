import React from 'react';
import DocPage from 'panoptes/DocPage';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

let DocLink = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    children: React.PropTypes.node,
    href: React.PropTypes.string,
    replaceParent: React.PropTypes.func
  },

  handleClick(e) {
    let {href, replaceParent} = this.props;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    e.stopPropagation();
    if (middleClick) {
      this.getFlux().actions.session.tabOpen(<DocPage path={href} />, false);
    } else {
      if (replaceParent) {
        replaceParent(<DocPage path={href} />);
      } else {
        this.getFlux().actions.session.tabOpen(<DocPage path={href} />, true);
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
  }

});

export default DocLink;
