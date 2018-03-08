import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin'; // required by ConfigMixin

import SQL from 'panoptes/SQL';
import withAPIData from 'hoc/withAPIData';
import Loading from 'ui/Loading';
import {
  TableCell,
  TableRow,
} from 'material-ui/Table';
import classNames from 'classnames';
import Color from 'color';
import {colours, propertyColour} from 'util/Colours';
import DocPage from 'panoptes/DocPage';

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
    proportionTableColourColumn: PropTypes.string,
    proportionTableColourColumnNumeratorValue: PropTypes.string,
    proportionTableColourColumnRemainderValue: PropTypes.string,
    numeratorQuery: PropTypes.string,
    denominatorQuery: PropTypes.string,
    convertProportionsToPercentages: PropTypes.bool,
    roundProportionsToIntegers: PropTypes.bool,
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
    docLinkHref: PropTypes.string,
    sampleSizeWarningMinimum: PropTypes.number,
    zeroDenominatorContent: PropTypes.node,
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
      sampleSizeWarningMinimum: 200,
      rowLabelStyle: {margin: 0, padding: 0},
      zeroDenominatorContent: <span style={{paddingLeft: '3px'}}>No data</span>,
    };
  },

  // NOTE: copied from ItemLink and re-parameterized
  handleClickItemLink(e, primKey) {
    const {rowTable} = this.props;
    const table = rowTable;
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

  // Credit: https://24ways.org/2010/calculating-color-contrast
  isColourDark(colour) {
    if (colour === 'transparent' || colour === 'inherit' || colour === 'initial') {
      return null;
    }
    colour = Color(colour);
    const r = colour.red();
    const g = colour.green();
    const b = colour.blue();
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? false : true;
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
      rowHeight,
      barHeight,
      gridLineColour,
      zeroLineColour,
      numeratorData,
      denominatorData,
      className,
      numeratorBarColour,
      remainderBarColour,
      numeratorTextColour,
      remainderTextColour,
      numberOfTickLines,
      onClickBehaviour,
      sampleSizeWarningMinimum,
      zeroDenominatorContent,
    } = this.props;

    if (numeratorData === undefined || denominatorData === undefined) {
      return (
        <div className={classNames('load-container', className)}>
          <Loading status="custom">Loading...</Loading>
        </div>
      );
    } else {

      const cellStyle = {
        border: 'none',
      };

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

      //// Determine bar colours
      let leftBarColour = numeratorBarColour !== undefined ? numeratorBarColour : colours[1];
      let rightBarColour = remainderBarColour !== undefined ? remainderBarColour : 'transparent';
      // Use proportionTable but don't override numeratorBarColour or remainderBarColour.
      if (proportionTable !== undefined && proportionTableColourColumn !== undefined && proportionTableColourColumnNumeratorValue !== undefined) {
        if (this.config.tablesById[proportionTable].propertiesById[proportionTableColourColumn] === undefined) {
          console.error('proportionTableColourColumn ' + proportionTableColourColumn + ' is not in the propertiesById config for proportionTable ' + proportionTable);
        }
        const colourFunction = propertyColour(this.config.tablesById[proportionTable].propertiesById[proportionTableColourColumn]);
        leftBarColour = numeratorBarColour !== undefined ? numeratorBarColour : colourFunction(proportionTableColourColumnNumeratorValue);
        if (proportionTableColourColumnRemainderValue !== undefined) {
          rightBarColour = remainderBarColour !== undefined ? remainderBarColour : colourFunction(proportionTableColourColumnRemainderValue);
        }
      }
      const lightColour = '#F0F0F0';
      const mediumColour = '#888888';
      const darkColour = '#101010';
      const leftBarColourIsDark = this.isColourDark(leftBarColour);
      const rightBarColourIsDark = this.isColourDark(rightBarColour);
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

      const numerator = numeratorData.numerator !== undefined ? numeratorData.numerator[0] : 0;
      const denominator = denominatorData.denominator[0];
      const formattingFunction = roundProportionsToIntegers ? (n) => Math.round(n) : (n) => n;
      if (denominator !== 0 && isNaN(numerator / denominator)) {
        console.error('numerator: ', numerator);
        console.error('denominator: ', denominator);
        console.error('numerator / denominator:', (numerator / denominator));
        throw Error('denominator !== 0 && isNaN(numerator / denominator)');
      }
      const numeratorAsPercentage = Number(formattingFunction((numerator / denominator) * 100));
      const proportionAsString = convertProportionsToPercentages ? numeratorAsPercentage + '%' : formattingFunction(numerator) + '/' + formattingFunction(denominator);
      const sampleSizeAsString = denominator !== undefined ? denominator : '';
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
  const amendednumeratorQuery = numeratorQuery || (proportionTable ? config.tablesById[proportionTable].defaultQuery : null) || SQL.nullQuery;
  const amendeddenominatorQuery = denominatorQuery || (proportionTable ? config.tablesById[proportionTable].defaultQuery : null) || SQL.nullQuery;

  return {
    requests: {
      numeratorData: {
        method: 'query',
        args: {
          database: config.dataset,
          table: proportionTable,
          columns: [{expr: ['count', ['*']], as: 'numerator'}],
          query: amendednumeratorQuery,
        }
      },
      denominatorData: {
        method: 'query',
        args: {
          database: config.dataset,
          table: proportionTable,
          columns: [{expr: ['count', ['*']], as: 'denominator'}],
          query: amendeddenominatorQuery,
        }
      }
    }
  };

});

export default ProportionBarChartRow;
