import Constants from '../constants/Constants';
import DataItemViews from 'utils/DataItemViews';
const SESSION = Constants.SESSION;

const PanoptesActions = (config) => ({
  dataItemPopup({table, primKey, switchTo = true}) {
console.log('table %o', table);
console.log('primKey %o', primKey);
console.log('config.tablesById[table].dataItemViews %o', config.tablesById[table].dataItemViews);
console.log('config.tablesById[table].hasGeoCoord %o', config.tablesById[table].hasGeoCoord);

    let views = DataItemViews.getViews(config.tablesById[table].dataItemViews, config.tablesById[table].hasGeoCoord);
console.log('PanoptesActions views %o', views);
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
