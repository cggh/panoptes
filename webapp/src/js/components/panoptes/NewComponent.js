import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin'; // required by ConfigMixin

import SQL from 'panoptes/SQL';
import resolveJoins from 'panoptes/resolveJoins';
import withAPIData from 'hoc/withAPIData';
import Loading from 'ui/Loading';
import Table, {
  TableBody,
  TableCell,
  TableRow,
} from 'material-ui/Table';
import classNames from 'classnames';
import Color from 'color';
import {colours, propertyColour} from 'util/Colours';

let NewComponent = createReactClass({
  displayName: 'NewComponent',

  mixins: [
    FluxMixin, // required by ConfigMixin
    ConfigMixin,
  ],

  propTypes: {
    rowTable: PropTypes.string.isRequired,
    rowLabelColumn: PropTypes.string,
    rowTableQuery: PropTypes.string,
    rowTableJoins: PropTypes.array,
    rowTableOrder: PropTypes.array,
    proportionTable: PropTypes.string.isRequired,
    proportionTableForeignKeyColumn: PropTypes.string, // Defaults to same name as rowTable primKey.
    proportionTableColourColumn: PropTypes.string,
    proportionTableColourColumnNumeratorValue: PropTypes.string,
    proportionTableColourColumnRemainderValue: PropTypes.string,
    numeratorQuery: PropTypes.string,
    denominatorQuery: PropTypes.string,
    convertProportionsToPercentages: PropTypes.bool,
    roundProportionsToIntegers: PropTypes.bool,
    rowHeight: PropTypes.string,
    gridLineColour: PropTypes.string,
    zeroLineColour: PropTypes.string,
    numeratorBarColour: PropTypes.string,
    remainderBarColour: PropTypes.string,
    numeratorTextColour: PropTypes.string,
    remainderTextColour: PropTypes.string,
    className: PropTypes.string,
    numberOfTickLines: PropTypes.number,
    numberOfTickLabels: PropTypes.number, // Defaults to numberOfTickLines.
    showTickLabels: PropTypes.bool,
    config: PropTypes.object, // This will be provided via withAPIData
    rowTableData: PropTypes.array, // This will be provided via withAPIData
    numeratorData: PropTypes.array, // This will be provided via withAPIData
    denominatorData: PropTypes.array, // This will be provided via withAPIData
  },

  getDefaultProps() {
    return {
      rowLabelColumn: 'name',
      rowTableOrder: [],
      rowTableJoins: [],
      convertProportionsToPercentages: true,
      roundProportionsToIntegers: true,
      rowHeight: '50px',
      gridLineColour: '#EEEFEF',
      zeroLineColour: '#A0A0A0',
      numberOfTickLines: 10,
      showTickLabels: true,
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded',
    };
  },

  handleClick(e, primKey) {
    const {rowTable} = this.props;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    if (!middleClick) {
      e.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({rowTable, primKey: primKey.toString(), switchTo: !middleClick});
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
      rowTable,
      rowLabelColumn,
      proportionTable,
      proportionTableColourColumn,
      proportionTableColourColumnNumeratorValue,
      proportionTableColourColumnRemainderValue,
      convertProportionsToPercentages,
      roundProportionsToIntegers,
      rowHeight,
      gridLineColour,
      zeroLineColour,
      rowTableData,
      numeratorData,
      denominatorData,
      className,
      numeratorBarColour,
      remainderBarColour,
      numeratorTextColour,
      remainderTextColour,
      numberOfTickLines,
      numberOfTickLabels,
      showTickLabels,
    } = this.props;

    if (rowTable === undefined) {
      return null;
    }

    if (rowTableData === undefined || numeratorData === undefined || denominatorData === undefined) {
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

      const amendedNumberOfTickLabels = numberOfTickLabels !== undefined ? numberOfTickLabels : numberOfTickLines;

      const tickLabelWidthPercentage = 100 / amendedNumberOfTickLabels;
      let tickPercentageElements = [];
      for (let i = 1; i <= amendedNumberOfTickLabels; i++) {
        tickPercentageElements.push(
          <div
            style={{
              position: 'relative',
              display: 'table-cell',
              width: tickLabelWidthPercentage + '%',
              textAlign: 'center',
              left: '' + (tickLabelWidthPercentage / 2) + '%',
            }}
          >
            {i * tickLabelWidthPercentage}%
          </div>
        );
      }

      const rowTablePrimKeyColumn = this.config.tablesById[rowTable].primKey;

      //Convert numeratorData and denominatorData to an associative arrays.
      let numeratorsByRowPrimKeyValue = {};
      for (let i = 0; i < numeratorData.length; i++) {
        numeratorsByRowPrimKeyValue[numeratorData[i][rowTablePrimKeyColumn]] = numeratorData[i].numerator;
      }
      let denominatorsByRowPrimKeyValue = {};
      for (let i = 0; i < denominatorData.length; i++) {
        denominatorsByRowPrimKeyValue[denominatorData[i][rowTablePrimKeyColumn]] = denominatorData[i].denominator;
      }

      //// Determine bar colours
      let leftBarColour = numeratorBarColour !== undefined ? numeratorBarColour : colours[1];
      let rightBarColour = remainderBarColour !== undefined ? remainderBarColour : 'transparent';
      if (proportionTable !== undefined && proportionTableColourColumn !== undefined && proportionTableColourColumnNumeratorValue !== undefined) {
        if (this.config.tablesById[proportionTable].propertiesById[proportionTableColourColumn] === undefined) {
          console.error('proportionTableColourColumn ' + proportionTableColourColumn + ' is not in the propertiesById config for proportionTable ' + proportionTable);
        }
        const colourFunction = propertyColour(this.config.tablesById[proportionTable].propertiesById[proportionTableColourColumn]);
        leftBarColour = colourFunction(proportionTableColourColumnNumeratorValue);
        if (proportionTableColourColumnRemainderValue !== undefined) {
          rightBarColour = colourFunction(proportionTableColourColumnRemainderValue);
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
      };
      const rightBarStyle = {
        backgroundColor: rightBarColour,
        color: rightBarTextColour,
        textAlign: 'left',
      };

      return (
        <Table>
          <TableBody>
            {rowTableData.map((row, rowIndex) => {

              const rowPrimKeyValue = row[rowTablePrimKeyColumn];
              const numerator = numeratorsByRowPrimKeyValue[rowPrimKeyValue] !== undefined ? numeratorsByRowPrimKeyValue[rowPrimKeyValue] : 0;
              const denominator = denominatorsByRowPrimKeyValue[rowPrimKeyValue];
              const formattingFunction = roundProportionsToIntegers ? (n) => Math.round(n) : (n) => n;
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

              return (
                <TableRow
                  key={'row_' + rowPrimKeyValue}
                  onClick={(e) => this.handleClick(e, rowPrimKeyValue)}
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
                    }}
                    padding="none"
                  >
                    {row[rowLabelColumn]}
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
                    <div
                      style={{
                        position: 'relative',
                        display: 'table',
                        width: '100%',
                      }}
                    >
                      <div style={{display: 'table-cell', width: numeratorAsPercentage + '%', ...leftBarStyle, ...leftBarPadding}}>{leftBarText}</div>
                      <div style={{display: 'table-cell', ...rightBarStyle, ...rightBarPadding}}>{rightBarText}</div>
                    </div>
                  </TableCell>
                  <TableCell
                    style={{
                      ...cellStyle,
                      textAlign: 'right',
                    }}
                    padding="none"
                  >
                    {sampleSizeAsString}
                  </TableCell>
                </TableRow>
              );
            })}
            {showTickLabels ?
              <TableRow
                key={'row_tickPercentages'}
                hover={false}
              >
                <TableCell
                  style={{
                    ...cellStyle,
                    position: 'relative',
                    width: '30%',
                    height: rowHeight,
                  }}
                  padding="none"
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '0',
                      right: '-1em',
                    }}
                  >
                      0%
                  </div>
                </TableCell>
                <TableCell
                  style={{
                    ...cellStyle,
                    width: '60%',
                    position: 'relative',
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
                    {tickPercentageElements}
                  </div>
                </TableCell>
              </TableRow>
              : null
            }
          </TableBody>
        </Table>
      );
    }

  }
});

NewComponent = withAPIData(NewComponent, ({config, props}) => {

  const {
    rowTable, rowLabelColumn, rowTableQuery, rowTableJoins, rowTableOrder,
    proportionTable, proportionTableForeignKeyColumn, numeratorQuery, denominatorQuery,
  } = props;

  const amendedRowTableQuery = rowTableQuery || (rowTable ? config.tablesById[rowTable].defaultQuery : null) || SQL.nullQuery;
  const amendednumeratorQuery = numeratorQuery || (proportionTable ? config.tablesById[proportionTable].defaultQuery : null) || SQL.nullQuery;
  const amendeddenominatorQuery = denominatorQuery || (proportionTable ? config.tablesById[proportionTable].defaultQuery : null) || SQL.nullQuery;
  const rowTablePrimKeyColumn = config.tablesById[rowTable].primKey;
  const qualifiedRowTablePrimKeyColumn = rowTable + '.' + rowTablePrimKeyColumn;
  const amendedProportionTableForeignKeyColumn = proportionTableForeignKeyColumn !== undefined ? proportionTableForeignKeyColumn : rowTablePrimKeyColumn;
  const qualifiedAmendedProportionTableForeignKeyColumn = proportionTable + '.' + amendedProportionTableForeignKeyColumn;
  const proportionTableJoins = [{'type': 'INNER', 'foreignTable': rowTable, 'foreignColumn': qualifiedRowTablePrimKeyColumn, 'column': qualifiedAmendedProportionTableForeignKeyColumn}];

  return {
    requests: {
      rowTableData: {
        method: 'query',
        args: resolveJoins({
          database: config.dataset,
          table: rowTable,
          columns: [rowLabelColumn, rowTablePrimKeyColumn],
          query: amendedRowTableQuery,
          transpose: true,
          joins: rowTableJoins,
          orderBy: rowTableOrder
        }, config)
      },
      numeratorData: {
        method: 'query',
        args: {
          database: config.dataset,
          table: proportionTable,
          columns: [{expr: ['count', ['*']], as: 'numerator'}, qualifiedRowTablePrimKeyColumn],
          transpose: true,
          query: amendednumeratorQuery,
          joins: proportionTableJoins,
          groupBy: [qualifiedRowTablePrimKeyColumn]
        }
      },
      denominatorData: {
        method: 'query',
        args: {
          database: config.dataset,
          table: proportionTable,
          columns: [{expr: ['count', ['*']], as: 'denominator'}, qualifiedRowTablePrimKeyColumn],
          query: amendeddenominatorQuery,
          transpose: true,
          joins: proportionTableJoins,
          groupBy: [qualifiedRowTablePrimKeyColumn]
        }
      }
    }
  };

});


export default NewComponent;
