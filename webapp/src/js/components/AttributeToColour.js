import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import filterChildren from 'util/filterChildren';
import {propertyColour} from "util/Colours";

let AttributeToColour = createReactClass({
  displayName: 'AttributeToColour',

  mixins: [
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: PropTypes.string,
    property: PropTypes.string,
    attribute: PropTypes.string,
  },

  getDefaultProps() {
    return {
      attribute: 'colour'
    }
  },

  render() {
    let {table, property, attribute, children, ...others} = this.props;
    if (this.props[attribute]) {
      return React.cloneElement(filterChildren(this, children),
        {
          ...others, [attribute]: this.props[attribute].map(
            propertyColour(this.config.tablesById[table].propertiesById[property]))
        });
    } else {
      throw new Error(
        `${attribute} not found`
      );
    }
  }
});

export default AttributeToColour
