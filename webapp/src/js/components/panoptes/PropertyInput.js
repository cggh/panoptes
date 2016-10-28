import React from 'react';

let PropertyInput = React.createClass({

  propTypes: {
    onBlur: React.PropTypes.func,
    onChange: React.PropTypes.func,
    value: React.PropTypes.string
  },

  handleOnChange() {
    this.props.onChange(this.value.value);
  },

  handleOnBlur() {
    this.props.onBlur(this.value.value);
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
          onBlur={this.handleOnBlur}
        />
      </span>
    );
  }

});

export default PropertyInput;
