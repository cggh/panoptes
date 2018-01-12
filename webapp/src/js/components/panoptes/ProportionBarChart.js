import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin'; // required by ConfigMixin

import SQL from 'panoptes/SQL';
import resolveJoins from 'panoptes/resolveJoins';
import withAPIData from 'hoc/withAPIData';
import Loading from 'ui/Loading';
import classNames from 'classnames';
import ProportionBarChartWrap from 'containers/ProportionBarChartWrap';
import ProportionBarChartRow from 'panoptes/ProportionBarChartRow';

let ProportionBarChart = createReactClass({
  displayName: 'ProportionBarChart',

  mixins: [
    FluxMixin, // required by ConfigMixin
    ConfigMixin,
  ],

  propTypes: {
    rowTable: PropTypes.string.isRequired,
    rowTableJoinKeyColumn: PropTypes.string, // Defaults to same name as rowTable primKey.
    rowLabelColumn: PropTypes.string,
    rowTableQuery: PropTypes.string,
    rowTableJoins: PropTypes.array,
    rowTableOrder: PropTypes.array,
    proportionTable: PropTypes.string.isRequired,
    proportionTableJoinKeyColumn: PropTypes.string, // Defaults to same name as rowTableJoinKeyColumn.
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
    numberOfTickLabels: PropTypes.number, // Defaults to numberOfTickLines.
    showTickLabels: PropTypes.bool,
    onClickBehaviour: PropTypes.string,
    docLinkHref: PropTypes.string,
    config: PropTypes.object, // This will be provided via withAPIData
    rowTableData: PropTypes.array, // This will be provided via withAPIData
  },

  getDefaultProps() {
    return {
      rowLabelColumn: 'name',
      convertProportionsToPercentages: true,
      roundProportionsToIntegers: true,
      rowHeight: '35px',
      gridLineColour: '#EEEFEF',
      zeroLineColour: '#A0A0A0',
      numberOfTickLines: 10,
      showTickLabels: true,
      onClickBehaviour: 'ItemLink',
    };
  },

  render() {
    const {
      rowTable,
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
      rowTableData,
      className,
      numeratorBarColour,
      remainderBarColour,
      numeratorTextColour,
      remainderTextColour,
      numberOfTickLines,
      numberOfTickLabels,
      showTickLabels,
      onClickBehaviour,
      numeratorQuery,
      denominatorQuery,
      docLinkHref,
      rowLabelColumn,
      rowTableJoinKeyColumn,
      proportionTableJoinKeyColumn,
    } = this.props;

    if (rowTable === undefined) {
      return null;
    }

    if (rowTableData === undefined) {
      return (
        <div className={classNames('load-container', className)}>
          <Loading status="custom">Loading...</Loading>
        </div>
      );
    } else {

      const rowTablePrimKeyColumn = this.config.tablesById[rowTable].primKey;

      return (
        <ProportionBarChartWrap
          rowHeight={rowHeight}
          showTickLabels={showTickLabels}
          numberOfTickLines={numberOfTickLines}
          numberOfTickLabels={numberOfTickLabels}
        >
          {rowTableData.map((row, rowIndex) => {
            const rowPrimKeyValue = row[rowTablePrimKeyColumn];

            // Restrict the numeratorQuery and denominatorQuery to this row.
            const defaultedRowTableJoinKeyColumn = rowTableJoinKeyColumn !== undefined ? rowTableJoinKeyColumn : rowTablePrimKeyColumn;
            const defaultedProportionTableJoinKeyColumn = proportionTableJoinKeyColumn !== undefined ? proportionTableJoinKeyColumn : defaultedRowTableJoinKeyColumn;

            let numeratorQueryJSON = JSON.parse(numeratorQuery);
            numeratorQueryJSON.isRoot = false;
            let rowNumeratorQueryJSON = {
              isRoot: true,
              whcClass: 'compound',
              isCompound: true,
              Tpe: 'AND',
              Components: [numeratorQueryJSON],
            };
            rowNumeratorQueryJSON.Components.push({
              whcClass: 'comparefixed',
              isCompound: false,
              ColName: defaultedProportionTableJoinKeyColumn,
              Tpe: '=',
              CompValue: row[defaultedRowTableJoinKeyColumn],
            });
            const rowNumeratorQuery = JSON.stringify(rowNumeratorQueryJSON);

            let denominatorQueryJSON = JSON.parse(denominatorQuery);
            denominatorQueryJSON.isRoot = false;
            let rowDenominatorQueryJSON = {
              isRoot: true,
              whcClass: 'compound',
              isCompound: true,
              Tpe: 'AND',
              Components: [denominatorQueryJSON],
            };
            rowDenominatorQueryJSON.Components.push({
              whcClass: 'comparefixed',
              isCompound: false,
              ColName: defaultedProportionTableJoinKeyColumn,
              Tpe: '=',
              CompValue: row[defaultedRowTableJoinKeyColumn],
            });
            const rowDenominatorQuery = JSON.stringify(rowDenominatorQueryJSON);

            return (
              <ProportionBarChartRow
                key={'ProportionBarChartRow_' + rowPrimKeyValue}
                rowTable={rowTable}
                rowPrimKeyValue={rowPrimKeyValue}
                rowLabel={row[rowLabelColumn]}
                proportionTable={proportionTable}
                proportionTableColourColumn={proportionTableColourColumn}
                proportionTableColourColumnNumeratorValue={proportionTableColourColumnNumeratorValue}
                proportionTableColourColumnRemainderValue={proportionTableColourColumnRemainderValue}
                numeratorQuery={rowNumeratorQuery}
                denominatorQuery={rowDenominatorQuery}
                convertProportionsToPercentages={convertProportionsToPercentages}
                roundProportionsToIntegers={roundProportionsToIntegers}
                rowHeight={rowHeight}
                barHeight={barHeight}
                gridLineColour={gridLineColour}
                zeroLineColour={zeroLineColour}
                numeratorBarColour={numeratorBarColour}
                remainderBarColour={remainderBarColour}
                numeratorTextColour={numeratorTextColour}
                remainderTextColour={remainderTextColour}
                className={className}
                numberOfTickLines={numberOfTickLines}
                showTickLabels={showTickLabels}
                onClickBehaviour={onClickBehaviour}
                docLinkHref={docLinkHref}
              />
            );
          })}
        </ProportionBarChartWrap>
      );

    }

  }
});

ProportionBarChart = withAPIData(ProportionBarChart, ({config, props}) => {

  const {
    rowTable, rowLabelColumn, rowTableQuery, rowTableJoins, rowTableOrder,
  } = props;

  const amendedRowTableQuery = rowTableQuery || (rowTable ? config.tablesById[rowTable].defaultQuery : null) || SQL.nullQuery;
  const rowTablePrimKeyColumn = config.tablesById[rowTable].primKey;

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
          orderBy: rowTableOrder,
        }, config)
      },
    }
  };

});


export default ProportionBarChart;
