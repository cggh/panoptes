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
    message: React.PropTypes.string.isRequired
  },

  getDefaultProps() {
    return {
      message: 'Are you sure?',
      cancelButtonLabel: 'Cancel',
      confirmButtonLabel: 'Confirm',
      onCancel: function() {} // TODO: this.getFlux().actions.session.modalClose();
    };
  },

  title() {
    return this.props.title;
  },

  icon() {
    return 'exclamation-triangle';
  },

  render() {
    let {message, cancelButtonLabel, confirmButtonLabel, onCancel, onConfirm} = this.props;
    return (
      <div style={{padding: '10px'}}>
        <div>{message}</div>
        <div className="centering-container">
          <RaisedButton
            style={{marginRight: '10px'}}
            label={confirmButtonLabel}
            primary={true}
            icon={<Icon name="check" inverse={true} />}
            onClick={onConfirm}
          />
          <FlatButton
            label={cancelButtonLabel}
            primary={false}
            icon={<Icon name="close" inverse={false} />}
            onClick={onCancel}
          />
        </div>
      </div>
    );
  }

});

module.exports = Confirm;
