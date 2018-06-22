import PropTypes from 'prop-types';
import React from 'react';


import createReactClass from 'create-react-class';


// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// UI
import Icon from 'ui/Icon';

// Material UI
import Button from 'ui/Button';

let Alert = createReactClass({
  displayName: 'Alert',
  mixins: [PureRenderMixin, FluxMixin],

  propTypes: {
    message: PropTypes.string.isRequired,
    title: PropTypes.string,
    OKButtonLabel: PropTypes.string,
    onOK: PropTypes.func
  },

  getDefaultProps() {
    return {
      message: '',
      OKButtonLabel: 'OK',
      onOK() {}
    };
  },

  title() {
    return this.props.title;
  },

  icon() {
    return 'exclamation-triangle';
  },

  handleOK() {
    this.props.onOK();
    this.getFlux().actions.session.modalClose();
  },

  render() {
    let {message, OKButtonLabel} = this.props;

    return (
      <div style={{padding: '10px', maxWidth: '80vw'}}>
        <div style={{padding: '10px'}}>{message}</div>
        <div style={{padding: '5px 0 0 0', textAlign: 'center'}}>
          <Button
            raised="true"
            style={{marginRight: '10px'}}
            label={OKButtonLabel}
            color="primary"
            iconName="check"
            iconInverse={true}
            onClick={this.handleOK}
          />
        </div>
      </div>
    );
  },
});

export default Alert;
