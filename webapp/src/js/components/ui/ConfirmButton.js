import React from 'react';

// Mixin
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import FlatButton from 'material-ui/FlatButton';

let ConfirmButton = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    label: React.PropTypes.string,
    message: React.PropTypes.string,
    onConfirm: React.PropTypes.func,
    onCancel: React.PropTypes.func,
    confirmButtonLabel: React.PropTypes.string,
    cancelButtonLabel: React.PropTypes.string
  },

  handleClick(e) {
    this.getFlux().actions.session.modalOpen('ui/Confirm', {title: this.props.label, ...this.props});
  },

  render() {
    const {label, primary, icon} = this.props;

    return <FlatButton label={label}
                           primary={primary}
                           onClick={this.handleClick}
                           icon={icon}
            />;
  }

});

export default ConfirmButton;
