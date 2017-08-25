import PropTypes from 'prop-types';
import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

let HelloWorld = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    msg: PropTypes.string.isRequired
  },

  render() {
    let {msg, ...other} = this.props;
    return (
      <div {...other}>
        Hello World! {msg}
      </div>
    );
  }

});

export default HelloWorld;
