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
    let focused = this.textField === document.activeElement;
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
      <FormControl error={!!error} aria-describedby="name-error-text">
        <InputLabel htmlFor="name-error">{label}</InputLabel>
        <Input  disabled={disabled}
                type="number"
                style={{width: `${width * 30}px`}}
                inputRef={(node) => this.textField = node}
                value={value}
                onBlur={this.handleBlur}
                onChange={this.handleChange} />
        {error ? <FormHelperText id="name-error-text">{error}</FormHelperText> : null}
      </FormControl>
    );
  },
});

export default NumericInput;

