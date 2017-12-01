import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import {default as MuiButton} from 'material-ui/Button';
import Icon from 'ui/Icon';

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
    raised: PropTypes.bool
  },

  getDefaultProps() {
    return {
      iconInverse: false
    };
  },

  render() {
    const {label, icon, iconName, iconInverse, labelStyle, ...otherProps} = this.props;

    let iconComponent = undefined;
    if (icon !== undefined) {
      iconComponent = icon;
    } else if (iconName !== undefined) {
      iconComponent = <Icon fixedWidth={true} name={iconName} inverse={iconInverse} />;
    }

    let labelStylePlus = labelStyle;
    if (iconComponent !== undefined) {
      if (labelStylePlus !== undefined) {
        labelStylePlus.marginLeft = '0.5em';
      } else {
        labelStylePlus = {marginLeft: '0.5em'};
      }
    }

    return (
      <MuiButton {...otherProps}>
        {iconComponent}
        {label !== undefined ? <span style={labelStylePlus}>{label}</span> : null}
      </MuiButton>
    );
  },
});

export default Button;
