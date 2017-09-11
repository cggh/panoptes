import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

import Button from 'ui/Button';
import Confirm from 'ui/Confirm';

let ConfirmButton = createReactClass({
  displayName: 'ConfirmButton',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    label: PropTypes.string,
    icon: PropTypes.element,
    iconName: PropTypes.string,
    iconInverse: PropTypes.bool,
    labelStyle: PropTypes.object,
    message: PropTypes.string,
    onConfirm: PropTypes.func,
    onCancel: PropTypes.func,
    confirmButtonLabel: PropTypes.string,
    cancelButtonLabel: PropTypes.string
  },

  handleClick(e) {
    const {message, onCancel, onConfirm, cancelButtonLabel, confirmButtonLabel} = this.props;
    const confirmProps = {message, onCancel, onConfirm, cancelButtonLabel, confirmButtonLabel};
    this.getFlux().actions.session.modalOpen(<Confirm
      title={this.props.label}
      {...confirmProps}
    />);
  },

  render() {
    const {
      label, icon, iconName, iconInverse, labelStyle,
      message, onCancel, onConfirm, cancelButtonLabel, confirmButtonLabel, // eslint-disable-line no-unused-vars
      ...otherProps
    } = this.props;
    return (
      <Button
        label={label}
        icon={icon}
        iconName={iconName}
        iconInverse={iconInverse}
        labelStyle={labelStyle}
        onClick={this.handleClick}
        {...otherProps}
      />
    );
  },
});

export default ConfirmButton;
