import Constants from '../constants/Constants';
import DataItemViews from 'utils/DataItemViews';
const SESSION = Constants.SESSION;

const PanoptesActions = (config) => ({
  dataItemPopup({table, primKey, switchTo = true}) {

    let tableDataItemViews = config.tablesById[table].dataItemViews;

    if (tableDataItemViews === undefined) {
      console.error('PanoptesActions found no dataItemViews for table: %o', table);
      return null;
    }

    let views = DataItemViews.getViews(config.tablesById[table].dataItemViews, config.tablesById[table].hasGeoCoord);

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
