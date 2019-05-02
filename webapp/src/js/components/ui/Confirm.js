import PropTypes from 'prop-types';
import React from 'react';


import createReactClass from 'create-react-class';


// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// UI
import Icon from 'ui/Icon';
import Button from 'ui/Button';

let Confirm = createReactClass({
  displayName: 'Confirm',
  mixins: [PureRenderMixin, FluxMixin],

  propTypes: {
    message: PropTypes.string.isRequired,
    title: PropTypes.string,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    cancelButtonLabel: PropTypes.string,
    confirmButtonLabel: PropTypes.string
  },

  getDefaultProps() {
    return {
      message: 'Are you sure?',
      cancelButtonLabel: 'Cancel',
      confirmButtonLabel: 'Confirm',
      onCancel() {},
      onConfirm() {}
    };
  },

  title() {
    return this.props.title;
  },

  icon() {
    return 'exclamation-triangle';
  },

  handleCancel() {
    this.props.onCancel();
    this.getFlux().actions.session.modalClose();
  },

  handleConfirm() {
    this.props.onConfirm();
    this.getFlux().actions.session.modalClose();
  },

  render() {
    let {message, cancelButtonLabel, confirmButtonLabel} = this.props;

    return (
      <div style={{padding: '10px', maxWidth: '80vw'}}>
        <div style={{padding: '10px'}}>{message}</div>
        <div style={{padding: '5px 0 0 0', textAlign: 'center'}}>
          <Button
            label={cancelButtonLabel}
            color="primary"
            iconName="times"
            onClick={this.handleCancel}
          />
          <Button
            raised="true"
            autoFocus={true}
            style={{marginRight: '10px'}}
            label={confirmButtonLabel}
            color="primary"
            iconName="check"
            iconInverse={true}
            onClick={this.handleConfirm}
          />
        </div>
      </div>
    );
  },
});

export default Confirm;
