// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map", "DQX/SVG", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence", "DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils"
       ], function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map, SVG, Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData, GetFullDataItemInfo, MiscUtils) {

    var DefaultView = {};

    DefaultView.create = function (viewSettings, tableInfo, itemData) {
        var that = {};

        that.createFrames = function () {
            that.frameFields = Framework.FrameFinal('', 1).setAllowScrollBars(true, true);
            return that.frameFields;
        };

        that.createPanels = function () {
            var dataItem = {};
            function addLevelToContent(levelInfo, path) {
                var tableInfo = MetaData.mapTableCatalog[levelInfo.tableid];
                //Make a dict of columns by id
                $.each(MetaData.customProperties, function (idx, propInfo) {
                    if (propInfo.tableid == tableInfo.id) {
                        var fieldContent = levelInfo.fields[propInfo.propid];
                        dataItem[path+propInfo.id] = propInfo.toDisplayString(fieldContent);
                    }
                });
                $.each(levelInfo.parents, function (idx, parentInfo) {
                    var parentTableInfo = MetaData.mapTableCatalog[parentInfo.tableid];
                    addLevelToContent(parentInfo, path+parentTableInfo.id+'.');
                });
            }

            addLevelToContent(itemData, '');
            that.frameFields.setContentHtml(content);

        };


        that.onClose = function () {
        }

        return that;
    }

    return DefaultView;
});



