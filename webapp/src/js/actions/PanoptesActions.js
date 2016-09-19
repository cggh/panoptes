import React from 'react';
import Constants from '../constants/Constants';
import DataItemViews from 'panoptes/DataItemViews';
import DataItemWidget from 'components/DataItem/Widget';
import serialiseComponent from 'util/serialiseComponent';
const SESSION = Constants.SESSION;

const PanoptesActions = (config) => ({
  dataItemPopup({table, primKey, switchTo = true}) {

    let tableDataItemViews = config.tablesById[table].dataItemViews;

    // NB: If tableDataItemViews is undefined or null, then default views (Overview and maybe Map) will be returned by getViews().
    let views = DataItemViews.getViews(tableDataItemViews, config.tablesById[table].hasGeoCoord);
    this.dispatch(SESSION.POPUP_OPEN, {
      component: serialiseComponent(
        <DataItemWidget table={table} primKey={primKey}>
          {views}
        </DataItemWidget>
      ),
      switchTo
    });
  }
});

module.exports = PanoptesActions;
