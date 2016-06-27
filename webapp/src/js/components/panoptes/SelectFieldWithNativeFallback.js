import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

// Constants for this component
// TODO: move to app config?
const MAX_SELECTFIELD_OPTIONS = 1;

let ItemLink = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  render() {
    let {value, autoWidth, floatingLabelText, onChange, options} = this.props;
console.log('options.length: %o', options.length);

    if (options.length > MAX_SELECTFIELD_OPTIONS) {
      return (
        <select
          value={value}
          onChange={onChange}
        >
          {options.map(({value, label}) =>
            <option value={value} key={value} label={label} />
          )}
        </select>
      );
    } else {
      return (
        <SelectField
          value={value}
          autoWidth={autoWidth}
          floatingLabelText={floatingLabelText}
          onChange={onChange}
        >
          {options.map(({value, label}) =>
            <MenuItem value={value} key={value} primaryText={<div className="dropdown-option">{label}</div>}/>
          )}
        </SelectField>
      );
    }

  }

});

module.exports = ItemLink;
