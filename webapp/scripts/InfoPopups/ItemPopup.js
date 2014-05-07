define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils", "InfoPopups/ItemGenomeTracksPopup",
    "InfoPopups/DataItemViews/DefaultView", "InfoPopups/DataItemViews/ItemMap", "InfoPopups/DataItemViews/PieChartMap", "InfoPopups/DataItemViews/FieldList"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils, ItemGenomeTracksPopup,
              ItemView_DefaultView, ItemView_ItemMap, ItemView_PieChartMap, ItemView_FieldList
        ) {

        var ItemPopup = {};
        ItemPopup.activeList = [];

        ItemPopup.init = function() {
            Msg.listen('',{type:'ItemPopup'}, function(scope, info) {
                ItemPopup.show(info);
            });
        }

        ItemPopup.show = function(itemInfo) {
            DQX.setProcessing("Downloading...");
            GetFullDataItemInfo.Get(itemInfo.tableid, itemInfo.itemid, function(resp) {
                DQX.stopProcessing();
                ItemPopup.show_sub1(itemInfo, resp);
            })
        }


        ItemPopup.show_sub1 = function(itemInfo, data) {


            var that = PopupFrame.PopupFrame('ItemPopup'+itemInfo.tableid,
                {
                    title:MetaData.getTableInfo(itemInfo.tableid).tableCapNameSingle + ' "'+itemInfo.itemid+'"',
                    blocking:false,
                    sizeX:700, sizeY:500
                }
            );
            that.itemid = itemInfo.itemid;
            that.tableInfo = MetaData.getTableInfo(itemInfo.tableid);

            if (itemInfo.frameSettings) {
                // Popupframe settings were stored; recall & set as new history, so that settings will be picked up during creation
                PopupFrame.setFrameSettingsHistory(that.typeID, itemInfo.frameSettings);
            }

            that.eventids = [];//Add event listener id's to this list to have them removed when the popup closes
            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid, { type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid) {
                    that._selchk.modifyValue(that.tableInfo.isItemSelected(that.itemid), true);
                }
            } );


            that.createFrames = function() {
                that.frameRoot.makeGroupVert();

                var frameTabGroup = that.frameRoot.addMemberFrame(Framework.FrameGroupTab('', 0.7));

                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 83).setFrameClassClient('DQXGrayClient').setAllowScrollBars(false, false).setMargins(0);




                that.itemViewObjects = [];
                if (that.tableInfo.settings.DataItemViews)
                    var dataItemViews = that.tableInfo.settings.DataItemViews;
                else { //Fill with defaults
                    var dataItemViews = [];
                    dataItemViews.push({ Type: 'Overview', Name: 'Overview' });
                    if (that.tableInfo.hasGeoCoord)
                        dataItemViews.push({ Type: 'ItemMap', Name: 'Location' });
                }
                $.each(dataItemViews, function(idx, dtViewInfo) {
                    var dtViewObject = null;
                    if (dtViewInfo.Type == 'Overview') {
                        dtViewObject = ItemView_DefaultView.create(dtViewInfo, that.tableInfo, data);
                    }
                    if (dtViewInfo.Type == 'PieChartMap') {
                        dtViewObject = ItemView_PieChartMap.create(dtViewInfo, that.tableInfo, data);
                    }
                    if (dtViewInfo.Type == 'ItemMap') {
                        dtViewObject = ItemView_ItemMap.create(dtViewInfo, that.tableInfo, data);
                    }
                    if (dtViewInfo.Type == 'FieldList') {
                        dtViewObject = ItemView_FieldList.create(dtViewInfo, that.tableInfo, data);
                    }
                    if (!dtViewObject)
                        DQX.reportError("Invalid dataitem view type "+dtViewInfo.Type);
                    that.itemViewObjects.push(dtViewObject);
                    frameTabGroup.addMemberFrame(dtViewObject.createFrames())
                        .setDisplayTitle(dtViewInfo.Name);
                });

                that.childRelationTabs = [];
                $.each(that.tableInfo.relationsParentOf, function(idx,relationInfo) {
                    var relTab = {};
                    relTab.relationInfo = relationInfo;
                    relTab.childTableInfo = MetaData.mapTableCatalog[relationInfo.childtableid];
                    var frameRelation = frameTabGroup.addMemberFrame(Framework.FrameGroupHor('', 0.7))
                        .setDisplayTitle(relationInfo.reversename + ' ' + relTab.childTableInfo.tableNamePlural);
                    relTab.frameButtons = frameRelation.addMemberFrame(Framework.FrameFinal('', 0.3))
                        .setFixedSize(Framework.dimX, 150)/*.setFrameClassClient('DQXGrayClient')*/;
                    relTab.frameTable = frameRelation.addMemberFrame(Framework.FrameFinal('', 0.7))
                        .setAllowScrollBars(true,true);
                    that.childRelationTabs.push(relTab);
                });

            };

            that.createPanels = function() {
                that.panelButtons = Framework.Form(that.frameButtons);

                that.buttonWidth = 160;
                that.buttonHeight = 30;


                var buttons = [];

                if (that.tableInfo.hasGenomePositions) {
                    var genome_chromosome = data.fields[that.tableInfo.ChromosomeField];
                    var genome_position = parseInt(data.fields[that.tableInfo.PositionField]);
                    var bt = Controls.Button(null, { content: 'Show on genome', buttonClass: 'PnButtonGrid', width:that.buttonWidth, height:that.buttonHeight, bitmap:'Bitmaps/GenomeBrowserSmall.png'}).setOnChanged(function() {
                        //that.close();//!!!todo: only when blocking
                        Msg.send({ type: 'JumpgenomePosition' }, {
                            chromoID: genome_chromosome,
                            position: genome_position
                        });
                    })
                    buttons.push(bt);

                    // Create buttons to show genomic regions spanning this position
                    $.each(MetaData.tableCatalog, function(idx, oTableInfo) {
                        if (oTableInfo.hasGenomeRegions) {
                            var bt = Controls.Button(null, { content: 'Show '+oTableInfo.tableNamePlural, buttonClass: 'PnButtonGrid', width:that.buttonWidth, height:that.buttonHeight, bitmap:'Bitmaps/datagrid2Small.png'}).setOnChanged(function() {
                                var qry = SQL.WhereClause.AND([
                                    SQL.WhereClause.CompareFixed(oTableInfo.settings.Chromosome, '=', genome_chromosome),
                                    SQL.WhereClause.CompareFixed(oTableInfo.settings.RegionStart, '<=', genome_position),
                                    SQL.WhereClause.CompareFixed(oTableInfo.settings.RegionStop, '>=', genome_position)
                                ]);
                                Msg.send({type: 'DataItemTablePopup'}, {
                                    tableid: oTableInfo.id,
                                    query: qry,
                                    title: oTableInfo.tableCapNamePlural + ' at ' + genome_chromosome + ':' + genome_position
                                });
                            })
                            buttons.push(bt);
                        }
                    });
                }

                if (that.tableInfo.hasGenomeRegions) {
                    var bt = Controls.Button(null, { content: 'Show on genome', buttonClass: 'PnButtonGrid', width:that.buttonWidth, height:that.buttonHeight, bitmap:'Bitmaps/GenomeBrowserSmall.png'}).setOnChanged(function() {
                        //that.close();//!!!todo: only when blocking
                        Msg.send({ type: 'JumpgenomeRegion' }, {
                            chromoID: data.fields[that.tableInfo.settings.Chromosome],
                            start: parseInt(data.fields[that.tableInfo.settings.RegionStart]),
                            end: parseInt(data.fields[that.tableInfo.settings.RegionStop])
                        });
                    })
                    buttons.push(bt);

                    $.each(MetaData.tableCatalog,  function(idx, tableInfo) {
                        if (tableInfo.hasGenomePositions) {
                            var bt = Controls.Button(null, { content: 'Show '+tableInfo.tableNamePlural+' in range', buttonClass: 'PnButtonGrid', width:that.buttonWidth, height:that.buttonHeight, bitmap:'Bitmaps/datagrid2Small.png'}).setOnChanged(function() {
                                Msg.send({type: 'ShowItemsInGenomeRange', tableid:tableInfo.id}, {
                                    preservecurrentquery:false,
                                    chrom: data.fields[that.tableInfo.settings.Chromosome],
                                    start: parseInt(data.fields[that.tableInfo.settings.RegionStart]),
                                    stop: parseInt(data.fields[that.tableInfo.settings.RegionStop])
                                });
                            })
                            buttons.push(bt);
                        }
                    });
                }

                if (that.tableInfo.tableBasedSummaryValues.length>0) {
                    var bt = Controls.Button(null, { content: 'Show genome tracks...', buttonClass: 'PnButtonGrid', width:that.buttonWidth, height:that.buttonHeight, bitmap:'Bitmaps/GenomeBrowserSmall.png'}).setOnChanged(function() {
                        ItemGenomeTracksPopup.show(that.tableInfo, that.itemid);
                    })
                    buttons.push(bt)
                }

                if (that.tableInfo.settings.ExternalLinks) {
                    $.each(that.tableInfo.settings.ExternalLinks, function(idx, linkInfo) {
                        var bt = Controls.Button(null, { content: linkInfo.Name, buttonClass: 'PnButtonGrid', width:that.buttonWidth, height:that.buttonHeight, bitmap:"Bitmaps/circle_cyan_small.png"}).setOnChanged(function() {
                            var url = linkInfo.Url.DQXformat(data.fields);
                            window.open(url,'_blank');
                        })
                        buttons.push(bt)
                    });
                }

                that._selchk = Controls.Check(null, {
                        label: 'Select',
                        value: that.tableInfo.isItemSelected(that.itemid)
                    }).setOnChanged(function() {
                        that.tableInfo.selectItem(that.itemid, that._selchk.getValue());
                        Msg.broadcast({type:'SelectionUpdated'}, that.tableInfo.id);
                })
                buttons.push(Controls.Wrapper(that._selchk,'PnGridCheckWrapper'));

                var currentCol = null;
                var cols = [];
                var rowNr = 99;
                $.each(buttons, function(idx, button) {
                    if (rowNr>1) {
//                        if (cols.length>0)
//                            cols.push(Controls.HorizontalSeparator(7));
                        currentCol = Controls.CompoundVert([]).setTreatAsBlock().setMargin(0);
                        cols.push(currentCol);
                        rowNr = 0;
                    }
//                    if (rowNr>0)
//                        currentCol.addControl(Controls.VerticalSeparator(1));
                    currentCol.addControl(button);
                    rowNr += 1;
                });

                that.panelButtons.addControl(Controls.CompoundHor(cols));

                that.createPanelsRelations();

                $.each(that.itemViewObjects, function(idx, dtViewObject) {
                    dtViewObject.createPanels();
                });
            }

            that.createPanelsRelations = function() {
                $.each(that.childRelationTabs, function(idx, relTab) {

                    //Initialise the data fetcher that will download the data for the table
                    var theDataFetcher = DataFetchers.Table(
                        MetaData.serverUrl,
                        MetaData.database,
                        relTab.childTableInfo.getQueryTableName(false)
                    );
                    theDataFetcher.setReportIfError(true);

                    relTab.panelTable = QueryTable.Panel(
                        relTab.frameTable,
                        theDataFetcher,
                        { leftfraction: 50 }
                    );
                    var theTable = relTab.panelTable.getTable();
                    theTable.fetchBuffer = 300;
                    theTable.recordCountFetchType = DataFetchers.RecordCountFetchType.DELAYED;
                    var theQuery = SQL.WhereClause.CompareFixed(relTab.relationInfo.childpropid, '=', data.fields[that.tableInfo.primkey]);
                    theTable.setQuery(theQuery);


                    $.each(MetaData.customProperties, function(idx, propInfo) {
                        if ( (propInfo.tableid == relTab.childTableInfo.id) && (propInfo.propid!=relTab.relationInfo.childpropid) ) {
                            var col = MiscUtils.createItemTableViewerColumn(theTable, relTab.childTableInfo.id, propInfo.propid);
                        }
                    });
//                    $.each(relTab.childTableInfo.quickFindFields, function(idx, propid) {
//                        if (propid!=relTab.relationInfo.childpropid) {
//                            var propInfo = MetaData.findProperty(relTab.childTableInfo.id,propid);
//                            var col = MiscUtils.createItemTableViewerColumn(theTable, relTab.childTableInfo.id, propid);
//
//                        }
//                    });
//                    that.updateQuery();
                    relTab.panelTable.onResize();

                    var buttons = [];


                    relTab.panelButtons = Framework.Form(relTab.frameButtons);
                    var button_OpenInTable = Controls.Button(null, { content: 'Show in table view'}).setOnChanged(function() {
                        Msg.send({type: 'ShowItemsInSimpleQuery', tableid:relTab.childTableInfo.id},
                            { propid:relTab.relationInfo.childpropid, value:data.fields[that.tableInfo.primkey] }
                        );
                    })
                    buttons.push(button_OpenInTable);

                    if (relTab.childTableInfo.hasGeoCoord) {
                        var button_OpenInMap = Controls.Button(null, { content: 'Show on map'}).setOnChanged(function() {
                            Msg.send({type: 'CreateGeoMapPoint' },
                                {
                                    tableid: relTab.childTableInfo.id,
                                    startQuery: theQuery
                                });
                            }
                        );
                        buttons.push(button_OpenInMap);
                    }

                    relTab.panelButtons.addControl(Controls.CompoundHor(buttons));

                });
            }

            that.onClose = function() {
                var activeIndex = -1;
                $.each(ItemPopup.activeList, function(idx,popup) {
                    if (popup===that)
                        activeIndex = idx;
                });
                if (activeIndex>=0) {
                    ItemPopup.activeList.splice(activeIndex,1);
                }
                else
                    DQX.reportError('Plot not found!');

                $.each(that.itemViewObjects, function(idx, dtViewObj) {
                    dtViewObj.onClose();
                });

                $.each(that.eventids,function(idx,eventid) {
                    Msg.delListener(eventid);
                });
            };

            that.store = function() {
                var obj = {};
                obj.itemid = that.itemid;
                obj.tableid = that.tableInfo.id;
                obj.frameSettings = that.frameRoot.settingsStreamOut();
                return obj;
            };


            ItemPopup.activeList.push(that);
            that.create();
        }



        ItemPopup.store = function() {
            var obj = [];
            $.each(ItemPopup.activeList, function(idx,popup) {
                obj.push(popup.store());
            });
            return obj;
        }

        ItemPopup.recall = function(settObj) {
            $.each(settObj, function(idx,popupSettObj) {
                ItemPopup.show(popupSettObj);
            });
        }


        return ItemPopup;
    });



