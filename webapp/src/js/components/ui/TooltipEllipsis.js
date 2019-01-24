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
    style: PropTypes.object,
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
    const {className, style, children} = this.props;
    return (
      <span className={className !== undefined ? `${className} tooltip-ellipsis` : 'tooltip-ellipsis'} style={style} ref={(node) => this.element = node}>
        {children}
      </span>
    );
  },
});

export default TooltipEllipsis;
