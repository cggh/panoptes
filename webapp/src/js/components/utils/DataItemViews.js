import Immutable from 'immutable';

function getViews(dataItemViews, hasGeoCoord) {

  let views = Immutable.List();

  if (!dataItemViews) {
    // If there are no dataItemViews specified, then default to showing an Overview.
    views.push({
      component: 'Overview',
      props: {
        title: 'Overview'
      }
    });
    if (hasGeoCoord) {
      // If there are no dataItemViews specified and this table hasGeoCoord, then default to showing a Map
      views.push({
        component: 'Map',
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
          component: 'Overview',
          props: {
            title: 'Overview'
          }
        }),
        PieChartMap: () => {
          console.log('dataItemView: %o', dataItemView);

          return {
          component: 'Map/Chart/Pie',
          props: {
            center: [dataItemView.mapCenter.latitude, dataItemView.mapCenter.longitude],
            componentColumns: dataItemView.componentColumns,
            locationDataTable: dataItemView.locationDataTable,
            locationNameProperty: dataItemView.locationNameProperty,
            locationSizeProperty: dataItemView.locationSizeProperty,
            title: dataItemView.name,
            residualFractionName: dataItemView.residualFractionName
          }
        };},
        ItemMap: () => ({
          view: 'Map/Table',
          props: {
            title: dataItemView.name
          }
        }),
        TableMap: () => ({
          view: 'Map/Table',
          props: {
            title: dataItemView.name
          }
        }),
        FieldList: () => ({
          component: 'FieldList',
          props: {
            title: dataItemView.name,
            fields: dataItemView.fields
          }
        }),
        PropertyGroup: () => ({
          component: 'PropertyGroup',
          props: {
            title: dataItemView.name || dataItemView.groupId, //TODO This should be name from group config
            propertyGroupId: dataItemView.groupId
          }
        }),
        Template: () => ({
          component: 'Template',
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
