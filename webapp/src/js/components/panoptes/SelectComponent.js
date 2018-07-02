import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import _map from 'lodash.map';
import Select from '@material-ui/core/Select';
import {Input, InputLabel} from '@material-ui/core';
import {FormControl, FormHelperText} from '@material-ui/core';
import {MenuItem} from '@material-ui/core';
import FluxMixin from 'mixins/FluxMixin';
import filterChildren from 'util/filterChildren';
import uid from 'uid';

let SelectComponent = createReactClass({
  displayName: 'SelectComponent',

  mixins: [
    FluxMixin,
  ],

  propTypes: {
    children: PropTypes.node,
    selectedIndex: PropTypes.string,
    label: PropTypes.string
  },

  getDefaultProps() {
    return {
    };
  },

  getInitialState() {
    return {
      selectedIndex: (this.props.selectedIndex !== undefined ? this.props.selectedIndex : ''),
      uid: uid(5)
    };
  },

  handleChange(event, options) {
    const selectedIndex = event.target.value;
    this.setState({selectedIndex});
    let selectedOption = options[selectedIndex];
    this.getFlux().actions.session.popupOpen(selectedOption);
  },

  render() {
    const {children, label} = this.props;
    const options = filterChildren(this, React.Children.toArray(children), ['option']);

    // NOTE: Select (Input) values can only be string, number, or Array of number (for multiple selects):
    // https://material-ui-1dab0.firebaseapp.com/api/input/

    return (
      <FormControl fullWidth={true}>
        <InputLabel htmlFor={this.state.uid}>{label}</InputLabel>
        <Select
          value={this.state.selectedIndex}
          onChange={this.handleChange}
          input={<Input id={this.state.uid} />}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {_map(options, (row) => <MenuItem key={row.props.index} value={row.props.index}>{row.props.label}</MenuItem>)}
        </Select>
      </FormControl>
    );
  },
});

export default SelectComponent;
