import Constants from '../constants/Constants';
import DataItemViews from 'panoptes/DataItemViews';
const SESSION = Constants.SESSION;

const PanoptesActions = (config) => ({
  dataItemPopup({table, primKey, switchTo = true}) {

    let tableDataItemViews = config.tablesById[table].dataItemViews;

    // NB: If tableDataItemViews is undefined or null, then default views (Overview and maybe Map) will be returned by getViews().
    let views = DataItemViews.getViews(tableDataItemViews, config.tablesById[table].hasGeoCoord);

    this.dispatch(SESSION.POPUP_OPEN, {
      component: {
        component: 'DataItem/Widget',
        props: {table, primKey, views}
      },
      switchTo: switchTo
    });
  }
});

module.exports = PanoptesActions;
