import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin'; // required by ConfigMixin

import SQL from 'panoptes/SQL';
import withAPIData from 'hoc/withAPIData';
import {
  TableCell,
  TableRow,
} from 'material-ui/Table';

import {colours, propertyColour, isColourDark, scaleColour} from 'util/Colours';

import DocPage from 'panoptes/DocPage';
import _inRange from 'lodash.inrange';

let ProportionBarChartRow = createReactClass({
  displayName: 'ProportionBarChartRow',

  mixins: [
    FluxMixin, // required by ConfigMixin
    ConfigMixin,
  ],

  propTypes: {
    rowTable: PropTypes.string.isRequired,
    rowPrimKeyValue: PropTypes.string.isRequired,
    rowLabel: PropTypes.string.isRequired,
    rowLabelStyle: PropTypes.object,
    proportionTable: PropTypes.string.isRequired,
    proportionTableColourColumn: PropTypes.string, // To get property value colours from config.
    proportionTableColourColumnNumeratorValue: PropTypes.string, // To get property value colour from config.
    proportionTableColourColumnRemainderValue: PropTypes.string, // To get property value colour from config.
    numeratorQuery: PropTypes.string,
    denominatorQuery: PropTypes.string,
    convertProportionsToPercentages: PropTypes.bool,
    roundProportionsToIntegers: PropTypes.bool,
    rawNumerator: PropTypes.bool,
    rowHeight: PropTypes.string,
    barHeight: PropTypes.string,
    gridLineColour: PropTypes.string,
    zeroLineColour: PropTypes.string,
    numeratorBarColour: PropTypes.string,
    remainderBarColour: PropTypes.string,
    numeratorTextColour: PropTypes.string,
    remainderTextColour: PropTypes.string,
    className: PropTypes.string,
    numberOfTickLines: PropTypes.number,
    showTickLabels: PropTypes.bool,
    onClickBehaviour: PropTypes.string,
    onClickTable: PropTypes.string,
    onClickPrimKey: PropTypes.string,
    docLinkHref: PropTypes.string,
    sampleSizeWarningMinimum: PropTypes.number,
    zeroDenominatorContent: PropTypes.node,
    loadingBarContent: PropTypes.node,
    numberOfBins: PropTypes.number, // Overrides proportionTableColourColumn (any specified property config)
    colourRange: PropTypes.array, // Overrides proportionTableColourColumn (any specified property config)
    colourProperty: PropTypes.string,
    showMaxValueAsMaxColour: PropTypes.bool, // wrt value bins
    replaceParent: PropTypes.function,
    children: PropTypes.node,
    config: PropTypes.object, // This will be provided via withAPIData
    numeratorData: PropTypes.object, // This will be provided via withAPIData
    denominatorData: PropTypes.object, // This will be provided via withAPIData
  },

  getDefaultProps() {
    return {
      convertProportionsToPercentages: true,
      roundProportionsToIntegers: true,
      rowHeight: '35px',
      gridLineColour: '#EEEFEF',
      zeroLineColour: '#A0A0A0',
      numberOfTickLines: 10,
      onClickBehaviour: 'ItemLink',
      proportionTableJoins: [],
      proportionTableGroupByColumns: [],
      sampleSizeWarningMinimum: 0,
      rowLabelStyle: {margin: 0, padding: 0},
      zeroDenominatorContent: <span style={{paddingLeft: '3px'}}>No data</span>,
      loadingBarContent: <span style={{paddingLeft: '3px'}}>Loading...</span>,
      showMaxValueAsMaxColour: false,
      rawNumerator: false
    };
  },

  // NOTE: copied from ItemLink and re-parameterized
  handleClickItemLink(e, primKey) {
    const {rowTable, onClickTable, onClickPrimKey} = this.props;
    const table = onClickTable || rowTable;
    if (onClickPrimKey) {
      primKey = onClickPrimKey.replace('{}', primKey);
    }
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    if (!middleClick) {
      e.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({table, primKey: primKey.toString(), switchTo: !middleClick});
  },

  // NOTE: copied from DocLink and re-parameterized
  handleClickDocLink(e) {
    // children isn't used here, but is being excluded from ...other
    // https://eslint.org/docs/rules/no-unused-vars#ignorerestsiblings
    let {docLinkHref, replaceParent, children, config, rowTable, rowPrimKeyValue, ...other} = this.props;
    let primKeyPropertyName = config.tablesById[rowTable].primKey;
    other[primKeyPropertyName] = rowPrimKeyValue;
    const href = docLinkHref;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    e.stopPropagation();
    if (middleClick) {
      this.getFlux().actions.session.tabOpen(<DocPage path={href} {...other}/>, false);
    } else {
      if (replaceParent) {
        replaceParent(<DocPage path={href} {...other}/>);
      } else {
        this.getFlux().actions.session.tabOpen(<DocPage path={href} {...other}/>, true);
      }
    }
  },

  render() {
    const {
      rowPrimKeyValue,
      rowLabel,
      rowLabelStyle,
      proportionTable,
      proportionTableColourColumn,
      proportionTableColourColumnNumeratorValue,
      proportionTableColourColumnRemainderValue,
      convertProportionsToPercentages,
      roundProportionsToIntegers,
      rawNumerator,
      rowHeight,
      barHeight,
      gridLineColour,
      zeroLineColour,
      numeratorData,
      denominatorData,
      numeratorBarColour,
      remainderBarColour,
      numeratorTextColour,
      remainderTextColour,
      numberOfTickLines,
      onClickBehaviour,
      sampleSizeWarningMinimum,
      zeroDenominatorContent,
      loadingBarContent,
      numberOfBins,
      colourRange,
      colourProperty,

      showMaxValueAsMaxColour,
    } = this.props;

    const cellStyle = {
      border: 'none',
    };

    if (numeratorData === undefined || denominatorData === undefined) {
      // This is shown when the bar is still loading.
      // TODO: merge this markup with the loaded markup (for maintenance)
      return (
        <TableRow
          key={'row_' + rowPrimKeyValue}
          style={{
            height: rowHeight,
          }}
        >
          <TableCell
            style={{
              ...cellStyle,
              textAlign: 'left',
              borderRight: `solid ${zeroLineColour} 1px`,
              width: '30%',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              height: rowHeight,
              ...rowLabelStyle
            }}
          >
            {rowLabel}
          </TableCell>
          <TableCell
            style={{
              ...cellStyle,
              width: '60%',
              position: 'relative',
              height: rowHeight,
              overflow: 'hidden',
            }}
            padding="none"
          >
            <div
              style={{
                position: 'relative',
                display: 'table',
                width: '100%',
                height: barHeight !== undefined ? barHeight : 'auto',
              }}
            >
              {loadingBarContent}
            </div>
          </TableCell>
          <TableCell
            style={{
              ...cellStyle,
            }}
            padding="none"
          >
          </TableCell>
        </TableRow>
      );
    } else {

      const tickLineWidthPercentage = 100 / numberOfTickLines;
      let tickElements = [];
      for (let i = 1; i <= numberOfTickLines; i++) {
        tickElements.push(
          <div
            key={'tickElement_' + i}
            style={{
              position: 'relative',
              display: 'table-cell',
              width: tickLineWidthPercentage + '%',
              borderRight: `solid ${gridLineColour} 1px`,
            }}
          >
            &#8203;
          </div>
        );
      }

      const numerator = numeratorData.numerator !== undefined ? numeratorData.numerator[0] : 0;
      const denominator = denominatorData.denominator[0];

      //// Determine bar colours
      let leftBarColour = numeratorBarColour !== undefined ? numeratorBarColour : colours[1];
      let rightBarColour = remainderBarColour !== undefined ? remainderBarColour : 'transparent';

      if (numberOfBins === undefined && colourRange !== undefined) {
        const colourFunction = scaleColour([0, denominator], colourRange);
        leftBarColour = colourFunction(numerator);
      } else if (numberOfBins !== undefined && numberOfBins > 0 && colourRange !== undefined) {
        if (numerator === denominator && showMaxValueAsMaxColour) {
          const colourFunction = scaleColour([0, denominator], colourRange);
          leftBarColour = colourFunction(numerator);
        } else {
          const colourFunction = scaleColour([0, denominator], colourRange);
          const binValueWidth = denominator / numberOfBins;
          for (let binMinValueBoundary = 0; binMinValueBoundary < denominator; binMinValueBoundary += binValueWidth) {
            const binMaxValueBoundary = binMinValueBoundary + binValueWidth;
            const binMidValue = binMinValueBoundary + (binValueWidth / 2);
            const midValueAsColour = colourFunction(binMidValue);
            if (
              _inRange(numerator, binMinValueBoundary, binMaxValueBoundary)
              || (numerator === denominator && !showMaxValueAsMaxColour && binMinValueBoundary >= (denominator - binValueWidth))
            ) {
              leftBarColour = midValueAsColour;
              break;
            }
          }
        }
      } else if (proportionTable !== undefined && proportionTableColourColumn !== undefined && proportionTableColourColumnNumeratorValue !== undefined) {
        // Use proportionTable but don't override numeratorBarColour or remainderBarColour.
        if (this.config.tablesById[proportionTable].propertiesById[proportionTableColourColumn] === undefined) {
          throw Error('proportionTableColourColumn ' + proportionTableColourColumn + ' is not in the propertiesById config for proportionTable ' + proportionTable);
        }
        const colourFunction = propertyColour(this.config.tablesById[proportionTable].propertiesById[proportionTableColourColumn]);
        leftBarColour = numeratorBarColour !== undefined ? numeratorBarColour : colourFunction(proportionTableColourColumnNumeratorValue);
        if (proportionTableColourColumnRemainderValue !== undefined) {
          rightBarColour = remainderBarColour !== undefined ? remainderBarColour : colourFunction(proportionTableColourColumnRemainderValue);
        }
      } else if (colourProperty !== undefined) {
        const [cTable, cProp] = colourProperty.split('.');
        const colourFunction = propertyColour(this.config.tablesById[cTable].propertiesById[cProp]);
        leftBarColour = colourFunction(convertProportionsToPercentages ? 100 * (numerator/denominator) : numerator/denominator);
      }

      const lightColour = '#F0F0F0';
      const mediumColour = '#888888';
      const darkColour = '#101010';
      const leftBarColourIsDark = isColourDark(leftBarColour);
      const rightBarColourIsDark = isColourDark(rightBarColour);
      const leftBarTextColour = numeratorTextColour !== undefined ? numeratorTextColour : (leftBarColourIsDark === null ? mediumColour : (leftBarColourIsDark ? lightColour : darkColour));
      const rightBarTextColour = remainderTextColour !== undefined ? remainderTextColour : (rightBarColourIsDark === null ? mediumColour : (rightBarColourIsDark ? lightColour : darkColour));
      const leftBarStyle = {
        backgroundColor: leftBarColour,
        color: leftBarTextColour,
        textAlign: 'right',
        verticalAlign: 'middle',
      };
      const rightBarStyle = {
        backgroundColor: rightBarColour,
        color: rightBarTextColour,
        textAlign: 'left',
        verticalAlign: 'middle',
      };

      const formattingFunction = roundProportionsToIntegers ? (n) => Math.round(n) : (n) => n;
      if (denominator !== 0 && isNaN(numerator / denominator)) {
        console.error('numerator: ', numerator);
        console.error('denominator: ', denominator);
        console.error('numerator / denominator:', (numerator / denominator));
        throw Error('denominator !== 0 && isNaN(numerator / denominator)');
      }
      const numeratorAsPercentage = Number(formattingFunction((numerator / denominator) * 100));
      let proportionAsString = convertProportionsToPercentages ? numeratorAsPercentage + '%' : formattingFunction(numerator) + '/' + formattingFunction(denominator);
      if (rawNumerator) {
        proportionAsString = numerator.toString();
      }
      const sampleSizeAsString = denominator !== undefined ? `of ${denominator}` : '';
      const leftBarTextPercentageMinimum = 25;
      const leftBarText = numeratorAsPercentage < leftBarTextPercentageMinimum ? String.fromCharCode(8203) : proportionAsString;
      const rightBarText = numeratorAsPercentage < leftBarTextPercentageMinimum ? proportionAsString : String.fromCharCode(8203);

      const leftBarPadding = {};
      const rightBarPadding = {};
      if (numeratorAsPercentage < leftBarTextPercentageMinimum) {
        rightBarPadding.paddingLeft = '3px';
      } else {
        leftBarPadding.paddingRight = '3px';
      }

      let onClickHandler = undefined;
      if (onClickBehaviour === 'ItemLink') {
        onClickHandler = (e) => this.handleClickItemLink(e, rowPrimKeyValue);
      } else if (onClickBehaviour === 'DocLink') {
        onClickHandler = (e) => this.handleClickDocLink(e);
      }

      return (
        <TableRow
          key={'row_' + rowPrimKeyValue}
          onClick={onClickHandler}
          style={{
            cursor: 'pointer',
            height: rowHeight,
          }}
          hover={true}
        >
          <TableCell
            style={{
              ...cellStyle,
              textAlign: 'left',
              borderRight: `solid ${zeroLineColour} 1px`,
              width: '30%',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              height: rowHeight,
              opacity: sampleSizeWarningMinimum !== undefined && denominator < sampleSizeWarningMinimum ? 0.5 : 'inherit',
              ...rowLabelStyle
            }}
          >
            {rowLabel}
          </TableCell>
          <TableCell
            style={{
              ...cellStyle,
              width: '60%',
              position: 'relative',
              height: rowHeight,
              overflow: 'hidden',
            }}
            padding="none"
          >
            <div
              style={{
                position: 'absolute',
                top: '0',
                left: '0',
                display: 'table',
                width: '100%',
                height: '100%',
              }}
            >
              {tickElements}
            </div>
            {denominator !== 0 ?
              <div
                style={{
                  position: 'relative',
                  display: 'table',
                  width: '100%',
                  height: barHeight !== undefined ? barHeight : 'auto',
                  opacity: sampleSizeWarningMinimum !== undefined && denominator < sampleSizeWarningMinimum ? 0.5 : 'inherit',
                }}
              >
                <div style={{display: 'table-cell', width: numeratorAsPercentage + '%', ...leftBarStyle, ...leftBarPadding}}>{leftBarText}</div>
                <div style={{display: 'table-cell', ...rightBarStyle, ...rightBarPadding}}>{rightBarText}</div>
              </div>
              :
              <div
                style={{
                  position: 'relative',
                  display: 'table',
                  width: '100%',
                  height: barHeight !== undefined ? barHeight : 'auto',
                  opacity: sampleSizeWarningMinimum !== undefined && denominator < sampleSizeWarningMinimum ? 0.5 : 'inherit',
                }}
              >
                <div style={{display: 'table-cell'}}>{zeroDenominatorContent}</div>
              </div>
            }
          </TableCell>
          <TableCell
            style={{
              ...cellStyle,
              textAlign: 'right',
              opacity: sampleSizeWarningMinimum !== undefined && denominator < sampleSizeWarningMinimum ? 0.5 : 'inherit',
            }}
            padding="none"
          >
            {sampleSizeAsString}
          </TableCell>
        </TableRow>
      );
    }

  }
});


ProportionBarChartRow = withAPIData(ProportionBarChartRow, ({config, props}) => {

  const {proportionTable, numeratorQuery, denominatorQuery} = props;
  const amendedNumeratorQuery = numeratorQuery || (proportionTable ? config.tablesById[proportionTable].defaultQuery : null) || SQL.nullQuery;
  const amendedDenominatorQuery = denominatorQuery || (proportionTable ? config.tablesById[proportionTable].defaultQuery : null) || SQL.nullQuery;

  return {
    requests: {
      numeratorData: {
        method: 'query',
        args: {
          database: config.dataset,
          table: proportionTable,
          columns: [{expr: ['count', ['*']], as: 'numerator'}],
          query: amendedNumeratorQuery,
        }
      },
      denominatorData: {
        method: 'query',
        args: {
          database: config.dataset,
          table: proportionTable,
          columns: [{expr: ['count', ['*']], as: 'denominator'}],
          query: amendedDenominatorQuery,
        }
      }
    }
  };

});

export default ProportionBarChartRow;
