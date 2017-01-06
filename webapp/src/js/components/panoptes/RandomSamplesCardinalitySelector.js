import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

// NB: The null value cannot be undefined or null or '',
// because that apparently causes a problem with the SelectField presentation (label superimposed on floating label).
const NULL_VALUE = '— None —';

let RandomSamplesCardinalitySelector = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    label: React.PropTypes.string,
    value: React.PropTypes.oneOfType([React.PropTypes.number, React.PropTypes.string]), // NB: need string to work around SelectField bug
    onChange: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      label: 'Random sample set',
      value: NULL_VALUE
    };
  },

  handleChangeValue(value) {
    if (value === NULL_VALUE) {
      this.props.onChange(undefined);
    } else {
      this.props.onChange(value);
    }
  },

  render() {
    let {label, value} = this.props;

    let options = [
      <MenuItem key={NULL_VALUE} primaryText={NULL_VALUE} value={NULL_VALUE} />,
      <MenuItem key={20} primaryText={'20'} value={20} />,
      <MenuItem key={50} primaryText={'50'} value={50} />,
      <MenuItem key={100} primaryText={'100'} value={100} />,
      <MenuItem key={200} primaryText={'200'} value={200} />,
      <MenuItem key={500} primaryText={'500'} value={500} />,
      <MenuItem key={1000} primaryText={'1K'} value={1000} />,
      <MenuItem key={2000} primaryText={'2K'} value={2000} />,
      <MenuItem key={5000} primaryText={'5K'} value={5000} />,
      <MenuItem key={10000} primaryText={'10K'} value={10000} />,
      <MenuItem key={20000} primaryText={'20K'} value={20000} />,
      <MenuItem key={50000} primaryText={'50K'} value={50000} />,
      <MenuItem key={100000} primaryText={'100K'} value={100000} />,
      <MenuItem key={200000} primaryText={'200K'} value={200000} />,
      <MenuItem key={500000} primaryText={'500K'} value={500000} />,
    ];

    return (
      <SelectField
        value={value}
        autoWidth={true}
        floatingLabelText={label}
        onChange={(e, i, v) => this.handleChangeValue(v)}
      >
        {options}
      </SelectField>
    );
  }

});

export default RandomSamplesCardinalitySelector;
