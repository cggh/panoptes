import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import LegendElement from 'panoptes/LegendElement';
import {categoryColours} from 'util/Colours';

let PropertyPrefixLegend = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    prefix: React.PropTypes.string.isRequired
  },

  render() {
    let {table, prefix} = this.props;
    let legendElements = [];
    const colourFunction = categoryColours('__default__');
    let tableConfig = this.config.tablesById[table];

    // Get the list of properties that have the specfied prefix.
    let propertiesWithPrefix = Object.keys(tableConfig.propertiesById).filter((key) => key.startsWith(prefix)).sort();

    // Compose the legendElements
    for (let i = 0; i < propertiesWithPrefix.length; i++) {
      let propertyWithPrefix = propertiesWithPrefix[i];
      let name = tableConfig.propertiesById[propertyWithPrefix].name;
      legendElements.push(<LegendElement key={name} name={name} colour={colourFunction(propertyWithPrefix)} />);
    }

    return <div className="legend">
      {legendElements}
    </div>;
  }
});

export default PropertyPrefixLegend;
