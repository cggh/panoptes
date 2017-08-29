import _isFinite from 'lodash.isfinite';
import _debounce from 'lodash.debounce';
import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import TextField from 'material-ui/TextField';


let NumericInput = createReactClass({
  displayName: 'NumericInput',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    label: PropTypes.string,
    value: PropTypes.number,
    debounce: PropTypes.bool,
    disabled: PropTypes.bool,
    onChange: PropTypes.func.isRequired
  },

  getDefaultProps() {
    return {
      width: 6,
      debounce: false,
      disabled: false
    };
  },

  getInitialState() {
    return {
      value: this.props.value.toString(),
      error: undefined
    };
  },

  componentWillMount() {
    this.debouncedNotify = _debounce(this.notify, 500);
  },

  componentWillReceiveProps(nextProps) {
    let focused = this.textField.state.isFocused;
    if (!focused) {
      this.setState({value: nextProps.value.toString()});
    }
  },

  notify(value) {
    this.props.onChange(value);
  },

  handleChange(event) {
    let value = event.target.value;
    let valueNumber = parseFloat(value);
    let error = undefined;
    if (_isFinite(valueNumber)) {
      (this.props.debounce ? this.debouncedNotify : this.notify)(valueNumber);
    } else {
      error = 'Not a number';
    }
    this.setState({value, error});
  },

  handleBlur() {
    this.setState({value: this.props.value.toString()});
  },

  render() {
    let {label, width, disabled} = this.props;
    let {error, value} = this.state;
    return (
      <TextField
        disabled={disabled}
        type="number"
        style={{width: `${width * 30}px`}}
        ref={(node) => this.textField = node}
        floatingLabelText={label}
        errorText={error}
        value={value}
        onBlur={this.handleBlur}
        onChange={this.handleChange}
      />
    );
  },
});

export default NumericInput;

