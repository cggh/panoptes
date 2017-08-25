import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import withAPIData from 'hoc/withAPIData';
import _isUndefined from 'lodash.isundefined';
import templateFieldsUsed from 'util/templateFieldsUsed';
import _uniq from 'lodash.uniq';
import _keys from 'lodash.keys';
import _map from 'lodash.map';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import ItemTemplate from 'panoptes/ItemTemplate';
import FluxMixin from 'mixins/FluxMixin';
import DataItem from 'DataItem';
import DataItemViews from 'panoptes/DataItemViews';
import SQL from 'panoptes/SQL';
import resolveJoins from 'panoptes/resolveJoins';

let SelectRow = createReactClass({
  displayName: 'SelectRow',

  mixins: [
    FluxMixin,
  ],

  propTypes: {
    query: PropTypes.string,
    table: PropTypes.string.isRequired,
    queryTable: PropTypes.string
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
    };
  },

  render() {
    let {data, table, config} = this.props;
    let tableConfig = config.tablesById[table];
    let views = DataItemViews.getViews(tableConfig.dataItemViews, tableConfig.hasGeoCoord);
    let itemTitle = tableConfig.itemTitle || `{{${tableConfig.primKey}}}`;
    if (_isUndefined(data)) {
      return <SelectField hintText="Loading..." disabled={true}>
      </SelectField>;
    } else if (data.length === 0) {
      return <SelectField hintText={`No ${tableConfig.capNamePlural} to choose from`} disabled={true}>
      </SelectField>;
    } else {
      return <SelectField hintText={`Choose a ${tableConfig.capNameSingle}`} onChange={(e, k, v) => {
        this.getFlux().actions.session.popupOpen(<DataItem primKey={v} table={table}>{views}</DataItem>);
      }}>
        {_map(data, (row) =>
          <MenuItem key={row[tableConfig.primKey]} value={row[tableConfig.primKey]} primaryText={
            <ItemTemplate
              table={table}
              primKey={row[tableConfig.primKey]}
              data={row}
              immediate={true}
            >
              {itemTitle}
            </ItemTemplate>

          }/>)}
      </SelectField>;
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
  columns = _map(columns, (column) => `${table}.${column}`);
  return {
    data: {
      method: 'query',
      args: resolveJoins({
        database: config.dataset,
        table: queryTable || table,
        columns: columns,
        query: query,
        transpose: true,
        distinct: true
      }, config)
    }
  };
});

export default SelectRow;

