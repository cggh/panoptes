import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import LegendElement from 'panoptes/LegendElement';
import {propertyColour, scaleColour} from 'util/Colours';
import _map from 'lodash/map';
import FluxMixin from 'mixins/FluxMixin';

let ColourPropertyLegend = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    labelProperty: React.PropTypes.string,
    knownValues: React.PropTypes.array,
    min: React.PropTypes.number,
    max: React.PropTypes.number,
    maxLegendItems: React.PropTypes.number,
    colourProperty: React.PropTypes.string.isRequired
  },

  render() {
    let {table, labelProperty, knownValues, min, max, maxLegendItems, colourProperty} = this.props;

    // NOTE: render() is still called when isRequired props are not supplied.

    // If a labelProperty has not been provided, then use the table's primKey.
    labelProperty = labelProperty === undefined ? this.config.tablesById[table].primKey : labelProperty;

    const labelPropConfig = this.config.tablesById[table].propertiesById[labelProperty];
    const colourPropConfig = this.config.tablesById[table].propertiesById[colourProperty];
    const colourFunc = propertyColour(colourPropConfig);

    // Compose the list of legendElements.
    let legendElements = null;
    if (colourPropConfig.valueColours) {
      let valueColoursKeys = Object.keys(colourPropConfig.valueColours);
      legendElements = _map(valueColoursKeys.sort(),
        (key) => (
          <LegendElement key={key} name={key === '_other_' ? 'Other' : key} colour={colourPropConfig.valueColours[key]} />
        )
      );
    } else if (colourPropConfig.isBoolean) {
      legendElements = [
        <LegendElement key="false" name="False" colour={colourFunc(false)} />,
        <LegendElement key="true" name="True" colour={colourFunc(true)} />
      ];
    } else if (colourPropConfig.isCategorical || colourPropConfig.isText) {
      legendElements = _map(
        (knownValues || colourPropConfig.distinctValues || []).sort(),
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
        <div key="min" className="legend-element">{min || colourPropConfig.minVal}</div>,
        <div key="bar" className="legend-element">
          <div
            style={{width: '100px', height: '10px', background: background}}
          >
          </div>
        </div>,
        <div key="max" className="legend-element">{max || labelPropConfig.maxVal}</div>
      ];
    }

    return <div className="legend">
      <div className="legend-element">{labelPropConfig.name}:</div>
      {maxLegendItems === undefined || (maxLegendItems !== undefined && legendElements.length < maxLegendItems) ?
        legendElements
      : legendElements.slice(0, maxLegendItems).concat([<div key="more" className="legend-element">+{legendElements.length - maxLegendItems} more</div>])
      }
    </div>;
  }
});

export default ColourPropertyLegend;
