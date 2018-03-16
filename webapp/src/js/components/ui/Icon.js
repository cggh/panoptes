import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import MuiIcon from 'material-ui/Icon';
import {withStyles} from 'material-ui/styles';

import _startsWith from 'lodash.startswith';

const dynreq = require.context('../../../images', true);
const dynamicRequire = (path) => dynreq(`./${path}`);

const styles = (theme) => ({
  // MUI Icon classes: root,colorAccent,colorAction,colorContrast,colorDisabled,colorError,colorPrimary
  root: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});

let Icon = createReactClass({
  displayName: 'Icon',
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    name: PropTypes.string.isRequired,
    size: PropTypes.oneOf(['lg', '2x', '3x', '4x', '5x']),
    rotate: PropTypes.oneOf(['90', '180', '270']), // FA only
    flip: PropTypes.oneOf(['horizontal', 'vertical']), // FA only
    fixedWidth: PropTypes.bool, // FA only
    spin: PropTypes.bool, // FA only
    stack: PropTypes.oneOf(['1x', '2x']), // FA only
    inverse: PropTypes.bool,
    className: PropTypes.string,
    children: PropTypes.node,
    baseURL: PropTypes.string,
    style: PropTypes.object,
    color: PropTypes.string,
    classes: PropTypes.object,
  },

  render() {
    let {
      name, size, rotate, flip, spin, fixedWidth, stack, inverse,
      className, baseURL, style, children, color, classes, ...otherProps
    } = this.props;

    let defaultStyle = {
      height: 'inherit',
      verticalAlign: 'middle',
    };

    if (!name)
      return;
    let classNames = 'icon ';
    // 'bitmap' is the back-supported alias of 'image', used before SVG.
    if (_startsWith(name, 'bitmap:') || _startsWith(name, 'image:') || _startsWith(name, 'docimage:')) {
      // TODO: control the hue of all image icons based on a config variable.
      defaultStyle.filter = 'hue-rotate(0deg)';
      if (size === undefined) {
        defaultStyle.width = '24px';
      } else if (size === 'lg') {
        defaultStyle.width = '32px';
      } else if (size === '2x') {
        defaultStyle.width = '48px';
      } else if (size === '3x') {
        defaultStyle.width = '72px';
      } else if (size === '4x') {
        defaultStyle.width = '96px';
      } else if (size === '5x') {
        defaultStyle.width = '120px';
      }
      if (inverse) {
        defaultStyle.filter = 'invert(100%)';
      }
    } else {
      classNames += `fa fa-${name} `;
      defaultStyle.margin = '0';
    }
    if (size) {
      // Increases icon sizes relative to their container, fa-lg = 33% increase.
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
      // 'bitmap' is the back-supported alias of 'image', used before SVG.
      if (_startsWith(name, 'bitmap:') || _startsWith(name, 'image:')) {
        classNames += ' inverted-image';
      }
    }

    if (className) {
      classNames += ` ${className}`;
    }

    // Either use defaultStyle or override with style prop.
    style = {...defaultStyle, ...style};

    if (_startsWith(name, 'docimage:')) {
      baseURL = `/panoptes/Docs/${this.config.dataset}/images/`;
    }

    if (_startsWith(name, 'bitmap:') || _startsWith(name, 'image:') || _startsWith(name, 'docimage:')) {
      const fileName = name.split(':')[1];
      return <img className={classNames} style={style} {...otherProps} src={baseURL !== undefined ? baseURL + fileName : dynamicRequire(fileName)} />;
    } else if (_startsWith(name, 'mui:')) {
      const iconFontLigatureName = name.split(':')[1];
      return <MuiIcon className={classes.icon} classes={classes} style={style} color={color}>{iconFontLigatureName}</MuiIcon>;
    } else if (_startsWith(name, 'fa:')) {
      // Font-Awesome style explicitly, using name="fa:name" notation.
      const iconFontLigatureName = name.split(':')[1];
      return <span className={classNames} style={style} {...otherProps}>{iconFontLigatureName}</span>;
    } else {
      // Font-Awesome style by default, using children as iconFontLigatureName
      return <span className={classNames} style={style} {...otherProps}>{children}</span>;
    }
  },
});

let module = withStyles(styles)(Icon);
module.displayName = 'Icon';
module.propTypes = Icon.propTypes;
export default module;
