// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl",
        "DQX/Utils", "DQX/QueryTable", "DQX/Map", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame",
        "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions",
        "DQX/ChannelPlot/ChannelSequence", "DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
        "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils", "InfoPopups/ItemGenomeTracksPopup",
        "InfoPopups/DataItemViews/DefaultView", "InfoPopups/DataItemViews/ItemMap", "InfoPopups/DataItemViews/PieChartMap",
        "InfoPopups/DataItemViews/FieldList", "InfoPopups/DataItemViews/PropertyGroup", "InfoPopups/ItemPopup",
        "InfoPopups/DataItemViews/RelationTableView", "InfoPopups/DataItemViews/SubsetsView","InfoPopups/DataItemViews/TemplatedView"
    ],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map, Wizard, Popup,
              PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils, ItemGenomeTracksPopup, ItemView_DefaultView, ItemView_ItemMap,
              ItemView_PieChartMap, ItemView_FieldList, ItemView_PropertyGroup, ItemPopup, RelationTableView, SubsetsView, TemplatedView) {

        var ItemView = function (frameRoot, itemInfo, initialItemData) {
            var that = {};
            that.frameRoot = frameRoot;
            that.tableInfo = MetaData.getTableInfo(itemInfo.tableid);
            that.itemid = itemInfo.itemid;

            that.eventids = [];//Add event listener id's to this list to have them removed when the view closes
            var eventid = DQX.getNextUniqueID();
            that.eventids.push(eventid);
            Msg.listen(eventid, { type: 'SelectionUpdated'}, function (scope, tableid) {
                if (that.tableInfo.id == tableid) {
                    that._updateSelectButton();
                }
            });


            that.createFrames = function () {

                that.frameRoot.makeGroupVert();

                var frameTabGroup = that.frameRoot.addMemberFrame(Framework.FrameGroupTab('', 0.7));

                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 80).setFrameClassClient('DQXGrayClient').setAllowScrollBars(false, false).setMargins(0);


                that.itemViewObjects = [];
                if (that.tableInfo.settings.DataItemViews)
                    var dataItemViews = that.tableInfo.settings.DataItemViews;
                else { //Fill with defaults
                    var dataItemViews = [];
                    dataItemViews.push({ Type: 'Overview', Name: 'Overview' });
                    if (that.tableInfo.hasGeoCoord)
                        dataItemViews.push({ Type: 'ItemMap', Name: 'Location' });
                }
                $.each(dataItemViews, function (idx, dtViewInfo) {
                    var dtViewObject = null;
                    if (dtViewInfo.Type == 'Overview') {
                        dtViewObject = ItemView_DefaultView.create(dtViewInfo, initialItemData);
                    }
                    if (dtViewInfo.Type == 'PieChartMap') {
                        dtViewObject = ItemView_PieChartMap.create(dtViewInfo, initialItemData);
                    }
                    if (dtViewInfo.Type == 'ItemMap') {
                        dtViewObject = ItemView_ItemMap.create(dtViewInfo, initialItemData);
                    }
                    if (dtViewInfo.Type == 'FieldList') {
                        dtViewObject = ItemView_FieldList.create(dtViewInfo, initialItemData);
                    }
                    if (dtViewInfo.Type == 'PropertyGroup') {
                        dtViewObject = ItemView_PropertyGroup.create(dtViewInfo, initialItemData);
                    }
                    if (dtViewInfo.Type == 'Template') {
                        dtViewObject = TemplatedView.create(dtViewInfo, initialItemData);
                    }
                    if (!dtViewObject)
                        DQX.reportError("Invalid dataitem view type " + dtViewInfo.Type);
                    that.itemViewObjects.push(dtViewObject);
                });

                $.each(that.tableInfo.relationsParentOf, function (idx, relationInfo) {
                    var relationView = RelationTableView.create(initialItemData, relationInfo);
                    that.itemViewObjects.push(relationView);
                });

                if ((!that.tableInfo.settings.DisableSubsets) || (!that.tableInfo.settings.DisableNotes) ){
                    var subsetView = SubsetsView.create(initialItemData);
                    that.itemViewObjects.push(subsetView);
                }

                $.each(that.itemViewObjects, function (idx, dtViewObject) {
                    //Create frames and add to parent
                    dtViewObject.createFrames(frameTabGroup);
                });


            };

            that.createButtons = function(itemData) {
                that.buttonWidth = 160;
                that.buttonHeight = 30;
                var itemid = itemData.fields[that.tableInfo.primkey];


                var buttons = [];

                if (that.tableInfo.hasGenomePositions) {
                    var genome_chromosome = itemData.fields[that.tableInfo.ChromosomeField];
                    var genome_position = parseInt(itemData.fields[that.tableInfo.PositionField]);
                    if (genome_chromosome) {
                        var bt = Controls.Button(null, { content: 'Show on genome', buttonClass: 'PnButtonGrid', width: that.buttonWidth, height: that.buttonHeight, bitmap: 'Bitmaps/GenomeBrowserSmall.png'}).setOnChanged(function () {
                            PopupFrame.minimiseAll({ slow: true});
                            Msg.send({ type: 'JumpgenomePosition' }, {
                                chromoID: genome_chromosome,
                                position: genome_position
                            });
                        })
                        buttons.push(bt);
                    }

                    // Create buttons to show genomic regions spanning this position
                    $.each(MetaData.tableCatalog, function (idx, oTableInfo) {
                        if (oTableInfo.hasGenomeRegions) {
                            var bt = Controls.Button(null, {
                                content: 'Show ' + oTableInfo.tableNamePlural,
                                buttonClass: 'PnButtonGrid',
                                width: that.buttonWidth,
                                height: that.buttonHeight,
                                bitmap: (!oTableInfo.settings.Icon) ? 'Bitmaps/datagrid2Small.png' : null,
                                icon: oTableInfo.settings.Icon
                            }).setOnChanged(function () {
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
                    var bt = Controls.Button(null, { content: 'Show on genome', buttonClass: 'PnButtonGrid', width: that.buttonWidth, height: that.buttonHeight, bitmap: 'Bitmaps/GenomeBrowserSmall.png'}).setOnChanged(function () {
                        PopupFrame.minimiseAll({ slow: true});
                        Msg.send({ type: 'JumpgenomeRegion' }, {
                            chromoID: itemData.fields[that.tableInfo.settings.Chromosome],
                            start: parseInt(itemData.fields[that.tableInfo.settings.RegionStart]),
                            end: parseInt(itemData.fields[that.tableInfo.settings.RegionStop])
                        });
                    })
                    buttons.push(bt);

                    $.each(MetaData.tableCatalog, function (idx, tableInfo) {
                        if (tableInfo.hasGenomePositions) {
                            var bt = Controls.Button(null, {
                                content: 'Show ' + tableInfo.tableNamePlural + ' in range',
                                buttonClass: 'PnButtonGrid',
                                width: that.buttonWidth,
                                height: that.buttonHeight,
                                bitmap: (!tableInfo.settings.Icon) ? 'Bitmaps/datagrid2Small.png' : null,
                                icon: tableInfo.settings.Icon
                            }).setOnChanged(function () {
                                Msg.send({type: 'ShowItemsInGenomeRange', tableid: tableInfo.id}, {
                                    preservecurrentquery: false,
                                    chrom: itemData.fields[that.tableInfo.settings.Chromosome],
                                    start: parseInt(itemData.fields[that.tableInfo.settings.RegionStart]),
                                    stop: parseInt(itemData.fields[that.tableInfo.settings.RegionStop])
                                });
                            })
                            buttons.push(bt);
                        }
                    });
                }

                var reverseCrossLinkInfoList = MiscUtils.getReverseCrossLinkList(that.tableInfo.id, itemid);
                $.each(reverseCrossLinkInfoList, function (idx, linkInfo) {
                    var bt = Controls.Button(null, { content: 'Show associated ' + linkInfo.dispName, buttonClass: 'PnButtonGrid', width: that.buttonWidth, height: that.buttonHeight, bitmap: linkInfo.bitmap, bitmapHeight: 20}).setOnChanged(function () {
                        MiscUtils.openReverseCrossLink(linkInfo);
                    });
                    buttons.push(bt);
                });

                if (that.tableInfo.tableBasedSummaryValues.length > 0) {
                    var bt = Controls.Button(null, { content: 'Show genome tracks...', buttonClass: 'PnButtonGrid', width: that.buttonWidth, height: that.buttonHeight, bitmap: 'Bitmaps/GenomeBrowserSmall.png'}).setOnChanged(function () {
                        ItemGenomeTracksPopup.show(that.tableInfo, itemid);
                    })
                    buttons.push(bt)
                }

                if (that.tableInfo.settings.ExternalLinks) {
                    $.each(that.tableInfo.settings.ExternalLinks, function (idx, linkInfo) {
                        var bt = Controls.Button(null, { content: linkInfo.Name, buttonClass: 'PnButtonGrid', width: that.buttonWidth, height: that.buttonHeight, icon: "fa-link"}).setOnChanged(function () {
                            var url = linkInfo.Url.DQXformat(itemData.fields);
                            window.open(url, '_blank');
                        })
                        buttons.push(bt)
                    });
                }

                that._updateSelectButton = function() {
                    var isSelected = that.tableInfo.isItemSelected(itemid);
                    if (isSelected)
                        that._btchk.changeIcon('fa-check-circle', DQX.Color(0.8,0.2,0), 'Selected');
                    else
                        that._btchk.changeIcon('fa-circle-thin', 'inherit', 'Select');
                };

                var isSelected = that.tableInfo.isItemSelected(itemid);
                that._btchk = Controls.Button(null, {
                    buttonClass: 'PnButtonGrid',
                    width:that.buttonWidth, height:that.buttonHeight,
                    content: isSelected?'Selected':'Select',
                    icon:isSelected?'fa-check-circle':"fa-circle-thin",
                    iconColor:isSelected?DQX.Color(0.8,0.2,0):null
                }).setOnChanged(function() {
                    that.tableInfo.selectItem(itemid, !that.tableInfo.isItemSelected(itemid));
                    that._updateSelectButton();
                    Msg.broadcast({type:'SelectionUpdated'}, that.tableInfo.id);
                });
                buttons.push(that._btchk);

                var currentCol = null;
                var cols = [];
                var rowNr = 99;
                $.each(buttons, function (idx, button) {
                    if (rowNr > 1) {
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

                return Controls.CompoundHor(cols);
            }

            that.createPanels = function () {
                that.panelButtons = Framework.Form(that.frameButtons);
                that.panelButtons.addControl(that.createButtons(initialItemData));

                $.each(that.itemViewObjects, function (idx, dtViewObject) {
                    dtViewObject.createPanels();
                });
            }

            that.destroy = function () {
                $.each(that.itemViewObjects, function (idx, dtViewObj) {
                    dtViewObj.onClose();
                });

                $.each(that.eventids, function (idx, eventid) {
                    Msg.delListener(eventid);
                });
            }

            that.render = function () {
                that.createFrames();
                that.frameRoot.render();
                that.createPanels();
                that.frameRoot.applyOnPanels(function(panel) {
                    if (panel._panelfirstRendered==false)
                        panel.render();
                });
            };

            that.update = function(newItemData) {
                that.panelButtons.clear();
                that.panelButtons.addControl(that.createButtons(newItemData));
                that.panelButtons.render();
                that.itemid = newItemData.fields[that.tableInfo.primkey];

                $.each(that.itemViewObjects, function (idx, dtViewObject) {
                    if (dtViewObject.update)
                        dtViewObject.update(newItemData);
                });
            }

            that.tearDown = function () {
                that.destroy();
                that.frameRoot.applyOnPanels(function(panel) {
                    if (panel.tearDown)
                        panel.tearDown();
                });
            };


            return that;
        };
        return ItemView;
    });



