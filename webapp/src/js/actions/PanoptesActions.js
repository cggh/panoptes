import Constants from '../constants/Constants';
const SESSION = Constants.SESSION;

const PanoptesActions = (config) => ({
  dataItemPopup({table, primKey, switchTo = true}) {
    let dataItemViews = config.tablesById[table].dataItemViews;
    let views = [];
    if (!dataItemViews) {
      // If there are no dataItemViews specified, then default to showing an Overview.
      views.push({
        view: 'Overview',
        props: {
          title: 'Overview'
        }
      });
      if (config.tablesById[table].hasGeoCoord) {
        // If there are no dataItemViews specified and this table hasGeoCoord, then default to showing a Map
        views.push({
          view: 'Map',
          props: {
            title: 'Location'
          }
        });
      }
    } else {
      dataItemViews.forEach((dataItemView) => {
        // Compose a tabPane for each of the specified dataItemViews
        const viewTypes = {
          Overview: () => ({
            view: 'Overview',
            props: {
              title: 'Overview'
            }
          }),
          PieChartMap: () => ({
            view: 'PieChartMap',
            props: {
              title: dataItemView.name,
              chartConfig: dataItemView
            }
          }),
          Map: () => ({
            view: 'Map',
            props: {
              title: dataItemView.name
            }
          }),
          FieldList: () => ({
            view: 'FieldList',
            props: {
              title: dataItemView.name,
              fields: dataItemView.fields
            }
          }),
          PropertyGroup: () => ({
            view: 'PropertyGroup',
            props: {
              title: dataItemView.name || dataItemView.groupId, //TODO This should be name from group config
              propertyGroupId: dataItemView.groupId
            }
          }),
          Template: () => ({
            view: 'Template',
            props: {
              title: dataItemView.name, //TODO This should be name from group config
              content: dataItemView.content
            }
          })
        };
        if (viewTypes[dataItemView.type])
          views.push(viewTypes[dataItemView.type]());
      });
    }

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
