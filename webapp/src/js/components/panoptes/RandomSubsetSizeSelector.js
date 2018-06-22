import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import SelectWithNativeFallback from 'panoptes/SelectWithNativeFallback';

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
    let {label, value, style} = this.props;

    let options = [
      { key: NULL_VALUE , label: "No subsampling" , value: NULL_VALUE },
      { key: 20 , label: '20' , value: 20 },
      { key: 50 , label: '50' , value: 50 },
      { key: 100 , label: '100' , value: 100 },
      { key: 200 , label: '200' , value: 200 },
      { key: 500 , label: '500' , value: 500 },
      { key: 1000 , label: '1K' , value: 1000 },
      { key: 2000 , label: '2K' , value: 2000 },
      { key: 5000 , label: '5K' , value: 5000 },
      { key: 10000 , label: '10K' , value: 10000 },
      { key: 20000 , label: '20K' , value: 20000 },
      { key: 50000 , label: '50K' , value: 50000 },
      { key: 100000 , label: '100K' , value: 100000 },
      { key: 200000 , label: '200K' , value: 200000 },
      { key: 500000 , label: '500K' , value: 500000 },
    ];

    return (
      <SelectWithNativeFallback
        style={style}
        value={value}
        fullWidth={true}
        helperText={label}
        onChange={this.handleChangeValue}
        options={options}
      />
    );
  },
});

export default RandomSubsetSizeSelector;
