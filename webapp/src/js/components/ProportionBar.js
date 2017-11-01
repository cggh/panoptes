import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {colours} from 'util/Colours';

let ProportionBar = createReactClass({
  displayName: 'ProportionBar',

  propTypes: {
    label: PropTypes.string,
    numerator: PropTypes.number.isRequired,
    denominator: PropTypes.number,
    convertToPercentage: PropTypes.bool,
    roundToInteger: PropTypes.bool,
    barHeight: PropTypes.string,
  },

  getDefaultProps() {
    return {
      denominator: 100,
      convertToPercentage: true,
      roundToInteger: true,
    };
  },

  render() {
    const {label, numerator, denominator, convertToPercentage, roundToInteger, barHeight} = this.props;

    const formattingFunction = roundToInteger ? (n) => Math.round(n) : (n) => n;
    const numeratorAsPercentage = Number(formattingFunction((numerator / denominator) * 100));
    const proportionAsString = convertToPercentage ? numeratorAsPercentage + '%' : formattingFunction(numerator) + '/' + formattingFunction(denominator);
    const sampleSizeAsString = denominator !== undefined ? denominator : '';

    const leftBarText = numeratorAsPercentage < 10 ? String.fromCharCode(8203) : proportionAsString;
    const rightBarText = numeratorAsPercentage < 10 ? proportionAsString : String.fromCharCode(8203);

    const textShadow = '0px 0px 3px #fff, 0px 0px 2px #fff';

    const barStyle = {
      textShadow,
      display: 'flex',
      alignItems: 'center',
    };

    const leftBarStyle = {
      width: numeratorAsPercentage + '%',
      backgroundColor: colours[1],
      ...barStyle,
      justifyContent: 'flex-end',
      alignItems: 'center',
    };
    const rightBarStyle = {
      flexGrow: '1',
      backgroundColor: colours[0],
      ...barStyle,
      justifyContent: 'flex-start',
    };

    if (numeratorAsPercentage < 10) {
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
