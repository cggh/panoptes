import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

// NB: The null value cannot be undefined or null or '',
// because that apparently causes a problem with the SelectField presentation (label superimposed on floating label).
const NULL_VALUE = '__NULL__';

let RandomSubsetSizeSelector = createReactClass({
  displayName: 'RandomSubsetSizeSelector',

  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    label: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), // NB: need string to work around SelectField bug
    onChange: PropTypes.func
  },

  getDefaultProps() {
    return {
      label: 'Random subset size',
      value: NULL_VALUE
    };
  },

  handleChangeValue(value) {
    if (value === NULL_VALUE) {
      this.props.onChange(null);
    } else {
      this.props.onChange(value);
    }
  },

  render() {
    let {label, value} = this.props;

    let options = [
      <MenuItem key={NULL_VALUE} primaryText="No subsampling" value={NULL_VALUE} />,
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
        value={value === NULL_VALUE ? undefined : value}
        autoWidth={true}
        floatingLabelText={label}
        onChange={(e, i, v) => this.handleChangeValue(v)}
      >
        {options}
      </SelectField>
    );
  },
});

export default RandomSubsetSizeSelector;
