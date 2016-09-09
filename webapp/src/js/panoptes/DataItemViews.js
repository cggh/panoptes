import Immutable from 'immutable';

function getViews(dataItemViews, hasGeoCoord) {

  let views = Immutable.List();

  if (dataItemViews === undefined || dataItemViews === null) {
    // If there are no dataItemViews specified, then default to showing an Overview.
    views = views.push(Immutable.fromJS({
      component: 'Overview/Widget',
      props: {
        title: 'Overview'
      }
    }));
    if (hasGeoCoord) {
      // If there are no dataItemViews specified and this table hasGeoCoord, then default to showing a Map
      views = views.push(Immutable.fromJS({
        component: 'Map/Table/Widget',
        props: {
          title: 'Location'
        }
      }));
    }
  } else {

    dataItemViews.forEach((dataItemView) => {
      // Compose a tabPane for each of the specified dataItemViews
      const viewTypes = {
        Overview: () => ({
          component: 'Overview/Widget',
          props: {
            title: 'Overview'
          }
        }),
        PieChartMap: () => ({
          component: 'Map/Chart/Pie/Widget',
          props: {
            initCenter: [dataItemView.mapCenter.latitude, dataItemView.mapCenter.longitude],
            componentColumns: dataItemView.componentColumns,
            locationDataTable: dataItemView.locationDataTable,
            locationNameProperty: dataItemView.locationNameProperty,
            locationSizeProperty: dataItemView.locationSizeProperty,
            title: dataItemView.name,
            residualFractionName: dataItemView.residualFractionName
          }
        }),
        ItemMap: () => ({
          component: 'Map/Table/Widget',
          props: {
            title: dataItemView.name
          }
        }),
        TableMap: () => ({
          component: 'Map/Table/Widget',
          props: {
            title: dataItemView.name
          }
        }),
        FieldList: () => ({
          component: 'FieldList/Widget',
          props: {
            title: dataItemView.name,
            fields: dataItemView.fields
          }
        }),
        PropertyGroup: () => ({
          component: 'PropertyGroup/Widget',
          props: {
            title: dataItemView.name || dataItemView.groupId, //TODO This should be name from group config
            propertyGroupId: dataItemView.groupId
          }
        }),
        Template: () => ({
          component: 'Template/Widget',
          props: {
            title: dataItemView.name, //TODO This should be name from group config
            content: dataItemView.content
          }
        })
      };
      if (viewTypes[dataItemView.type])
        views = views.push(Immutable.fromJS(viewTypes[dataItemView.type]()));
    });
  }

  return views;
}

module.exports = {
  getViews
};
