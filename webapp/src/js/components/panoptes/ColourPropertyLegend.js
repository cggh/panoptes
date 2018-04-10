import PropTypes from 'prop-types';
import React from 'react';
import _isEmpty from 'lodash.isempty';
import SQL from 'panoptes/SQL';
import withAPIData from 'hoc/withAPIData';
import LegendElement from 'panoptes/LegendElement';
import {propertyColour, scaleColour} from 'util/Colours';

class ColourPropertyLegend extends React.Component {

  static defaultProps = {
    query: SQL.nullQuery
  };

  static displayName = 'ColourPropertyLegend';

  static propTypes = {
    table: PropTypes.string.isRequired,
    labelProperty: PropTypes.string,
    maxLegendItems: PropTypes.number,
    colourProperty: PropTypes.string.isRequired,
    min: PropTypes.number,
    max: PropTypes.number,
    config: PropTypes.object, // This will be provided via withAPIData
    data: PropTypes.array // This will be provided via withAPIData
  };

  render() {
    let {table, labelProperty, maxLegendItems, colourProperty, config, data, max, min} = this.props;

    // NOTE: render() is still called when isRequired props are undefined.
    if (data === undefined || data === null) {
      return null;
    }

    // If a labelProperty has not been provided, then use the colourProperty
    labelProperty = labelProperty === undefined ? colourProperty : labelProperty;

    const labelPropConfig = config.tablesById[table].propertiesById[labelProperty];
    const colourPropConfig = config.tablesById[table].propertiesById[colourProperty];
    const colourFunc = propertyColour(colourPropConfig);

    if (!colourPropConfig.isBoolean && !colourPropConfig.isCategorical && !colourPropConfig.isText) {
      //// Default to a continous colour-gradient spectrum, corresponding to values.
      const colour = scaleColour([0, 1]);
      let background = `linear-gradient(to right, ${colour(0)} 0%`;
      for (let i = 0.1; i < 1; i += 0.1) {
        background += `,${colour(i)} ${i * 100}%`;
      }
      background += ')';
      const minVal = min === undefined ? colourPropConfig.minVal : min;
      const maxVal = max === undefined ? colourPropConfig.maxVal : max;
      return (
        <div className="legend">
          <div className="legend-title">{labelPropConfig.name}</div>
          <div key="minMax" style={{width: '100%', textAlign: 'center'}}>
            <span style={{width: minVal.toString().length + 'em', paddingRight: '0.5em'}}>{minVal.toString()}</span>
            <div style={{display: 'inline-block', width: 'calc(100% - ' + (minVal.toString().length + maxVal.toString().length + 1) + 'em)', background}}>&#8203;</div>
            <span style={{width: maxVal.toString().length + 'em', paddingLeft: '0.5em'}}>{maxVal.toString()}</span>
          </div>
        </div>
      );
    }

    // When colourPropConfig.isBoolean OR .isCategorical OR .isText
    // Translate the apiData data into legendElements.
    let legendElements = [];
    if (colourPropConfig.isBoolean) {
      legendElements = [
        <LegendElement key="false" name="False" colour={colourFunc(false)} />,
        <LegendElement key="true" name="True" colour={colourFunc(true)} />
      ];
    } else if (colourPropConfig.isCategorical || colourPropConfig.isText) {
      for (let i = 0; i < data.length; i++) {
        let label = data[i][labelProperty];
        let colour = data[i][colourProperty];
        let legendElement = <LegendElement key={`LegendElement_${i}`} name={label !== null ? label : 'NULL'} colour={colourFunc(colour)} />;
        legendElements.push(legendElement);
      }
    }

    if (_isEmpty(legendElements)) {
      return null;
    }

    return <div className="legend">
      <div className="legend-element">{labelPropConfig.name}:</div>
      {maxLegendItems === undefined || (maxLegendItems !== undefined && legendElements.length < maxLegendItems) ?
        legendElements
        : legendElements.slice(0, maxLegendItems).concat([<div key="more" className="legend-element">+{legendElements.length - maxLegendItems} more</div>])
      }
    </div>;
  }
}

ColourPropertyLegend = withAPIData(ColourPropertyLegend, ({config, props}) => {

  let {table, colourProperty, labelProperty, query} = props;
  query = query ||
    (table ? config.tablesById[table].defaultQuery : null) ||
    SQL.nullQuery;


  let columns = [colourProperty, (labelProperty === undefined ? config.tablesById[table].primKey : labelProperty)];

  return {
    requests: {
      data: {
        method: 'query',
        args: {
          database: config.dataset,
          table,
          columns,
          query,
          transpose: true
        }
      }
    }
  };
});

export default ColourPropertyLegend;
