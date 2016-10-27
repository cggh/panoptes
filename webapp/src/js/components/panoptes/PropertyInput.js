import React from 'react';

import 'rc-tooltip/assets/bootstrap.css';

let PropertyInput = React.createClass({

  mixins: [

  ],

  propTypes: {
    onChange: React.PropTypes.func,
    value: React.PropTypes.string
  },

  handleOnChange() {
    this.props.onChange(this.value.value);
  },

  render: function() {

    let {value} = this.props;

    return (
      <span>
        <input
          className="field"
          ref={(ref) => this.value = ref}
          defaultValue={value}
          onChange={this.handleOnChange}
        />
      </span>
    );
  }

});

module.exports = PropertyInput;
