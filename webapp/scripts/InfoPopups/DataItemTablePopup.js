// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map", "DQX/Popup",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils", "Utils/ButtonChoiceBox", "Utils/QueryTool"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map, Popup,
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

            that.tableInfo =MetaData.mapTableCatalog[itemInfo.tableid];

            if ((that.tableInfo.settings.AllowSubSampling) && (!itemInfo.subSamplingOptions)) {
                // No explicit subsampling mentioned - getting all
                itemInfo.subSamplingOptions = QueryTool.getSubSamplingOptions_All();
            }

            that.updateQuery = function() {
                that.myTable.setQuery(that.theQuery.getForFetching());
                that.myTable.setTable(that.tableInfo.getQueryTableName(that.theQuery.isSubSampling()));
                that.myTable.reLoadTable();
            }


            that.theQuery = QueryTool.Create(that.tableInfo.id, {
                includeCurrentQuery:true,
                hasSubSampler:that.tableInfo.settings.AllowSubSampling,
                subSamplingOptions: itemInfo.subSamplingOptions
            });
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
                    .setFixedSize(Framework.dimY, 53).setFrameClassClient('DQXGrayClient');
            };

            that.createPanels = function() {

                var ctrl_Query = that.theQuery.createQueryControl({});

                var controlsGroup = Controls.CompoundVert([
                    ctrl_Query
                ]);
                //that.addPlotSettingsControl('controls',controlsGroup);
                that.panelControls = Framework.Form(that.frameControls).setPadding(0);
                that.panelControls.addControl(controlsGroup);


                that.panelTable = MiscUtils.createDataItemTable(that.frameBody, that.tableInfo, that.theQuery.getForFetching(), {
                    hasSelection: true,
                    subSampling: that.theQuery.isSubSampling()
                });
                that.myTable = that.panelTable.getTable();

                $.each(that.myTable.myColumns, function(idx, col) {
                    if (col.propid) {
                        col.setHeaderClickHandler(function(id) {
                            var buttons = [];
                            if (col.sortOption) {
                                buttons.push( Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Sort<br>ascending", bitmap:DQX.BMP('arrow4down.png'), width:120, height:40 })
                                    .setOnChanged(function() {
                                        that.panelTable.getTable().sortByColumn(col.propid,false);
                                    }) );
                                buttons.push( Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Sort<br>descending", bitmap:DQX.BMP('arrow4up.png'), width:120, height:40 })
                                    .setOnChanged(function() {
                                        that.panelTable.getTable().sortByColumn(col.propid,true);
                                    }) );
                            }
                            Msg.send({type: 'PropInfoPopup'}, {
                                tableid: that.tableInfo.id,
                                propid: col.propid,
                                query: that.theQuery.get(),
                                buttons: buttons
                            });
                        })
                    }
                });



                var button_Selection = Controls.Button(null, {content: 'Selection...', buttonClass: 'PnButtonGrid', width:100, height:40, bitmap:'Bitmaps/selection.png'}).setOnChanged(function() {
                    ButtonChoiceBox.createQuerySelectionOptions(that.tableInfo, that.theQuery);
                });

                var button_ShowInTableViewer = Controls.Button(null, {content: 'Show in view', buttonClass: 'PnButtonGrid', width:100, height:40, bitmap:'Bitmaps/datagridadd.png'}).setOnChanged(function() {
                    var choices = [];


                    var setNewQuery = function(qry) {
                        Msg.send({type: 'ShowItemsInQuery', tableid: that.tableInfo.id}, {
                            query: qry,
                            subSamplingOptions: that.theQuery.getSubSamplingOptions()
                        });
                    };

                    var currentQuery = that.tableInfo.currentQuery;
                    if ((!currentQuery) || (currentQuery.isTrivial) ) {
                        setNewQuery(that.theQuery.get());
                    }
                    else {
                        choices.push( { content:'REPLACE<br>current query', bitmap:'Bitmaps/venn2.png', handler:function() {
                            setNewQuery(that.theQuery.get());
                        }
                        });

                        choices.push( { content:'ADD<br>to current query', bitmap:'Bitmaps/venn3.png', handler:function() {
                            setNewQuery(SQL.WhereClause.OR([currentQuery, that.theQuery.get()]));
                        }
                        });

                        choices.push( { content:'RESTRICT<br>current query', bitmap:'Bitmaps/venn1.png', handler:function() {
                            setNewQuery(SQL.WhereClause.AND([currentQuery, that.theQuery.get()]));
                        }
                        });

                        var content = '<div style="max-width:500px">';
                        content += '<b>Current {name} query:</b><br>'.DQXformat({name: that.tableInfo.tableNamePlural}) + that.tableInfo.createQueryDisplayString(currentQuery);
                        content += '<p>'
                        content += '<b>New query:</b><br>' + that.tableInfo.createQueryDisplayString(that.theQuery.get());
                        content += '<p>'
                        content += '</div>';
                        $.each(choices, function(idx, button) {
                            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: button.content, bitmap:button.bitmap, width:140, height:50 }).setOnChanged(function() {
                                button.handler();
                                Popup.closeIfNeeded(popupid);
                            });
                            content += bt.renderHtml();
                        })
                        var popupid = Popup.create('Show in view', content);
                    }


                });

                var button_Showplots = Controls.Button(null, {content: 'Create plot...', buttonClass: 'PnButtonGrid', width:100, height:40, bitmap:'Bitmaps/chart.png'}).setOnChanged(function() {
                    Msg.send({type: 'CreateDataItemPlot'}, {
                        query: that.theQuery.get(),
                        tableid: that.tableInfo.id,
                        subSamplingOptions: that.theQuery.getSubSamplingOptions()
                    });
                });

                that.panelButtons = Framework.Form(that.frameButtons);
                that.panelButtons.addControl(Controls.CompoundHor([
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



