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
    max: React.PropTypes.number,
    maxLegendItems: React.PropTypes.number
  },

  render() {
    let {table, property, knownValues, min, max, maxLegendItems} = this.props;
    if (!table || !property) return null;
    const propConfig = this.config.tablesById[table].propertiesById[property];
    const colourFunc = propertyColour(propConfig);
    let legendElements = null;
    if (propConfig.valueColours) {
      let valueColoursKeys = Object.keys(propConfig.valueColours);
      legendElements = _map(valueColoursKeys.sort(),
        (key) => (
          <LegendElement key={key} name={key === '_other_' ? 'Other' : key} colour={propConfig.valueColours[key]} />
        )
      );
    } else if (propConfig.isBoolean) {
      legendElements = [
        <LegendElement key="false" name="False" colour={colourFunc(false)} />,
        <LegendElement key="true" name="True" colour={colourFunc(true)} />
      ];
    } else if (propConfig.isCategorical || propConfig.isText) {
      legendElements = _map(
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
      legendElements = [
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
      {maxLegendItems !== undefined && legendElements.length < maxLegendItems ?
        legendElements
      : legendElements.slice(0, maxLegendItems).concat([<div key="more" className="legend-element">+{legendElements.length - maxLegendItems} more</div>])
      }
    </div>;
  }
});

export default PropertyLegend;
