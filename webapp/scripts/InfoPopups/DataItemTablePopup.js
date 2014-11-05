// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
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
            var theTitle = MetaData.mapTableCatalog[itemInfo.tableid].tableCapNamePlural + ' table';
            if (itemInfo.title)
                theTitle = itemInfo.title;
            var that = PopupFrame.PopupFrame('DataItemTablePopup'+itemInfo.tableid,
                {
                    title: theTitle,
                    blocking:false,
                    sizeX:700, sizeY:500
                }
            );
            if (MetaData.isManager)
                that.addTool('fa-link', function() { that.handleCreateLink(); });

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
            if (itemInfo.serialisedquery)
                that.theQuery.recall(itemInfo.serialisedquery);
            if (itemInfo.query)
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

                that.frameRoot.makeGroupHor();

                that.frameControls = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setAllowScrollBars(false,true).setFixedSize(Framework.dimX,210);

                that.frameBody = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7));
            };

            that.createPanels = function() {

                that.introText = Controls.Html(null,'', '_dummyclass_');

                var ctrl_Query = that.theQuery.createQueryControl({noDefine: true, controlsWidth: 165});

                var controlsGroup = Controls.CompoundVert([
                    that.introText,
                    Controls.AlignCenter(Controls.CompoundVert([
                        Controls.VerticalSeparator(10),
                        ctrl_Query
                    ]))
                ]);
                //that.addPlotSettingsControl('controls',controlsGroup);
                that.panelControls = Framework.Form(that.frameControls).setPadding(0);
                that.panelControls.addControl(Controls.Wrapper(controlsGroup, 'ControlsSectionBody'));


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
                                buttons.push( Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Sort<br>ascending", bitmap:DQX.BMP('arrow7down.png'), width:120, height:40 })
                                    .setOnChanged(function() {
                                        that.panelTable.getTable().sortByColumn(col.propid,false);
                                    }) );
                                buttons.push( Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Sort<br>descending", bitmap:DQX.BMP('arrow7up.png'), width:120, height:40 })
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



                var button_Selection = Controls.Button(null, {
                    content: 'Selection...',
                    buttonClass: 'PnButtonGrid',
                    width:130, height:30,
                    icon: 'fa-check-circle'
                }).setOnChanged(function() {
                    ButtonChoiceBox.createQuerySelectionOptions(that.tableInfo, that.theQuery);
                });

                var button_ShowInTableViewer = Controls.Button(null, {content: 'Show in view', buttonClass: 'PnButtonGrid', width:130, height:30, bitmap:'Bitmaps/datagridadd.png', bitmapHeight:19}).setOnChanged(function() {
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
                        choices.push( { content:'REPLACE<br>current query', bitmap:'Bitmaps/venn2.png', bitmapHeight:15, handler:function() {
                            setNewQuery(that.theQuery.get());
                        }
                        });

                        choices.push( { content:'ADD<br>to current query', bitmap:'Bitmaps/venn3.png', bitmapHeight:15, handler:function() {
                            setNewQuery(SQL.WhereClause.OR([currentQuery, that.theQuery.get()]));
                        }
                        });

                        choices.push( { content:'RESTRICT<br>current query', bitmap:'Bitmaps/venn1.png', bitmapHeight:15, handler:function() {
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
                            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: button.content, bitmap:button.bitmap, bitmapHeight:button.bitmapHeight, width:140, height:50 }).setOnChanged(function() {
                                button.handler();
                                Popup.closeIfNeeded(popupid);
                            });
                            content += bt.renderHtml();
                        })
                        var popupid = Popup.create('Show in view', content);
                    }


                });

                var button_Showplots = Controls.Button(null, {content: 'Create plot...', buttonClass: 'PnButtonGrid', width:130, height:30, icon:'fa-bar-chart-o'}).setOnChanged(function() {
                    Msg.send({type: 'CreateDataItemPlot'}, {
                        query: that.theQuery.get(),
                        tableid: that.tableInfo.id,
                        subSamplingOptions: that.theQuery.getSubSamplingOptions()
                    });
                });

                controlsGroup.addControl(Controls.VerticalSeparator(15));

                controlsGroup.addControl(Controls.AlignCenter(Controls.CompoundVert([
                    button_Selection,
                    button_ShowInTableViewer,
                    button_Showplots
                ]).setMargin(0)));

                that.theQuery.notifyQueryUpdated = that.onQueryModified;
                that.setIntroText();
            };

            that.onClose = function() {
                $.each(that.eventids,function(idx,eventid) {
                    Msg.delListener(eventid);
                });
            };


            that.setIntroText = function() {
                var content = '';
                content += that.tableInfo.createIcon({floatLeft: true});
                content += '<b>{Names}</b><br>'.DQXformat({Names: that.tableInfo.tableCapNamePlural});
                content += that.theQuery.createQueryDisplayStringHtml();
//                content += '</i>';
//                    content += '</div>';
                that.introText.modifyValue(content);
            };


            that.onQueryModified = function() {
                that.setIntroText();
                that.myTable.setQuery(that.theQuery.getForFetching());
                that.myTable.setTable(that.tableInfo.getQueryTableName(that.theQuery.isSubSampling()));
                that.myTable.reLoadTable();
            }


            that.store = function() {
                var obj = {};
                obj.tableid = that.tableInfo.id;
                obj.query = that.theQuery.store();
//                obj.settings = {};
//                $.each(that.plotSettingsControls, function(id, ctrl) {
//                    obj.settings[id] = Controls.storeSettings(ctrl);
//                });
//                if (that.storeCustomSettings)
//                    obj.settingsCustom = that.storeCustomSettings();
//                obj.controlsCollapsed = that.frameRoot.isControlsCollapsed();
                return obj;
            }

            that.recall = function(settObj) {
                if (settObj.query)
                    that.theQuery.recall(settObj.query);
                if (settObj.settings) {
//                    that.staging = true;
//                    $.each(that.plotSettingsControls, function(id, ctrl) {
//                        if (settObj.settings[id])
//                            Controls.recallSettings(ctrl, settObj.settings[id], false );
//                    });
//                    that.staging = false;
                }
//                if (settObj.settingsCustom && that.recallCustomSettings)
//                    that.recallCustomSettings(settObj.settingsCustom);
//                that.reloadAll();
            }





            that.handleCreateLink = function() {
                var content = base64.encode(JSON.stringify(that.store()));
                DQX.serverDataStore(MetaData.serverUrl, content, function (id) {
                    DQX.customRequest(MetaData.serverUrl, PnServerModule, 'view_store',
                        { database: MetaData.database, workspaceid: MetaData.workspaceid, id: id },
                        function (resp) {
                            require("Utils/IntroViews").createIntroView('itemtable', id, '-', 'Add table to start page');
                        });
                });
            }


            that.create();

        }

        DataItemTablePopup.loadStoredTable = function(tpe, storeid) {
            DQX.serverDataFetch(MetaData.serverUrl, storeid, function(content) {
                var obj = JSON.parse(base64.decode(content));
                DataItemTablePopup.show({
                    tableid: obj.tableid,
                    serialisedquery: obj.query
                });
//                GenericPlot.recall([obj]);
            });
        };

        Msg.listen('', { type: 'LoadStoredItemTable'}, DataItemTablePopup.loadStoredTable);


        return DataItemTablePopup;
    });



