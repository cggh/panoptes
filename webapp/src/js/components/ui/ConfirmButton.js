import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

// Mixin
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import FlatButton from 'material-ui/FlatButton';

import Confirm from 'ui/Confirm';

let ConfirmButton = createReactClass({
  displayName: 'ConfirmButton',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    label: PropTypes.string,
    message: PropTypes.string,
    onConfirm: PropTypes.func,
    onCancel: PropTypes.func,
    confirmButtonLabel: PropTypes.string,
    cancelButtonLabel: PropTypes.string,
    primary: PropTypes.bool,
    icon: PropTypes.element
  },

  handleClick(e) {
    this.getFlux().actions.session.modalOpen(<Confirm
      title={this.props.label}
      {...this.props}
    />);
  },

  render() {
    const {label, primary, icon} = this.props;

    return <FlatButton label={label}
      primary={primary}
      onClick={this.handleClick}
      icon={icon}
    />;
  },
});

export default ConfirmButton;
