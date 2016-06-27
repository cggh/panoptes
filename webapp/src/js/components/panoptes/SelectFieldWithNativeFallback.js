import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

// Constants for this component
// TODO: move to app config?
const MAX_SELECTFIELD_OPTIONS = 100;

let ItemLink = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  render() {
    let {value, autoWidth, floatingLabelText, onChange, options} = this.props;

    if (options.length > MAX_SELECTFIELD_OPTIONS) {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
         <option value=""></option>
          {options.map(({value, label}) =>
            <option
              key={value}
              value={value}
              label={label || value}
            />
          )}
        </select>
      );
    } else {
      return (
        <SelectField
          value={value}
          autoWidth={autoWidth}
          floatingLabelText={floatingLabelText}
          onChange={(e, i, v) => onChange(v)}
        >
          {options.map(({value, label, leftIcon, rightIcon, disabled}) =>
            <MenuItem
              key={value}
              value={value}
              primaryText={<div className="dropdown-option">{label || value}</div>}
              leftIcon={leftIcon}
              rightIcon={rightIcon}
              disabled={disabled}
            />
          )}
        </SelectField>
      );
    }

  }

});

module.exports = ItemLink;
