define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo) {

        var ItemPopup = {};

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
                    .setFixedSize(Framework.dimY, 70).setFrameClassClient('DQXGrayClient');

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
                    buttons.push(Controls.HorizontalSeparator(7));
                    var bt = Controls.Button(null, { content: 'Show on genome'}).setOnChanged(function() {
                        //that.close();//!!!todo: only when blocking
                        Msg.send({ type: 'JumpgenomePosition' }, {chromoID:data.chrom, position:parseInt(data.pos) });
                    })
                    buttons.push(bt)
                }

                if (that.tableInfo.tableBasedSummaryValues.length>0) {
                    buttons.push(Controls.HorizontalSeparator(7));
                    var chk = Controls.Check(null, {
                            label: 'Show Genome tracks',
                            value:that.tableInfo.genomeTrackSelectionManager.isItemSelected(that.itemid)
                        }).setOnChanged(function() {
                        that.tableInfo.genomeTrackSelectionManager.selectItem(that.itemid,chk.getValue())
                    })
                    buttons.push(chk)
                }

                that.panelButtons.addControl(Controls.CompoundHor(buttons));

                that.createPanelsRelations();
            }

            that.createPanelsRelations = function() {
                $.each(that.childRelationTabs, function(idx, relTab) {

                    //Initialise the data fetcher that will download the data for the table
                    if (!relTab.childTableInfo.summaryValuesTableFetcher) {
                        relTab.childTableInfo.summaryValuesTableFetcher = DataFetchers.Table(
                            MetaData.serverUrl,MetaData.database,relTab.childTableInfo.id
                        );
                    }

                    relTab.panelTable = QueryTable.Panel(
                        relTab.frameTable,
                        relTab.childTableInfo.summaryValuesTableFetcher,
                        { leftfraction: 50 }
                    );
                    var theTable = relTab.panelTable.getTable();
                    theTable.fetchBuffer = 300;
                    theTable.recordCountFetchType = DataFetchers.RecordCountFetchType.DELAYED;
                    var theQuery = SQL.WhereClause.CompareFixed(relTab.relationInfo.childpropid, '=', data.fields[that.tableInfo.primkey]);
                    theTable.setQuery(theQuery);

                    $.each(relTab.childTableInfo.quickFindFields, function(idx, propid) {
                        var propInfo = MetaData.findProperty(relTab.childTableInfo.id,propid);
                        var col = theTable.createTableColumn(
                            QueryTable.Column(
                                propInfo.name,propid,
                                (propInfo.isPrimKey)?0:1),
                            'String',//!!! todo: adapt this to datatype, see TableViewer
                            true
                        );
                        if (propInfo.isPrimKey) {
                            col.setCellClickHandler(function(fetcher,downloadrownr) {
                                var itemid=theTable.getCellValue(downloadrownr,propInfo.propid);
                                Msg.send({ type: 'ItemPopup' }, { tableid: relTab.childTableInfo.id, itemid: itemid } );
                            })
                        }
                    });
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

            that.create();


        }


        return ItemPopup;
    });



