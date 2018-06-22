import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import withAPIData from 'hoc/withAPIData';
import _isUndefined from 'lodash.isundefined';
import templateFieldsUsed from 'util/templateFieldsUsed';
import _uniq from 'lodash.uniq';
import _keys from 'lodash.keys';
import _map from 'lodash.map';
import ItemTemplate from 'panoptes/ItemTemplate';
import FluxMixin from 'mixins/FluxMixin';
import DataItem from 'DataItem';
import DataItemViews from 'panoptes/DataItemViews';
import SQL from 'panoptes/SQL';
import resolveJoins from 'panoptes/resolveJoins';
import SelectWithNativeFallback from 'panoptes/SelectWithNativeFallback';

let SelectRow = createReactClass({
  displayName: 'SelectRow',

  mixins: [
    FluxMixin,
  ],

  propTypes: {
    query: PropTypes.string,
    table: PropTypes.string.isRequired,
    queryTable: PropTypes.string,
    selected: PropTypes.string
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
    };
  },

  render() {
    let {data, table, selected, config} = this.props;
    let tableConfig = config.tablesById[table];
    let views = DataItemViews.getViews(tableConfig.dataItemViews, tableConfig.hasGeoCoord);
    let itemTitle = tableConfig.itemTitle || `{{${tableConfig.primKey}}}`;
    if (_isUndefined(data)) {
      return <SelectWithNativeFallback fullWidth={true} helperText="Loading..." disabled={true} />;
    } else if (data.length === 0) {
      return <SelectWithNativeFallback fullWidth={true} helperText={`No ${tableConfig.capNamePlural} to choose from`} disabled={true} />;
    } else {
      return <SelectWithNativeFallback
        allowNone={false}
        fullWidth={true}
        value={selected}
        helperText={`Choose a ${tableConfig.capNameSingle}`}
        onChange={(v) => {
          this.getFlux().actions.session.popupOpen(<DataItem primKey={v} table={table}>{views}</DataItem>);
        }}
        options = {_map(data, (row) => ({
          key: row[tableConfig.primKey],
          value: row[tableConfig.primKey],
          label: <ItemTemplate
              table={table}
              primKey={row[tableConfig.primKey]}
              data={row}
              immediate={true}
            >
              {itemTitle}
            </ItemTemplate>
         }))}/>
    }
  },
});

SelectRow = withAPIData(SelectRow, ({config, props}) => {
  let {table, query, queryTable} = props;
  let tableConfig = config.tablesById[table];
  let itemTitle = tableConfig.itemTitle || `{{${tableConfig.primKey}}}`;
  let columns = templateFieldsUsed(itemTitle, _keys(tableConfig.propertiesById));
  columns.push(tableConfig.primKey);
  columns = _uniq(columns);
  columns = _map(columns, (column) => ({expr:`${table}.${column}`, as: column}));
  return {
    requests: {
      data: {
        method: 'query',
        args: resolveJoins({
          database: config.dataset,
          table: queryTable || table,
          columns,
          query,
          transpose: true,
          distinct: true
        }, config)
      }
    }
  };
});

export default SelectRow;
