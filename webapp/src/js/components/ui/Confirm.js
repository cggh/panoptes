import React from 'react';


// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// UI
import Icon from 'ui/Icon';

// Material UI
import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton';

let Confirm = React.createClass({
  mixins: [PureRenderMixin, FluxMixin],

  propTypes: {
    message: React.PropTypes.string.isRequired,
    title: React.PropTypes.string,
    onCancel: React.PropTypes.func,
    onConfirm: React.PropTypes.func,
    cancelButtonLabel: React.PropTypes.string,
    confirmButtonLabel: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      message: 'Are you sure?',
      cancelButtonLabel: 'Cancel',
      confirmButtonLabel: 'Confirm',
      onCancel: function() {},
      onConfirm: function() {}
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
          <RaisedButton
            style={{marginRight: '10px'}}
            label={confirmButtonLabel}
            primary={true}
            icon={<Icon name="check" inverse={true} />}
            onClick={this.handleConfirm}
          />
          <FlatButton
            label={cancelButtonLabel}
            primary={false}
            icon={<Icon name="close" inverse={false} />}
            onClick={this.handleCancel}
          />
        </div>
      </div>
    );
  }

});

export default Confirm;
