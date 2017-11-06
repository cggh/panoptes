import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {colours, propertyColour} from 'util/Colours';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin'; // required by ConfigMixin

let ProportionBar = createReactClass({
  displayName: 'ProportionBar',

  mixins: [
    FluxMixin, // required by ConfigMixin
    ConfigMixin,
  ],

  propTypes: {
    label: PropTypes.string,
    numerator: PropTypes.number.isRequired,
    denominator: PropTypes.number,
    convertToPercentage: PropTypes.bool,
    roundToInteger: PropTypes.bool,
    barHeight: PropTypes.string,
    colourTable: PropTypes.string,
    colourProperty: PropTypes.string,
    numeratorPropertyValue: PropTypes.string,
    remainderPropertyValue: PropTypes.string,
  },

  getDefaultProps() {
    return {
      denominator: 100,
      convertToPercentage: true,
      roundToInteger: true,
    };
  },

  render() {
    const {label, numerator, denominator, convertToPercentage, roundToInteger,
      barHeight, colourTable, colourProperty, numeratorPropertyValue, remainderPropertyValue
    } = this.props;

    const formattingFunction = roundToInteger ? (n) => Math.round(n) : (n) => n;
    const numeratorAsPercentage = Number(formattingFunction((numerator / denominator) * 100));
    const proportionAsString = convertToPercentage ? numeratorAsPercentage + '%' : formattingFunction(numerator) + '/' + formattingFunction(denominator);
    const sampleSizeAsString = denominator !== undefined ? denominator : '';
    const leftBarTextPercentageMinimum = 25;
    const leftBarText = numeratorAsPercentage < leftBarTextPercentageMinimum ? String.fromCharCode(8203) : proportionAsString;
    const rightBarText = numeratorAsPercentage < leftBarTextPercentageMinimum ? proportionAsString : String.fromCharCode(8203);

    const barStyle = {
      display: 'flex',
      alignItems: 'center',
    };

    let leftBarColour = colours[1];
    let rightBarColour = colours[0];
    if (colourTable !== undefined && colourProperty !== undefined && numeratorPropertyValue !== undefined) {
      let colourFunction = propertyColour(this.config.tablesById[colourTable].propertiesById[colourProperty]);
      leftBarColour = colourFunction(numeratorPropertyValue);
      if (remainderPropertyValue !== undefined) {
        rightBarColour = colourFunction(remainderPropertyValue);
      }
    }

    // Credit: https://24ways.org/2010/calculating-color-contrast
    function isHexColourDark(hexColour) {
      const r = parseInt(hexColour.substr(1, 2), 16);
      const g = parseInt(hexColour.substr(3, 2), 16);
      const b = parseInt(hexColour.substr(5, 2), 16);
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return (yiq >= 128) ? false : true;
    }

    const lightColour = '#F0F0F0';
    const darkColour = '#101010';
    const leftBarTextColour = isHexColourDark(leftBarColour) ? lightColour : darkColour;
    const rightBarTextColour = isHexColourDark(rightBarColour) ? lightColour : darkColour;

    const leftBarStyle = {
      width: numeratorAsPercentage + '%',
      backgroundColor: leftBarColour,
      color: leftBarTextColour,
      ...barStyle,
      justifyContent: 'flex-end',
      alignItems: 'center',
    };
    const rightBarStyle = {
      flexGrow: '1',
      backgroundColor: rightBarColour,
      color: rightBarTextColour,
      ...barStyle,
      justifyContent: 'flex-start',
    };

    if (numeratorAsPercentage < leftBarTextPercentageMinimum) {
      rightBarStyle.paddingLeft = '3px';
    } else {
      leftBarStyle.paddingRight = '3px';
    }

    return (
      <div style={{width: '100%', paddingTop: '5px', paddingBottom: '10px'}}>
        <div style={{display: 'inline-block', width: '30%', verticalAlign: 'top'}}>
          <div style={{paddingRight: '10px'}}>{label}</div>
        </div>
        {numerator !== undefined ?
          <div style={{display: 'inline-flex', width: '60%', verticalAlign: 'top', height: barHeight !== undefined ? barHeight : 'auto'}}>
            <div style={leftBarStyle}>{leftBarText}</div>
            <div style={rightBarStyle}>{rightBarText}</div>
          </div>
          : <div style={{display: 'inline-block', width: '60%', backgroundColor: colours[7], textAlign: 'center'}}>error</div>
        }
        <div style={{display: 'inline-block', width: '10%', textAlign: 'right', paddingLeft: '10px', verticalAlign: 'top'}}>
          {numerator !== undefined ? sampleSizeAsString : null}
        </div>
      </div>
    );

  },
});

export default ProportionBar;
