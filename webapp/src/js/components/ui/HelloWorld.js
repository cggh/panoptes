import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';

let HelloWorld = createReactClass({
  displayName: 'HelloWorld',
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
  },
});

export default HelloWorld;
