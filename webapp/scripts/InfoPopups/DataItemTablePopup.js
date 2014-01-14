define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils
        ) {

        var DataItemTablePopup = {};

        DataItemTablePopup.init = function() {
            Msg.listen('',{type:'DataItemTablePopup'}, function(scope, info) {
                DataItemTablePopup.show(info);
            });
        }

        DataItemTablePopup.show = function(itemInfo) {
            var that = PopupFrame.PopupFrame('DataItemTablePopup'+itemInfo.tableid,
                {
                    title: itemInfo.title,
                    blocking:false,
                    sizeX:700, sizeY:500
                }
            );

            that.tableInfo =MetaData.mapTableCatalog[itemInfo.tableid];
            that.query = itemInfo.query;

            that.eventids = [];//Add event listener id's to this list to have them removed when the popup closes
            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid, { type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid) {
                    if (that.myTable)
                        that.myTable.render();
                }
            } );


            that.createFrames = function() {
                that.frameRoot.makeGroupVert();

                that.frameBody = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7));
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 70).setFrameClassClient('DQXGrayClient');
            };

            that.createPanels = function() {
                that.panelTable = MiscUtils.createDataItemTable(that.frameBody, that.tableInfo, that.query, {hasSelection: true });
                that.myTable = that.panelTable.getTable();

                var button_ShowInTableViewer = Controls.Button(null, {content: 'Show in table viewer'}).setOnChanged(function() {
                    Msg.send({type: 'ShowItemsInQuery', tableid: that.tableInfo.id}, { query: that.query });
                });

                var button_Showplots = Controls.Button(null, {content: 'Create a plot...'}).setOnChanged(function() {
                    Msg.send({type: 'CreateDataItemPlot'}, { query: that.query , tableid: that.tableInfo.id });
                });

                that.panelButtons = Framework.Form(that.frameButtons);
                that.panelButtons.addControl(Controls.CompoundHor([
                    Controls.HorizontalSeparator(7),
                    button_ShowInTableViewer,
                    button_Showplots
                ]));

            };

            that.onClose = function() {
                $.each(that.eventids,function(idx,eventid) {
                    Msg.delListener(eventid);
                });
            };


            that.create();
        }



        return DataItemTablePopup;
    });



