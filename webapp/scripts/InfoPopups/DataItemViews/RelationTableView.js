// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map", "DQX/SVG",
        "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence", "DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
        "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils"
    ],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map, SVG, Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData, GetFullDataItemInfo, MiscUtils) {

        var RelationTableView = {};

        RelationTableView.create = function (itemData, relationInfo) {
            var that = {};
            that.itemData = itemData;
            that.relationInfo = relationInfo;
            that.tableInfo = MetaData.getTableInfo(itemData.tableid);
            that.childTableInfo = MetaData.mapTableCatalog[relationInfo.childtableid];

            that.createFrames = function (parent) {
                that.frameRelation = Framework.FrameGroupHor('', 0.7)
                    .setDisplayTitle(that.relationInfo.reversename + ' ' + that.childTableInfo.tableNamePlural);
                parent.addMemberFrame(that.frameRelation);
                that.frameButtons = that.frameRelation.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimX, 150)/*.setFrameClassClient('DQXGrayClient')*/;
                that.frameTable = that.frameRelation.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(true, true);
                return that.frameRelation;
            };


            that.createPanels = function () {
                //Initialise the data fetcher that will download the data for the table
                var theDataFetcher = DataFetchers.Table(
                    MetaData.serverUrl,
                    MetaData.database,
                    that.childTableInfo.getQueryTableName(false)
                );
                theDataFetcher.setReportIfError(true);

                that.panelTable = QueryTable.Panel(
                    that.frameTable,
                    theDataFetcher,
                    { leftfraction: 50 }
                );
                var theTable = that.panelTable.getTable();
                theTable.fetchBuffer = 300;
                theTable.recordCountFetchType = DataFetchers.RecordCountFetchType.DELAYED;
                that.query = SQL.WhereClause.CompareFixed(that.relationInfo.childpropid, '=', that.itemData.fields[that.tableInfo.primkey]);
                theTable.setQuery(that.query);


                $.each(MetaData.customProperties, function (idx, propInfo) {
                    if ((propInfo.tableid == that.childTableInfo.id) && (propInfo.propid != that.relationInfo.childpropid)) {
                        var col = MiscUtils.createItemTableViewerColumn(theTable, that.childTableInfo.id, propInfo.propid);
                    }
                });
//                    $.each(that.childTableInfo.quickFindFields, function(idx, propid) {
//                        if (propid!=that.relationInfo.childpropid) {
//                            var propInfo = MetaData.findProperty(that.childTableInfo.id,propid);
//                            var col = MiscUtils.createItemTableViewerColumn(theTable, that.childTableInfo.id, propid);
//
//                        }
//                    });
//                    that.updateQuery();
                that.panelTable.onResize();

                var buttons = [];


                that.panelButtons = Framework.Form(that.frameButtons);
                that.button_OpenInTable = Controls.Button(null, { content: 'Show in table view', icon: 'fa-table', buttonClass: 'PnButtonGrid', width: 135, height: 35}).setOnChanged(function () {
                    Msg.send({type: 'DataItemTablePopup'}, {
                        tableid: that.childTableInfo.id,
                        query: that.query,
                        title: ''//that.tableInfo.tableCapNamePlural + ' at ' + pieChartInfo.longit + ', ' + pieChartInfo.lattit
                    });
//                        Msg.send({type: 'ShowItemsInSimpleQuery', tableid:that.childTableInfo.id},
//                            { propid:that.relationInfo.childpropid, value:that.itemData.fields[that.tableInfo.primkey] }
//                        );
                    Msg.listen('', { type: 'LoadStoredDataItem'}, require("InfoPopups/ItemPopup").loadStoredItem);

                });
                buttons.push(that.button_OpenInTable);

                if (that.childTableInfo.hasGeoCoord) {
                    var button_OpenInMap = Controls.Button(null, { content: 'Show on map', icon: 'fa-globe', buttonClass: 'PnButtonGrid', width: 135, height: 35}).setOnChanged(function () {
                            Msg.send({type: 'CreateGeoMapPoint' },
                                {
                                    tableid: that.childTableInfo.id,
                                    startQuery: that.query
                                });
                        }
                    );
                    buttons.push(button_OpenInMap);
                }

                that.panelButtons.addControl(Controls.CompoundHor(buttons));

            };

            that.update = function(newItemData) {
                that.itemData = newItemData;
                var table = that.panelTable.getTable();
                that.query = SQL.WhereClause.CompareFixed(that.relationInfo.childpropid, '=', that.itemData.fields[that.tableInfo.primkey]);
                table.setQuery(that.query);
                table.reLoadTable();
            };


            that.onClose = function () {
            };

            return that;
        };

        return RelationTableView;
    });



