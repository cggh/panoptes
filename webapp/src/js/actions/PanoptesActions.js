import React from 'react';
import Constants from '../constants/Constants';
import DataItemViews from 'panoptes/DataItemViews';
import DataItem from 'components/DataItem';
import serialiseComponent from 'util/serialiseComponent';
const SESSION = Constants.SESSION;

const PanoptesActions = (config) => ({
  dataItemPopup({table, primKey, switchTo = true}) {

    let tableDataItemViews = config.tablesById[table].dataItemViews;

    // NB: If tableDataItemViews is undefined or null, then default views (Overview and maybe Map) will be returned by getViews().
    let views = DataItemViews.getViews(tableDataItemViews, config.tablesById[table].hasGeoCoord);
    this.dispatch(SESSION.TAB_OPEN, {
      component: serialiseComponent(
        <DataItem table={table} primKey={primKey}>
          {views}
        </DataItem>
      ),
      switchTo
    });
  }
});

export default PanoptesActions;
