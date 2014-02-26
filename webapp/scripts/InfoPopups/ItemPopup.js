define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils", "InfoPopups/ItemGenomeTracksPopup"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils, ItemGenomeTracksPopup
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
            var content='';//JSON.stringify(data);
            var propertyMap = {};
            $.each(MetaData.customProperties, function(idx,propInfo) {
                if (propInfo.tableid == itemInfo.tableid) {
                    propertyMap[propInfo.name] = propInfo.toDisplayString(data[propInfo.propid]);
                }
            });

            function addLevelToContent(levelInfo) {
                var tableInfo = MetaData.mapTableCatalog[levelInfo.tableid];
                content += "<table>";
                $.each(MetaData.customProperties,function(idx, propInfo) {
                    if (propInfo.tableid == tableInfo.id) {
                        var fieldContent = levelInfo.fields[propInfo.propid];
                        content += '<tr>';
                        content += '<td style="padding-bottom:3px;padding-top:3px;white-space:nowrap"><b>' + propInfo.name + "</b></td>";
                        content += '<td style="padding-left:5px;word-wrap:break-word;">' + propInfo.toDisplayString(fieldContent) + "</td>";
                        content += "</tr>";
                    }
                });
                content += "</table>";
                $.each(levelInfo.parents, function(idx, parentInfo) {
                    var parentTableInfo = MetaData.mapTableCatalog[parentInfo.tableid];
                    content += '<div style="padding-left:30px">';
                    content += '<div style="color:rgb(128,0,0);background-color: rgb(240,230,220);padding:3px;padding-left:8px"><i>';
                    content += parentInfo.relation.forwardname+' '+parentTableInfo.tableNameSingle;
                    content += '</i>&nbsp;&nbsp;';
                    var lnk = Controls.Hyperlink(null,{ content: 'Open'});
                    lnk.setOnChanged(function() {
                        Msg.send({type: 'ItemPopup'}, {tableid: parentInfo.tableid, itemid: parentInfo.fields[parentTableInfo.primkey]});
                    });
                    content += lnk.renderHtml();
                    content += '</div>';
                    addLevelToContent(parentInfo);
                    content += '</div>';
                });
            }

            addLevelToContent(data);


            var that = PopupFrame.PopupFrame('ItemPopup'+itemInfo.tableid,
                {
                    title:MetaData.getTableInfo(itemInfo.tableid).tableCapNameSingle + ' "'+itemInfo.itemid+'"',
                    blocking:false,
                    sizeX:700, sizeY:500
                }
            );
            that.itemid = itemInfo.itemid;
            that.tableInfo = MetaData.getTableInfo(itemInfo.tableid);

            that.createFrames = function() {
                that.frameRoot.makeGroupTab();


                that.frameBody = that.frameRoot.addMemberFrame(Framework.FrameGroupVert('', 0.7)).setDisplayTitle('Information fields');
                that.frameFields = that.frameBody.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(true,true);
                that.frameButtons = that.frameBody.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 90).setFrameClassClient('DQXGrayClient');

                if (that.tableInfo.hasGeoCoord) {
                    that.frameMap = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                        .setAllowScrollBars(false,false).setDisplayTitle('On map').setInitialiseFunction(function() {
                            that.theMap = Map.GMap(that.frameMap);
                            var pointSet = Map.PointSet('points', that.theMap, 0, "", { showLabels: false, showMarkers: true });
                            pointSet.setPoints([{
                                id: '',
                                longit: data.fields[that.tableInfo.propIdGeoCoordLongit],
                                lattit: data.fields[that.tableInfo.propIdGeoCoordLattit]
                            }])
                            setTimeout(function() {
                                pointSet.zoomFit(100);
                            }, 50);
                        });
                }

                that.childRelationTabs = [];
                $.each(that.tableInfo.relationsParentOf, function(idx,relationInfo) {
                    var relTab = {};
                    relTab.relationInfo = relationInfo;
                    relTab.childTableInfo = MetaData.mapTableCatalog[relationInfo.childtableid];
                    var frameRelation = that.frameRoot.addMemberFrame(Framework.FrameGroupVert('', 0.7))
                        .setDisplayTitle(relationInfo.reversename + ' ' + relTab.childTableInfo.tableNamePlural);
                    relTab.frameTable = frameRelation.addMemberFrame(Framework.FrameFinal('', 0.7))
                        .setAllowScrollBars(true,true);
                    relTab.frameButtons = frameRelation.addMemberFrame(Framework.FrameFinal('', 0.3))
                        .setFixedSize(Framework.dimY, 70).setFrameClassClient('DQXGrayClient');
                    that.childRelationTabs.push(relTab);
                });
            };

            that.createPanels = function() {
                that.frameFields.setContentHtml(content);
                that.panelButtons = Framework.Form(that.frameButtons);


                var buttons = [];

                if (that.tableInfo.hasGenomePositions) {
                    var genome_chromosome = data.fields[that.tableInfo.ChromosomeField];
                    var genome_position = parseInt(data.fields[that.tableInfo.PositionField]);
                    buttons.push(Controls.HorizontalSeparator(7));
                    var bt = Controls.Button(null, { content: 'Show on genome', buttonClass: 'DQXToolButton2', width:140, height:55, bitmap:'Bitmaps/GenomeBrowser.png'}).setOnChanged(function() {
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
                            var bt = Controls.Button(null, { content: 'Show '+oTableInfo.tableNamePlural, buttonClass: 'DQXToolButton2', width:150, height:55, bitmap:'Bitmaps/datagrid2.png'}).setOnChanged(function() {
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
                    buttons.push(Controls.HorizontalSeparator(7));
                    var bt = Controls.Button(null, { content: 'Show on genome', buttonClass: 'DQXToolButton2', width:140, height:55, bitmap:'Bitmaps/GenomeBrowser.png'}).setOnChanged(function() {
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
                            buttons.push(Controls.HorizontalSeparator(7));
                            var bt = Controls.Button(null, { content: 'Show '+tableInfo.tableNamePlural+' in range', buttonClass: 'DQXToolButton2', width:150, height:55, bitmap:'Bitmaps/datagrid2.png'}).setOnChanged(function() {
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
                    buttons.push(Controls.HorizontalSeparator(7));
                    var bt = Controls.Button(null, { content: 'Show genome tracks...', buttonClass: 'DQXToolButton2', width:150, height:55, bitmap:'Bitmaps/GenomeBrowser.png'}).setOnChanged(function() {
                        ItemGenomeTracksPopup.show(that.tableInfo, that.itemid);
                    })
                    buttons.push(bt)
                }

                that.panelButtons.addControl(Controls.CompoundHor(buttons));


                that.createPanelsRelations();
            }

            that.createPanelsRelations = function() {
                $.each(that.childRelationTabs, function(idx, relTab) {

                    //Initialise the data fetcher that will download the data for the table
                    var theDataFetcher = DataFetchers.Table(
                        MetaData.serverUrl,
                        MetaData.database,
                        relTab.childTableInfo.id + 'CMB_' + MetaData.workspaceid
                    );

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
                    buttons.push(Controls.HorizontalSeparator(7));


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
//                if (that.onCloseCustom)
//                    that.onCloseCustom();
            };

            that.store = function() {
                var obj = {};
                obj.itemid = that.itemid;
                obj.tableid = that.tableInfo.id;
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



