import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import LegendElement from 'panoptes/LegendElement';
import {propertyColour, scaleColour} from 'util/Colours';
import _map from 'lodash/map';
import _sortBy from 'lodash/sortBy';
import FluxMixin from 'mixins/FluxMixin';

let PropertyLegend = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: React.PropTypes.string,
    property: React.PropTypes.string,
    knownValues: React.PropTypes.array,
    min: React.PropTypes.number,
    max: React.PropTypes.number
  },

  render() {
    let {table, property, knownValues, min, max} = this.props;
    if (!table || !property) return null;
    const propConfig = this.config.tablesById[table].propertiesById[property];
    const colourFunc = propertyColour(propConfig);
    let elements = null;
    if (propConfig.valueColours) {
      let valueColoursKeys = Object.keys(propConfig.valueColours);
      elements = _map(valueColoursKeys.sort(),
        (key) => (
          <LegendElement key={key} name={key === '_other_' ? 'Other' : key} colour={propConfig.valueColours[key]} />
        )
      );
    } else if (propConfig.isBoolean) {
      elements = [
        <LegendElement key="false" name="False" colour={colourFunc(false)} />,
        <LegendElement key="true" name="True" colour={colourFunc(true)} />
      ];
    } else if (propConfig.isCategorical || propConfig.isText) {
      elements = _map(
        (knownValues || propConfig.distinctValues || []).sort(),
        (value) => (
          <LegendElement key={value} name={value !== null ? value : 'NULL'} colour={colourFunc(value)} />
        )
      );
    } else {
      const colour = scaleColour([0, 1]);
      let background = `linear-gradient(to right, ${colour(0)} 0%`;
      for (let i = 0.1; i < 1; i += 0.1) {
        background += `,${colour(i)} ${i * 100}%`;
      }
      background += ')';
      elements = [
        <div key="min" className="legend-element">{min || propConfig.minVal}</div>,
        <div key="bar" className="legend-element">
          <div
            style={{width: '100px', height: '10px', background: background}}
          >
          </div>
        </div>,
        <div key="max" className="legend-element">{max || propConfig.maxVal}</div>
      ];
    }
    return <div className="legend">
      <div className="legend-element">{propConfig.name}:</div>
      {elements}
    </div>;
  }
});

export default PropertyLegend;
