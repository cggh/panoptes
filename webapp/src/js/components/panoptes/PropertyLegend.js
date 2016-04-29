import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import {propertyColour, scaleColour} from 'util/Colours';
import _map from 'lodash/map';

let PropertyLegend = React.createClass({
  mixins: [
    PureRenderMixin,
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
    const propConfig = this.config.tables[table].propertiesMap[property];
    const colourFunc = propertyColour(propConfig);
    let elements = null;
    if (propConfig.categoryColors) {
      elements = _map(propConfig.categoryColors, (key, colour) => <div key={key} style={{color: colourFunc(colour)}}> {key} </div>);
    } else if (propConfig.isBoolean) {
      elements = [
        <div key="true" className="legend-element" style={{color: colourFunc(true)}}> True </div>,
        <div key="false" className="legend-element" style={{color: colourFunc(false)}}> False </div>
      ];
    } else if (propConfig.isCategorical) {
      elements = _map(propConfig.propCategories, (key, colour) => <div key={key} style={{color: colourFunc(colour)}}> {key} </div>);
    } else if (propConfig.isText) {
      elements = _map(knownValues || [], (key, colour) => <div key={key} style={{color: colourFunc(colour)}}> {key} </div>);
    } else {
      const colour = scaleColour([0,1]);
      let background = `linear-gradient(to right, ${colour(0)} 0%`;
      for (let i = 0.1; i < 1; i += 0.1) {
        background += `,${colour(i)} ${i*100}%`
      }
      background += ')';
      elements = [<div key="min" className="legend-element">{min || propConfig.minVal}</div>,
                  <div key="bar" className="legend-element">
                    <div style={{width: '100px',
                                 height: '10px',
                                 background: background}}>
                    </div>
                  </div>,
                  <div key="max" className="legend-element">{max || propConfig.maxVal}</div>];
    }

    return <div className="legend">
      <div className="legend-element">{propConfig.name}:</div>
      {elements}
    </div>;
  }
});

module.exports = PropertyLegend;
