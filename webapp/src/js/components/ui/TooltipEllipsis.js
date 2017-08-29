import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';

import 'tooltip-ellipsis.scss';

let TooltipEllipsis = createReactClass({
  displayName: 'TooltipEllipsis',
  mixins: [PureRenderMixin],

  propTypes: {
    className: PropTypes.string,
    children: PropTypes.any
  },

  componentDidMount() {
    this.componentDidUpdate();
  },

  componentDidUpdate() {
    if (this.element.offsetWidth < this.element.scrollWidth) {
      this.element.title = this.props.children;
    }
  },

  render() {
    return (
      <span className={`${this.props.className} tooltip-ellipsis`} ref={(node) => this.element = node}>
        {this.props.children}
      </span>
    );
  },
});

export default TooltipEllipsis;
