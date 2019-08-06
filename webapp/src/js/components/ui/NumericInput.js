import _isFinite from 'lodash.isfinite';
import _debounce from 'lodash.debounce';
import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';


let NumericInput = createReactClass({
  displayName: 'NumericInput',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    label: PropTypes.string,
    value: PropTypes.number,
    min: PropTypes.number,
    max: PropTypes.number,
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
      value: this.props.value,
      text: this.props.value.toString(),
      error: undefined
    };
  },

  componentWillMount() {
    this.debouncedNotify = _debounce(this.notify, 500);
  },

  componentWillReceiveProps(nextProps) {
    let focused = this.textField === document.activeElement;
    if (!focused) {
      this.setState({value: nextProps.value.toString()});
    }
  },

  notify(value) {
    this.props.onChange(value);
  },

  handleChange(event) {
    let {max, min} = this.props;
    let text = event.target.value;
    let value = parseFloat(text);
    let error = undefined;
    if (_isFinite(value)) {
      if (min && value < min) {
        value = min;
        error = `Minimum is ${min}`;
      }
      if (max && value > max) {
        value = max;
        error = `Maximum is ${max}`;
      }
      this.setState({value});
      (this.props.debounce ? this.debouncedNotify : this.notify)(value);
    } else {
      error = 'Not a number';
    }
    this.setState({text, error});

  },

  handleBlur() {
    this.setState({text: this.state.value.toString()});
  },

  render() {
    let {label, width, disabled} = this.props;
    let {error, text} = this.state;
    return (
      <FormControl error={!!error} aria-describedby="name-error-text">
        <InputLabel htmlFor="name-error">{label}</InputLabel>
        <Input  disabled={disabled}
                type="number"
                style={{width: `${width * 30}px`}}
                inputRef={(node) => this.textField = node}
                value={text}
                onBlur={this.handleBlur}
                onChange={this.handleChange} />
        {error ? <FormHelperText id="name-error-text">{error}</FormHelperText> : null}
      </FormControl>
    );
  },
});

export default NumericInput;

