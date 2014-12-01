// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map", "DQX/SVG",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map, SVG,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils
        ) {

        var ItemMap = {};

        ItemMap.create = function(viewSettings, initialItemData) {
            var that = {};
            var tableInfo = MetaData.getTableInfo(initialItemData.tableid);
            that.initialised = false;

            if (!tableInfo.hasGeoCoord)
                DQX.reportError('Table does not have geographic coordinates: '+tableInfo.id);

            that.createFrames = function(parent) {
                that.frameMap = Framework.FrameFinal('', 1).setAllowScrollBars(false,false).setInitialiseFunction(that.initialise)
                    .setDisplayTitle(viewSettings.Name);
                parent.addMemberFrame(that.frameMap);
                return that.frameMap;
            };

            that.initialise = function() {

                that.theMap = Map.GMap(that.frameMap/*, null, null, false*/);
                that.pointSet = Map.PointSet('points', that.theMap, 0, "", { showLabels: false, showMarkers: true });
                that.setPoints(initialItemData);
                that.initialised = true;

            };


            that.createPanels = function() {
            };

            that.update = function(newItemData) {
                if (that.initialised)
                    that.setPoints(newItemData);
            };

            that.setPoints = function(itemData) {
                var longitude = itemData.fields[tableInfo.propIdGeoCoordLongit];
                var lattitude = itemData.fields[tableInfo.propIdGeoCoordLattit];
                that.pointSet.setPoints([{
                    id: '',
                    longit: longitude,
                    lattit: lattitude
                }]);
                setTimeout(function() {
                    var initialMapCenter = Map.Coord(longitude, lattitude);
                    var initialZoom = 4;
                    if (viewSettings.MapZoom)
                        initialZoom = viewSettings.MapZoom;
                    that.theMap.setCenter(initialMapCenter, initialZoom);
                }, 50);

            };

            that.onClose = function() {
                if (that.theMap)
                    that.theMap.tearDown();
            };

            return that;
        };

        return ItemMap;
    });



