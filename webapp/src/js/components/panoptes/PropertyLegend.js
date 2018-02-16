import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import LegendElement from 'panoptes/LegendElement';
import {propertyColour, scaleColour} from 'util/Colours';
import _map from 'lodash.map';
import FluxMixin from 'mixins/FluxMixin';

let PropertyLegend = createReactClass({
  displayName: 'PropertyLegend',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: PropTypes.string,
    property: PropTypes.string,
    knownValues: PropTypes.array,
    min: PropTypes.number,
    max: PropTypes.number,
    maxLegendItems: PropTypes.number
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
          knownValues !== undefined && knownValues.indexOf(key) === -1 ? null : <LegendElement key={key} name={key === '_other_' ? 'Other' : (propConfig.valueDisplays !== undefined ? propConfig.valueDisplays[key] : key)} colour={propConfig.valueColours[key]} />
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
          <LegendElement key={value} name={value !== null ? (propConfig.valueDisplays !== undefined ? propConfig.valueDisplays[value] : value) : 'NULL'} colour={colourFunc(value)} />
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
            style={{width: '100px', height: '10px', background}}
          >
          </div>
        </div>,
        <div key="max" className="legend-element">{max || propConfig.maxVal}</div>
      ];
    }

    return <div className="legend">
      <div className="legend-element">{propConfig.name}:</div>
      {maxLegendItems === undefined || (maxLegendItems !== undefined && legendElements.length < maxLegendItems) ?
        legendElements
        : legendElements.slice(0, maxLegendItems).concat([<div key="more" className="legend-element">+{legendElements.length - maxLegendItems} more</div>])
      }
    </div>;
  },
});

export default PropertyLegend;
