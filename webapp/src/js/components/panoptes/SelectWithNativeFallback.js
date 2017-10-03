import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import Select from 'material-ui/Select';
import {MenuItem} from 'material-ui/Menu';
import {FormControl, FormHelperText} from 'material-ui/Form';
import Input, {InputLabel} from 'material-ui/Input';
import uid from 'uid';

import "select.scss";

// Constants for this component
const MAX_SELECTFIELD_OPTIONS = 100;

let SelectWithNativeFallback = createReactClass({
  displayName: 'SelectWithNativeFallback',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    fullWidth: PropTypes.bool,
    label: PropTypes.string,
    onChange: PropTypes.func,
    options: PropTypes.array,
    disabled: PropTypes.bool,
    helperText: PropTypes.string,
    allowNone: PropTypes.bool
  },

  getDefaultProps() {
    return {
      options: [],
      value: ''
    }
  },

  getInitialState() {
    return {
      uid: uid(5)
    };
  },


  render() {
    let {value, fullWidth, helperText, label, onChange, allowNone, options} = this.props;

    if (options.length > MAX_SELECTFIELD_OPTIONS) {
      return (
        <div className="native-select" >
          <label >
            {helperText || label}
          </label>
          <div className="native-select-inner">
            <div className="native-select-inner2">
              <div className="native-select-inner3"> </div>
              <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
              >
                <option
                  className="dropdown-option"
                  value=""
                />
                {options.map(({value, label}) =>
                  <option
                    className="dropdown-option"
                    key={value}
                    value={value}
                    label={label || value}
                  />
                )}
              </select>
              <svg
                viewBox="0 0 24 24"
                style={{
                }}
              >
                <path d="M7 10l5 5 5-5z"/>
              </svg>
              <div className="native-select-inner4" />
              <div className="native-select-inner5" />
            </div>
          </div>
          <div>
            <hr className="native-select-hr" />
            <hr className="native-select-hr2" />
          </div>
        </div>
      );
    } else {
      return (
        <FormControl fullWidth={fullWidth}>
          <InputLabel htmlFor={this.state.uid}>{helperText}</InputLabel>
          <Select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            input={<Input id={this.state.uid} />}
          >
            { allowNone ? <MenuItem value="">
              <em>None</em>
            </MenuItem> : null }
            {options.map(({value, label, leftIcon, rightIcon, disabled}) =>
              <MenuItem
                key={value}
                value={value}
                // leftIcon={leftIcon} //Icons in mui v1?
                // rightIcon={rightIcon}
                disabled={disabled}
              >
                <div className="dropdown-option">{label || value}</div>
              </MenuItem>
            )}
          </Select>
          <FormHelperText>{label}</FormHelperText>
        </FormControl>
      );
    }

  },
});

export default SelectWithNativeFallback;
