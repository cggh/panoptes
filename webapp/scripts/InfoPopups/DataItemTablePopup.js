define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils", "Utils/ButtonChoiceBox", "Utils/QueryTool"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils, ButtonChoiceBox, QueryTool
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

            that.updateQuery = function() {
                that.myTable.setQuery(that.theQuery.getForFetching());
                that.myTable.reLoadTable();
            }


            that.tableInfo =MetaData.mapTableCatalog[itemInfo.tableid];
            that.theQuery = QueryTool.Create(that.tableInfo.id, {includeCurrentQuery:true, hasSubSampler:true });
            that.theQuery.setStartQuery(itemInfo.query);
            that.theQuery.notifyQueryUpdated = that.updateQuery;

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

                var frameTop = that.frameRoot.addMemberFrame(Framework.FrameGroupHor('', 0.7));

                that.frameControls = frameTop.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setAllowScrollBars(false,true);


                that.frameBody = frameTop.addMemberFrame(Framework.FrameFinal('', 0.7));
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 70).setFrameClassClient('DQXGrayClient');
            };

            that.createPanels = function() {

                var ctrl_Query = that.theQuery.createControl();

                var controlsGroup = Controls.CompoundVert([
                    ctrl_Query
//                    Controls.VerticalSeparator(10),
//                    that.ctrl_PointCount,
//                    Controls.VerticalSeparator(10),
//                    that.ctrlValueProperty,
//                    Controls.VerticalSeparator(20),
//                    binsizeGroup,
//                    Controls.VerticalSeparator(10),
//                    that.ctrl_Gamma
                ]);
                //that.addPlotSettingsControl('controls',controlsGroup);
                that.panelControls = Framework.Form(that.frameControls).setPadding(5);
                that.panelControls.addControl(controlsGroup);


                that.panelTable = MiscUtils.createDataItemTable(that.frameBody, that.tableInfo, that.theQuery.getForFetching(), {hasSelection: true });
                that.myTable = that.panelTable.getTable();

                var button_Selection = Controls.Button(null, {content: 'Selection...', buttonClass: 'DQXToolButton2', width:100, height:40, bitmap:'Bitmaps/selection.png'}).setOnChanged(function() {
                    ButtonChoiceBox.createQuerySelectionOptions(that.tableInfo, that.theQuery.get());
                });

                var button_ShowInTableViewer = Controls.Button(null, {content: 'Show in view', buttonClass: 'DQXToolButton2', width:100, height:40, bitmap:'Bitmaps/datagrid2.png'}).setOnChanged(function() {
                    Msg.send({type: 'ShowItemsInQuery', tableid: that.tableInfo.id}, { query: that.theQuery.get() });
                });

                var button_Showplots = Controls.Button(null, {content: 'Create plot...', buttonClass: 'DQXToolButton2', width:100, height:40, bitmap:'Bitmaps/chart.png'}).setOnChanged(function() {
                    Msg.send({type: 'CreateDataItemPlot'}, { query: that.theQuery.get() , tableid: that.tableInfo.id });
                });

                that.panelButtons = Framework.Form(that.frameButtons);
                that.panelButtons.addControl(Controls.CompoundHor([
                    Controls.HorizontalSeparator(7),
                    button_Selection,
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



