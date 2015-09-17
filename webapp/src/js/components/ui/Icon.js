var React = require('react');
var PropTypes = React.PropTypes;

let dynreq = require.context("../../../images", true);
const dynamic_require = (path) => dynreq("./"+path);


var Icon = React.createClass({

propTypes: {
    name: PropTypes.string.isRequired,
    size: PropTypes.oneOf(['lg', '2x', '3x', '4x', '5x']),
    rotate: PropTypes.oneOf(['90', '180', '270']),
    flip: PropTypes.oneOf(['horizontal', 'vertical']),
    fixedWidth: PropTypes.bool,
    spin: PropTypes.bool,
    stack: React.PropTypes.oneOf(['1x', '2x']),
    inverse: React.PropTypes.bool
  },

  render() {
    var {
      name, size, rotate, flip, spin, fixedWidth, stack, inverse,
      className, ...props
      } = this.props;
    if (!name)
      return;
    var classNames = '';
    if (_.startsWith(name, 'bitmap:')) {
      classNames += 'icon'
    }
    else {
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
      className += ' fa-inverse';
    }

    if (className) {
      classNames += ` ${className}`;
    }
    if (_.startsWith(name, 'bitmap:'))
      return <span {...props} className={classNames}><img className="bitmap" src={dynamic_require(name.substring(7))} /></span>;
    else
      return <span {...props} className={classNames}> { this.props.children} </span>;
  }
});

module.exports = Icon;
