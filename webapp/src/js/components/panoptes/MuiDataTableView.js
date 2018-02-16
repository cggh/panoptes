import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import classNames from 'classnames';
import Color from 'color';
import Tooltip from 'rc-tooltip';
//import Tooltip from 'material-ui/Tooltip';
// NOTE: material-ui/Tooltip doesn't have a native trigger="click" equivalent
// and its sides are sometimes obscured. It also appears smaller, by default.
// For other differences between the two Tooltips compare:
// https://material-ui-1dab0.firebaseapp.com/api/tooltip/
// https://github.com/react-component/tooltip
import _forEach from 'lodash.foreach';
import _filter from 'lodash.filter';
import _clone from 'lodash.clone';
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
} from 'material-ui/Table';
import Icon from 'ui/Icon';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';
import SQL from 'panoptes/SQL';
import resolveJoins from 'panoptes/resolveJoins';
import withAPIData from 'hoc/withAPIData';
import Loading from 'ui/Loading';
import PropertyCell from 'panoptes/PropertyCell';

//FIXME: Allow any component for onClickComponent in onClickBehaviour tooltip.
import ItemTemplate from 'panoptes/ItemTemplate';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

const MAX_COLOR = '#f3a891';

let MuiDataTableView = createReactClass({
  displayName: 'MuiDataTableView',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: PropTypes.string.isRequired,
    query: PropTypes.string,
    order: PropTypes.array,
    startRowIndex: PropTypes.number,
    columns: PropTypes.array,
    onOrderChange: PropTypes.func,
    className: PropTypes.string,
    joins: PropTypes.array,
    classes: PropTypes.object,
    maxRowsPerPage: PropTypes.number,
    nullReplacement: PropTypes.string,
    nanReplacement: PropTypes.string,
    onClickBehaviour: PropTypes.string,
    onClickComponent: PropTypes.string,
    onClickComponentProps: PropTypes.object,
    onClickComponentTemplateDocPath: PropTypes.string,
    config: PropTypes.object, // This will be provided via withAPIData
    data: PropTypes.array, // This will be provided via withAPIData
    onClickComponentTemplate: PropTypes.string, // This will be provided via withAPIData
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      table: null,
      query: undefined,
      order: [],
      startRowIndex: 0,
      columns: [],
      columnWidths: {},
      joins: [],
      onClickBehaviour: 'dataItemPopup',
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded',
    };
  },

  icon() {
    return this.tableConfig().icon;
  },

  title() {
    return this.props.query !== undefined ? `${this.tableConfig().capNamePlural} subset` : this.tableConfig().capNamePlural;
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  handleOrderChange(column) {

    let currentOrder = this.props.order;
    //Choose direction based on if this column already in order
    let newDir = 'asc';
    _forEach(currentOrder, ([dir, orderCol]) => {
      if (orderCol === column) {
        newDir = {asc: 'desc', desc: null}[dir];
        // Break loop.
        return false;
      }
    });
    //Remove this column from the sort order
    currentOrder = _filter(currentOrder, ([dir, orderCol]) => orderCol !== column);
    //Then add it to the end (if needed)
    if (newDir) {
      currentOrder.push([newDir, column]);
    }
    if (this.props.onOrderChange) {
      this.props.onOrderChange(currentOrder);
    }
  },

  handleClick(e, primKey, onClickReactElement) {
    const {table, onClickBehaviour} = this.props;

    if (onClickBehaviour === 'tooltip') {
      // tooltips are handled inline.
      return;
    }

    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    if (!middleClick) {
      e.stopPropagation();
    }
    const switchTo = !middleClick;

    if (onClickBehaviour === 'dataItemPopup') {
      this.getFlux().actions.panoptes.dataItemPopup({table, primKey: primKey.toString(), switchTo});
    } else if (onClickBehaviour === 'tab') {
      this.getFlux().actions.session.tabOpen(onClickReactElement, switchTo);
    } else {
      console.error('Unhandled onClickBehaviour: ', onClickBehaviour);
    }
  },

  render() {
    let {
      className, columns, order, data, loadStatus, maxRowsPerPage, startRowIndex,
      nullReplacement, nanReplacement, table,
      onClickBehaviour, onClickComponent, onClickComponentProps, onClickComponentTemplate
    } = this.props;

    if (!this.tableConfig()) {
      console.error(`Table ${this.props.table} doesn't exist'`);
      return null;
    }

    if (data === undefined || data === null) {
      return (
        <div className={classNames('load-container', className)}>
          <Loading long={true} status={loadStatus} />
        </div>
      );
    }


    //Data can be longer due to being cache friendly
    let stopRowIndex = undefined;
    if (maxRowsPerPage !== undefined && maxRowsPerPage > 0) {
      stopRowIndex = startRowIndex + maxRowsPerPage - 1;
    } else {
      stopRowIndex = undefined;
    }

    if (startRowIndex !== undefined && stopRowIndex !== undefined) {
      let fetchStartRowIndex = startRowIndex !== undefined ? Math.floor(startRowIndex / 100) * 100 : undefined;
      let fetchStopRowIndex = stopRowIndex !== undefined ? (Math.floor(stopRowIndex / 100) + 1) * 100 : undefined;
      data = data.slice(startRowIndex - fetchStartRowIndex, stopRowIndex - fetchStopRowIndex);
    }

    // Convert order array to sortOrderDirectionByColumnId
    let sortOrderDirectionByColumnId = {};
    for (let i = 0; i < order.length; i++) {
      sortOrderDirectionByColumnId[order[i][1]] = order[i][0];
    }

    const primaryKeyColumnId = this.tableConfig().primKey;

    // Get info on column groups.
    let columnGroups = {'__none__': {columns: []}};
    for (let i = 0; i < columns.length; i++) {
      let {groupId} = this.propertiesByColumn(columns[i]);
      if (groupId !== undefined) {
        if (groupId in columnGroups) {
          columnGroups[groupId].columns.push(columns[i]);

        } else {
          columnGroups[groupId] = {columns: []};
          columnGroups[groupId].columns.push(columns[i]);
          columnGroups[groupId].name = this.tableConfig().propertyGroupsById[groupId].name;
        }
      } else {
        columnGroups['__none__'].columns.push(columns[i]);
      }
    }

    // To reorder columns, where they share a group with other columns.
    let groupOrderedColumns = [];
    if (columns.length > 0) {
      return (
        <div style={{position: 'relative'}} className={classNames(className)}>
          <Table>
            <TableHead>
              {Object.keys(columnGroups).length ?
                <TableRow
                  style={{height: 'auto'}}
                >
                  {columns.map((column, columnIndex) => {
                    let columnData = this.propertiesByColumn(column);
                    if (columnData.groupId !== undefined && columnGroups[columnData.groupId].done === undefined) {
                      columnGroups[columnData.groupId].done = 'done'; // What's done is done.
                      groupOrderedColumns = groupOrderedColumns.concat(columnGroups[columnData.groupId].columns);
                      return (
                        <TableCell
                          key={'group_column_' + columnIndex}
                          numeric={columnData.isNumerical}
                          padding={'none'}
                          style={{
                            textAlign: 'center',
                            borderBottom: 'none',
                            borderLeft: 'solid 1px rgba(0, 0, 0, 0.075)',
                            borderRight: 'solid 1px rgba(0, 0, 0, 0.075)',
                            borderTop: 'solid 1px rgba(0, 0, 0, 0.075)',
                            paddingTop: '5px'
                          }}
                          colSpan={columnGroups[columnData.groupId].columns.length}
                        >
                          {columnGroups[columnData.groupId].name}
                        </TableCell>
                      );
                    } else if (columnData.groupId === undefined) {
                      // This column is not part of a group, so will stand alone.
                      groupOrderedColumns.push(column);
                      return (
                        <TableCell
                          key={'group_column_' + columnIndex}
                          numeric={columnData.isNumerical}
                          padding={'none'}
                          style={{borderBottom: 'none'}}
                        />
                      );
                    } else if (columnData.groupId !== undefined && columnGroups[columnData.groupId].done !== undefined) {
                      // This column header has already been written alongside its group siblings.
                      return null;
                    } else {
                      // This shouldn't happen.
                      console.error('Unexpected logic branch in MuiDataTableView column group headings.');
                      return null;
                    }
                  }, this)}
                </TableRow>
                : null
              }
              <TableRow>
                {groupOrderedColumns.map((column, columnIndex) => {
                  let columnData = this.propertiesByColumn(column);
                  return (
                    <TableCell
                      key={'column_' + columnIndex}
                      numeric={columnData.isNumerical}
                      padding={'none'}
                    >
                      <TableSortLabel
                        active={sortOrderDirectionByColumnId[columnData.id] !== undefined ? true : false}
                        direction={sortOrderDirectionByColumnId[columnData.id]}
                        onClick={(event) => {
                          if (event.target.className.indexOf('info') == -1) {
                            this.handleOrderChange(columnData.id);
                          }
                        }}
                      >
                        {columnData.description ?
                          <Tooltip
                            placement="bottom"
                            trigger="click"
                            overlay={<div className="vertical stack">
                              <div className="tooltip-description">
                                <HTMLWithComponents>{columnData.description}</HTMLWithComponents>
                              </div>
                            </div>}
                          >
                            <Icon style={{paddingLeft: '5px'}} className="info" name="info-circle"/>
                          </Tooltip> : null
                        }
                        {columnData.name}
                      </TableSortLabel>
                    </TableCell>
                  );
                }, this)}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, rowIndex) => {
                const primKey = row[primaryKeyColumnId];

                // NOTE: onClickComponentProps should have been converted automatically
                // from a string (element attribute value in template) to a JSON object.
                // NOTE: Need to clone onClickComponentProps,
                // otherwise primKey will remain set to the first primKey, as though it had been specified explicitly.
                const onClickComponentPropsJSON = onClickComponentProps !== undefined ? _clone(onClickComponentProps) : {};

                // Default to using the clicked table and the clicked row primKey,
                // otherwise use the value provided via onClickComponentProps.
                const onClickComponentDefaultProps = {
                  table,
                  primKey,
                };

                const onClickComponentMergedProps = {...onClickComponentDefaultProps, ...onClickComponentPropsJSON};
                const onClickReactElement = onClickComponent !== undefined ? React.createElement(onClickComponent, onClickComponentMergedProps, onClickComponentTemplate) : undefined;

                // FIXME: Allow any component.
                if (onClickBehaviour === 'tooltip' && onClickComponent !== 'ItemTemplate') {
                  console.error('onClickBehaviour tooltip currently only supports onClickComponent ItemTemplate, not: ', onClickComponent);
                }
                const tooltipReactElement = onClickComponent === 'ItemTemplate' ? React.createElement(ItemTemplate, onClickComponentMergedProps, onClickComponentTemplate) : undefined;

                const rowComponent =
                  <TableRow
                    hover
                    key={'row_' + primKey}
                    style={{cursor: 'pointer'}}
                    onClick={(e) => this.handleClick(e, primKey, onClickReactElement)}
                  >
                    {groupOrderedColumns.map((column, columnIndex) => {
                      const columnData = this.propertiesByColumn(column);
                      let {maxVal, minVal, alignment, valueColours, showBar} = columnData;
                      let cellData = row[columnData.id];

                      let background = 'inherit';
                      if (showBar && cellData !== null && maxVal !== undefined && minVal !== undefined) {
                        cellData = parseFloat(cellData);
                        let percent = 100 * (cellData - minVal) / (maxVal - minVal);
                        background = `linear-gradient(to right, ${rowIndex % 2 ? 'rgb(115, 190, 252)' : 'rgb(150, 207, 253)'} ${percent}%, rgba(0,0,0,0) ${percent}%`;
                      } else if (cellData !== null && maxVal !== undefined && minVal !== undefined) {
                        let clippedCellData = Math.min(Math.max(parseFloat(cellData), minVal), maxVal);
                        background = Color(MAX_COLOR).lighten(0.3 * (1 - (clippedCellData - minVal) / (maxVal - minVal))).string();
                      }
                      if (valueColours) {
                        let col = valueColours[cellData] || valueColours['_other_'];
                        if (col) {
                          col = Color(col).lighten(0.3);
                          if (rowIndex % 2)
                            col.darken(0.1);

                          background = col.string();
                        }
                      }

                      return (
                        <TableCell
                          key={'cell_' + rowIndex + '_' + columnIndex}
                          numeric={columnData.isNumerical}
                          padding={'none'}
                          style={{
                            textAlign: alignment
                          }}
                        >
                          <PropertyCell
                            noLinks={true}
                            prop={columnData}
                            value={cellData}
                            style={{
                              background,
                              paddingLeft: '2px',
                              paddingRight: '2px'
                            }}
                            nullReplacement={nullReplacement}
                            nanReplacement={nanReplacement}
                          />
                        </TableCell>
                      );

                    }, this)}
                  </TableRow>
                ;

                if (onClickBehaviour === 'tooltip') {
                  return (
                    <Tooltip
                      key={'row_' + primKey}
                      trigger="click"
                      placement="top"
                      overlay={tooltipReactElement}
                    >
                      {rowComponent}
                    </Tooltip>
                  );
                } else {
                  return rowComponent;
                }

              })}
            </TableBody>
          </Table>
          <Loading long={true} status={loadStatus}/>
        </div>
      );
    } else {
      return (
        <div className={classNames('load-container', className)}>
          <Loading status="custom">No columns selected</Loading>
        </div>
      );
    }
  },
});


MuiDataTableView = withAPIData(MuiDataTableView, ({config, props}) => {

  let {table, columns, order, startRowIndex, query, maxRowsPerPage, joins, onClickComponentTemplateDocPath} = props;

  query = query || (table ? config.tablesById[table].defaultQuery : null) || SQL.nullQuery;

  let stopRowIndex = undefined;
  if (maxRowsPerPage !== undefined && maxRowsPerPage > 0) {
    stopRowIndex = startRowIndex + maxRowsPerPage - 1;
  } else {
    stopRowIndex = undefined;
  }

  //This ensures we are fetching in a cache friendly way
  let fetchStartRowIndex = startRowIndex !== undefined ? Math.floor(startRowIndex / 100) * 100 : undefined;
  let fetchStopRowIndex = stopRowIndex !== undefined ? (Math.floor(stopRowIndex / 100) + 1) * 100 : undefined;

  let requests = {
    data: {
      method: 'query',
      args: resolveJoins({
        database: config.dataset,
        table,
        columns: columns.concat([config.tablesById[table].primKey]),
        query,
        transpose: true,
        start: fetchStartRowIndex,
        stop: fetchStopRowIndex,
        joins,
        orderBy: order
      }, config)
    }
  };

  // Don't make this call unnecessarily.
  if (onClickComponentTemplateDocPath !== undefined) {
    requests.onClickComponentTemplate = {
      method: 'staticContent',
      args: {
        url: `/panoptes/Docs/${config.dataset}/${onClickComponentTemplateDocPath}`
      }
    };
  }

  return {requests};

});

export default MuiDataTableView;
