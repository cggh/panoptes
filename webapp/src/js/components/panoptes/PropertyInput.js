import PropTypes from 'prop-types';
import React from 'react';

class PropertyInput extends React.Component {

  static displayName = "PropertyInput";

  static propTypes = {
    onBlur: PropTypes.func,
    onChange: PropTypes.func,
    value: PropTypes.string
  };

  handleOnChange = () => {
    this.props.onChange(this.value.value);
  };

  handleOnBlur = () => {
    this.props.onBlur(this.value.value);
  };

  render() {

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
}

export default PropertyInput;
