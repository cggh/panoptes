import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import {default as MuiButton} from '@material-ui/core/Button';
import Icon from 'ui/Icon';
import _clone from 'lodash/clone';

let Button = createReactClass({
  displayName: 'Button',

  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    label: PropTypes.node,
    icon: PropTypes.element,
    iconName: PropTypes.string,
    iconInverse: PropTypes.bool,
    labelStyle: PropTypes.object,
    raised: PropTypes.string,
    variant: PropTypes.string, //'flat' | 'raised' | 'fab'
    children: PropTypes.node
  },

  getDefaultProps() {
    return {
      iconInverse: false
    };
  },

  render() {
    const {label, icon, iconName, iconInverse, labelStyle, children, raised, variant, ...otherProps} = this.props;

    let iconComponent = undefined;
    if (icon !== undefined) {
      iconComponent = icon;
    } else if (iconName !== undefined) {
      iconComponent = <Icon fixedWidth={true} name={iconName} inverse={iconInverse} />;
    }

    let labelStylePlus = _clone(labelStyle); // Because labelStyle is const. This prevents TypeError: Cannot assign to read only property 'marginLeft' of object '#<Object>'
    if (iconComponent !== undefined) {
      if (labelStylePlus !== undefined) {
        labelStylePlus.marginLeft = '0.5em';
      } else {
        labelStylePlus = {marginLeft: '0.5em'};
      }
    }

    //MUI changed their API... fix it here
    let MUIvariant = undefined;
    if (raised === "true" || variant === "raised") {
      MUIvariant = "contained";
    }

    if (children !== undefined && !(children instanceof Array && children.length === 0)) {
      return (
        <MuiButton variant={MUIvariant} label={label} {...otherProps}>
          {children}
        </MuiButton>
      );
    } else {
      return (
        <MuiButton variant={MUIvariant} {...otherProps}>
          {iconComponent}
          {label !== undefined ? <span style={labelStylePlus}>{label}</span> : null}
        </MuiButton>
      );
    }
  },
});

export default Button;
