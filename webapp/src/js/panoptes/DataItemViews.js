import React from 'react';
import OverviewWidget from 'Overview/Widget';
import TableMapWidget from 'Map/Table/Widget';
import PieChartMapWidget from 'Map/Chart/Pie/Widget';
import FieldListWidget from 'FieldList/Widget';
import PropertyGroupWidget from 'PropertyGroup/Widget';
import TemplateWidget from 'Template/Widget';

function getViews(dataItemViews, hasGeoCoord) {
  /*eslint-disable react/display-name */
  const viewTypes = {
    Overview: (dataItemView, key) => (<OverviewWidget title="Overview" key={key}/>),
    PieChartMap: (dataItemView, key) => (<PieChartMapWidget
      initCenter={[dataItemView.mapCenter.latitude, dataItemView.mapCenter.longitude]}
      componentColumns={dataItemView.componentColumns}
      locationDataTable={dataItemView.locationDataTable}
      locationNameProperty={dataItemView.locationNameProperty}
      locationSizeProperty={dataItemView.locationSizeProperty}
      title={dataItemView.name}
      residualFractionName={dataItemView.residualFractionName}
      key={key} />),
    ItemMap: (dataItemView, key) => (<TableMapWidget title={dataItemView.name} key={key} />),
    TableMap: (dataItemView, key) => (<TableMapWidget title={dataItemView.name} key={key} />),
    FieldList: (dataItemView, key) => (<FieldListWidget title={dataItemView.name} fields={dataItemView.fields} key={key} />),
    PropertyGroup: (dataItemView, key) => (<PropertyGroupWidget
      title={dataItemView.name || dataItemView.groupId} //TODO This should be name from group config
      propertyGroupId={dataItemView.groupId}
      key={key} />),
    Template: (dataItemView, key) => (<TemplateWidget
      title={dataItemView.name}
      content={dataItemView.content}
      key={key} />)
  };
  /*eslint-enable react/display-name */

  const views = [];
  if (dataItemViews === undefined || dataItemViews === null) {
    // If there are no dataItemViews specified, then default to showing an Overview.
    views.push(<OverviewWidget title="Overview" />);
    if (hasGeoCoord) {
      // If there are no dataItemViews specified and this table hasGeoCoord, then default to showing a Map
      views.push(<TableMapWidget title="Location" />);
    }
  } else {
    dataItemViews.forEach((dataItemView, i) => {
      // Compose a tabPane for each of the specified dataItemViews
      if (viewTypes[dataItemView.type])
        views.push(viewTypes[dataItemView.type](dataItemView, i));
    });
  }
  return views;
}

module.exports = {
  getViews
};
