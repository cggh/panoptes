// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map", "DQX/SVG",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence", "DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils"
  ],
  function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map, SVG,
            Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
            MetaData, GetFullDataItemInfo, MiscUtils) {

    var ItemMap = {};

    ItemMap.create = function (viewSettings, initialItemData, parent) {
      var that = {};
      var tableInfo = MetaData.getTableInfo(initialItemData.tableid);
      that.initialised = false;
      that.currentData = false;
      that.parent = parent;

      if (!tableInfo.hasGeoCoord)
        DQX.reportError('Table does not have geographic coordinates: ' + tableInfo.id);

      that.createFrames = function (parent) {
        that.frameMap = Framework.FrameFinal('', 1).setAllowScrollBars(false, false).setInitialiseFunction(that.initialise)
          .setDisplayTitle(viewSettings.Name);
        parent.addMemberFrame(that.frameMap);
        return that.frameMap;
      };

      that.initialise = function () {
        that.theMap = Map.GMap(that.frameMap/*, null, null, false*/);
        that.selectedPointSet = Map.PointSet('selectedPoints', that.theMap, 0, "", {
          showLabels: false,
          showMarkers: true
        });
        that.unselectedPointSet = Map.PointSet('unselectedPoints', that.theMap, 0, "Bitmaps/circle_red_small.png", {
          showLabels: false,
          showMarkers: true
        });
        Msg.listen('', { type: 'ClickMapPoint', id: that.unselectedPointSet.myID }, function (scope, id) {
          that.parent.render(id);
        });

        var table = initialItemData.tableid;
        var tableInfo = MetaData.getTableInfo(table);
        that.fetcher = DataFetchers.Table(
          MetaData.serverUrl,
          MetaData.database,
          table + 'CMB_' + MetaData.workspaceid
        );
        that.fetcher.myDataConsumer = that;
        that.fetcher.setReportIfError(true);
        that.fetcher.setMaxRecordCount(tableInfo.settings.MaxCountQueryAggregated || 1000000);
        that.fetcher.positionField = tableInfo.primkey;
        that.latProp = tableInfo.propIdGeoCoordLattit;
        that.longProp = tableInfo.propIdGeoCoordLongit;
        that.primKey = tableInfo.primkey;
        that.fetcher.addFetchColumnActive(that.latProp, 'String');
        that.fetcher.addFetchColumnActive(that.longProp, 'String');
        that.fetcher.addFetchColumnActive(that.primKey, MiscUtils.createEncoderId(table, that.primKey));

        var query = SQL.WhereClause.Trivial();
        that.fetcher.setUserQuery1(query);
        //We jst set the query so we know it is not ready
        that.fetcher.IsDataReady(-1, 1000000);

        that.initialised = true;
        that.update(initialItemData);
      };

      that.notifyDataReady = function () {
        var locations = [];
        for (var i = 0; i < that.fetcher.totalRecordCount; i++) {
          var item = {
            lattit: that.fetcher.getColumnPoint(i, that.latProp),
            longit: that.fetcher.getColumnPoint(i, that.longProp),
            id: that.fetcher.getColumnPoint(i, that.primKey)
          };
          locations.push(item)
        }
        that.allPoints = locations;
        if (that.currentData)
          that.update(that.currentData);
      };

      that.createPanels = function () {
      };

      that.update = function (newItemData) {
        that.currentData = newItemData;

        if (that.initialised)
          that.setPoints(newItemData);
      };

      that.setPoints = function (itemData) {
        var longitude = itemData.fields[tableInfo.propIdGeoCoordLongit];
        var lattitude = itemData.fields[tableInfo.propIdGeoCoordLattit];
        var primKey = itemData.fields[tableInfo.primkey];
        that.selectedPointSet.setPoints([{
          id: primKey,
          longit: longitude,
          lattit: lattitude,
          labelName: primKey
        }]);
        if (that.allPoints) {
          var unselected = [];
          for (var i = 0; i < that.allPoints.length; i++) {
            var p = that.allPoints[i];
            if (p.longit !== longitude && p.lattit !== lattitude)
              unselected.push(p);
          }
          that.unselectedPointSet.setPoints(unselected);
        }
        setTimeout(function () {
          var initialMapCenter = Map.Coord(longitude, lattitude);
          var initialZoom = 4;
          if (viewSettings.MapZoom)
            initialZoom = viewSettings.MapZoom;
          that.theMap.setCenter(initialMapCenter, initialZoom);
        }, 50);
      };

      that.onClose = function () {
        if (that.theMap)
          that.theMap.tearDown();
      };

      return that;
    };

    return ItemMap;
  })
;



