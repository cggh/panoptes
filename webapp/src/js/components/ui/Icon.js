import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';

import _startsWith from 'lodash.startswith';

const dynreq = require.context('../../../images', true);
const dynamicRequire = (path) => dynreq(`./${path}`);


let Icon = createReactClass({
  displayName: 'Icon',
  mixins: [PureRenderMixin],

  propTypes: {
    name: PropTypes.string.isRequired,
    size: PropTypes.oneOf(['lg', '2x', '3x', '4x', '5x']),
    rotate: PropTypes.oneOf(['90', '180', '270']),
    flip: PropTypes.oneOf(['horizontal', 'vertical']),
    fixedWidth: PropTypes.bool,
    spin: PropTypes.bool,
    stack: PropTypes.oneOf(['1x', '2x']),
    inverse: PropTypes.bool,
    className: PropTypes.string,
    children: PropTypes.element,
    baseURL: PropTypes.string,
  },

  render() {
    let {
      name, size, rotate, flip, spin, fixedWidth, stack, inverse,
      className, baseURL, ...props
    } = this.props;
    if (!name)
      return;
    let classNames = '';
    if (_startsWith(name, 'bitmap:') || _startsWith(name, 'image:')) {
      classNames += 'icon';
    } else {
      classNames += `fa fa-${name} icon`;
    }
    if (size) {
      classNames += ` fa-${size}`;
    }
    if (rotate) {
      classNames += ` fa-rotate-${rotate}`;
    }
    if (flip) {
      classNames += ` fa-flip-${flip}`;
    }
    if (fixedWidth) {
      classNames += ' fa-fw';
    }
    if (spin) {
      classNames += ' fa-spin';
    }

    if (stack) {
      classNames += ` fa-stack-${stack}`;
    }
    if (inverse) {
      classNames += ' fa-inverse';
      if (_startsWith(name, 'bitmap:') || _startsWith(name, 'image:')) {
        classNames += ' inverted-image';
      }
    }

    if (className) {
      classNames += ` ${className}`;
    }
    if (_startsWith(name, 'bitmap:') || _startsWith(name, 'image:')) {
      const fileName = _startsWith(name, 'bitmap:') ? name.substring(7) : name.substring(6);
      return <span {...props} className={classNames}><img className="image" src={baseURL !== undefined ? baseURL + fileName : dynamicRequire(fileName)} /></span>;
    } else {
      return <span {...props} className={classNames}>{this.props.children}</span>;
    }
  },
});

export default Icon;
