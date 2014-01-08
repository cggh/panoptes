define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/DocEl", "DQX/Popup", "DQX/Utils", "DQX/SQL", "DQX/QueryTable", "DQX/QueryBuilder", "DQX/DataFetcher/DataFetchers",
    "MetaData",
    "Plots/ItemScatterPlot", "Plots/BarGraph", "Plots/Histogram", "Plots/Histogram2D", "Plots/GeoMapPoints",
    "Wizards/EditQuery", "Utils/QueryTool"],
    function (require, Application, Framework, Controls, Msg, DocEl, Popup, DQX, SQL, QueryTable, QueryBuilder, DataFetchers,
              MetaData,
              ItemScatterPlot, BarGraph, Histogram, Histogram2D, GeoMapPoints,
              EditQuery, QueryTool) {


        //A helper function, turning a fraction into a color string
        var createFuncFraction2Color = function(minval, maxval) {
            var range = maxval-minval;
            if (!range)
                range = 1;
            return function (vl) {
                if (vl == null)
                    return "white";
                else {
                    vl=parseFloat(vl);
                    vl = (vl-minval) / range;
                    vl = Math.max(0, vl);
                    vl = Math.min(1, vl);
                    if (vl > 0) vl = 0.05 + vl * 0.95;
                    vl = Math.sqrt(vl);
                    var b = 255 ;
                    var g = 255 * (1 - 0.3*vl * vl);
                    var r = 255 * (1 - 0.6*vl);
                    return "rgb(" + parseInt(r) + "," + parseInt(g) + "," + parseInt(b) + ")";
                }
            };
        }




        var TableViewerModule = {

            init: function (tableid) {
                // Instantiate the view object
                var inf = MetaData.getTableInfo(tableid);
                var that = Application.View(
                    'table_'+tableid,  // View ID
                    MetaData.getTableInfo(tableid).tableCapNamePlural
                );

                that.setEarlyInitialisation();
                that.tableid = tableid;
                that.theQuery = QueryTool.Create(tableid);
                MetaData.getTableInfo(that.tableid).tableViewer = that;

                Msg.listen('',{ type: 'SelectionUpdated'}, function(scope,tableid) {
                    if (that.tableid==tableid) {
                        if (that.myTable)
                            that.myTable.render();
                    }
                } );

                if (MetaData.getTableInfo(that.tableid).hasGenomePositions) {
                    Msg.listen('',{type: 'ShowItemsInGenomeRange', tableid: that.tableid}, function(scope, info) {
                        that.activateState();
                        if (info.preservecurrentquery)
                            var qry =that.theQuery.get();
                        else
                            var qry = SQL.WhereClause.Trivial();
                        qry = SQL.WhereClause.createValueRestriction(qry, 'chrom', info.chrom);
                        qry = SQL.WhereClause.createRangeRestriction(qry, 'pos', info.start, info.stop, true);
                        that.theQuery.modify(qry);
                    });

                }

                Msg.listen('',{type: 'ShowItemsInSimpleQuery', tableid: that.tableid}, function(scope, info) {
                    that.activateState();
                    var qry = SQL.WhereClause.CompareFixed(info.propid, '=', info.value);
                    that.theQuery.modify(qry);
                });

                that.storeSettings = function() {
                    var obj= {};
                    obj.query = SQL.WhereClause.encode(that.theQuery.get());
                    if (that.visibilityControlsGroup)
                        obj.activecolumns = Controls.storeSettings(that.visibilityControlsGroup);
                    return obj;
                };

                that.recallSettings = function(settObj) {
                    var qry = SQL.WhereClause.decode(settObj.query);
                    that.theQuery.modify(qry);
                    var tableInfo = MetaData.getTableInfo(that.tableid);
                    tableInfo.currentQuery = qry;
                    if ((settObj.activecolumns) && (that.visibilityControlsGroup) )
                        Controls.recallSettings(that.visibilityControlsGroup, settObj.activecolumns, false);

                };

                // Activates this view, and loads a query
                that.activateWithQuery = function(qry) {
                    that.activateState();
                    that.theQuery.modify(qry);
                };


                that.createFrames = function(rootFrame) {
                    rootFrame.makeGroupHor();
                    this.frameControls = rootFrame.addMemberFrame(Framework.FrameFinal('',0.2)).setMinSize(Framework.dimX,250);
                    this.frameTable = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.8))//Create frame that will contain the table viewer
                        .setAllowScrollBars(false,true);
                }



                that.createPanels = function() {
                    //Initialise the data fetcher that will download the data for the table
                    this.theTableFetcher = DataFetchers.Table(
                        MetaData.serverUrl,
                        MetaData.database,
                        that.tableid + 'CMB_' + MetaData.workspaceid
                    );

                    this.createPanelTableViewer();
                    this.createPanelControls();

                    this.reLoad();
                    that.panelsCreated = true;

                };


                that.postLoadAction = function() {
                    if (that.hasBecomeVisible) {
                        that.myTable.preventFetch = false;
                        that.uptodate = false;
                        that.reLoad();
                    }
                };

                that.onBecomeVisible = function() {
                    if (!that.hasBecomeVisible) {
                        if (that.panelsCreated) {
                            if (that.viewIsLoaded) {
                                that.myTable.preventFetch = false;
                                that.uptodate = false;
                                that.reLoad();
                            }
                        }
                        that.hasBecomeVisible = true;
                    }
                }

                //Create the table viewer panel
                that.createPanelTableViewer = function () {
                    //Initialise the panel that will contain the table
                    var tableInfo = MetaData.getTableInfo(that.tableid);
                    this.panelTable = QueryTable.Panel(
                        this.frameTable,
                        this.theTableFetcher,
                        { leftfraction: 50 }
                    );
                    this.myTable = this.panelTable.getTable();// A shortcut variable
                    this.myTable.fetchBuffer = 300;
                    this.myTable.recordCountFetchType = DataFetchers.RecordCountFetchType.NONE;
                    if (tableInfo.settings.FetchRecordCount)
                        this.myTable.recordCountFetchType = DataFetchers.RecordCountFetchType.DELAYED;
                    this.myTable.preventFetch = true;
                    that.myTable.setQuery(that.theQuery.get());

                };


                that.createPanelControls = function () {
                    this.panelSimpleQuery = Framework.Form(this.frameControls);
                    this.panelSimpleQuery.setPadding(10);

                    var ctrlQuery = that.theQuery.createControl();
                    var tableInfo = MetaData.getTableInfo(that.tableid);
                    var buttonsPlots = [];

                    if (tableInfo.propIdGeoCoordLongit && tableInfo.propIdGeoCoordLattit) {
                        var cmdGeoMapPoints = Controls.Button(null, { content: 'Map points...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                        cmdGeoMapPoints.setOnChanged(function() {
                            GeoMapPoints.Create(that.tableid);
                        });
                        buttonsPlots.push(cmdGeoMapPoints);
                    }

                    var cmdHistogram = Controls.Button(null, { content: 'Histogram...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                    cmdHistogram.setOnChanged(function() {
                        Histogram.Create(that.tableid);
                    });
                    buttonsPlots.push(cmdHistogram);

                    var cmdBarGraph = Controls.Button(null, { content: 'Bar graph...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                    cmdBarGraph.setOnChanged(function() {
                        BarGraph.Create(that.tableid);
                    });
                    buttonsPlots.push(cmdBarGraph);

                    var cmdHistogram2d = Controls.Button(null, { content: '2D Histogram...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                    cmdHistogram2d.setOnChanged(function() {
                        Histogram2D.Create(that.tableid);
                    });
                    buttonsPlots.push(cmdHistogram2d);

                    var cmdScatterPlot = Controls.Button(null, { content: 'Scatter plot...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                    cmdScatterPlot.setOnChanged(function() {
                        ItemScatterPlot.Create(that.tableid);
                    });
                    buttonsPlots.push(cmdScatterPlot);

                    that.visibilityControlsGroup = Controls.CompoundVert([]);

                    var cmdHideAllColumns = Controls.Button(null, { content: 'Hide all', buttonClass: 'DQXToolButton2' }).setOnChanged(function() {
                        if (that.columnVisibilityChecks) {
                            $.each(that.columnVisibilityChecks, function(idx, chk) {
                                if (chk.getValue())
                                    chk.modifyValue(false);
                            });
                        }
                    });

                    this.panelSimpleQuery.addControl(Controls.CompoundVert([
                        ctrlQuery,
                        Controls.VerticalSeparator(15),
                        Controls.CompoundVert(buttonsPlots),
                        Controls.CompoundVert([
                            cmdHideAllColumns,
                            that.visibilityControlsGroup
                        ]).setLegend('Visible columns')

                    ]));
                }

                //Returns a user-friendly text description of a query
                that.getQueryDescription = function(qry) {
                    var str = '<div style="background-color: rgb(255,240,230);width:100%">';
                    if (!qry.isTrivial) {
                        nameMap = {};
                        $.each(MetaData.customProperties,function(idx,propInfo) {
                            if (propInfo.tableid == that.tableid)
                                nameMap[propInfo.propid] = {
                                    name: propInfo.name,
                                    toDisplayString: propInfo.toDisplayString
                                };
                        });
                        str += '<span style="color: rgb(128,0,0)"><b>Active query:</b></span><br><span style="color: rgb(128,0,0);font-size:80%">'+qry.toDisplayString(nameMap,0)+'</span>';
                    } else {
                      str += '<span style="color: rgb(128,0,0)"><b>Active query:</b></span><br><span style="color: rgb(128,0,0);font-size:80%">All</span>'
                    }
                    str += '</div>';
                    return str;
                };

                that.getRecordCount = function() {
                    if (!that.myTable)
                        return null;
                    return that.myTable.getRecordCount();
                };

                that.getSortColumn = function() {
                    if (!that.myTable)
                        return MetaData.getTableInfo(that.tableid).primkey;
                    return that.myTable.getSortColumn();
                };


                that.updateQuery2 = function() {
                    if (that.myTable) {
                        that.myTable.setQuery(that.theQuery.get());
                        that.myTable.reLoadTable();
                        var tableInfo = MetaData.getTableInfo(that.tableid);
                        tableInfo.currentQuery = that.theQuery.get();
                        Msg.broadcast({ type: 'QueryChanged'}, that.tableid );
                    }
                };

                that.createColumnPopup = function(propid) {
                    var colInfo = MetaData.findProperty(that.tableid, propid);
                    var content = '<p>';
                    if (colInfo.settings.Description)
                        content += colInfo.settings.Description;
                    else
                        content += 'No description available';
                    content += '<p>';
                    var buttons=[];
                    var thecol = that.panelTable.getTable().findColumn(propid);
                    if (thecol.sortOption) {
                        buttons.push( Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Sort<br>ascending", bitmap:DQX.BMP('arrow4down.png'), width:120, height:40 })
                            .setOnChanged(function() {
                                that.panelTable.getTable().sortByColumn(propid,false);
                                if (!Popup.isPinned(popupID))
                                    DQX.ClosePopup(popupID);
                            }) );
                        buttons.push( Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Sort<br>descending", bitmap:DQX.BMP('arrow4up.png'), width:120, height:40 })
                            .setOnChanged(function() {
                                that.panelTable.getTable().sortByColumn(propid,true);
                                if (!Popup.isPinned(popupID))
                                    DQX.ClosePopup(popupID);
                            }) );
                    }
/*                    if (thecol.linkFunction) {
                        buttons.push( Controls.Button(null, { buttonClass: 'DQXToolButton2', content: thecol.linkHint, width:170, height:50 })
                            .setOnChanged(function() {
                                thecol.linkFunction(id);
                                if (!Popup.isPinned(popupID))
                                    DQX.ClosePopup(popupID);
                            }) );
                    }*/

                    $.each(buttons,function(idx,bt) { content+=bt.renderHtml(); });
                    var popupID = Popup.create(colInfo.name, content);
                }


                // Initialise the table viewer columns
                that.reLoad = function() {
                    var tableInfo = MetaData.getTableInfo(that.tableid);

                    if (that.uptodate)
                        return;
                    that.uptodate = true;

                    this.theTableFetcher.resetAll();
                    that.myTable.clearTableColumns();

                    that.myTable.createSelectionColumn("sel", "", tableInfo.id, tableInfo.primkey, tableInfo, DQX.Color(1,0,0), function() {
                        Msg.broadcast({type:'SelectionUpdated'}, tableInfo.id);
                    });


                    //Temporarily store the column visibility status, in case this is a reload
                    var colIsHidden = {};
                    if (that.columnVisibilityChecks) {
                        $.each(that.columnVisibilityChecks, function(idx, chk) {
                            if (!chk.getValue())
                                colIsHidden[chk.colID] = true;
                        });
                    }
                    that.columnVisibilityChecks = [];

                    that.visibilityControlsGroup.clear();

                    //Create a column for each property
                    $.each(MetaData.customProperties,function(idx,propInfo) {
                        if ((propInfo.tableid == that.tableid) && (propInfo.settings.showInTable)) {
                            var encoding  = 'String';
                            var tablePart = 1;
                            if (propInfo.datatype=='Value')
                                encoding  = 'Float3';
                            if ((propInfo.datatype=='Value') && (propInfo.propid=='pos') && (MetaData.getTableInfo(that.tableid).hasGenomePositions) )
                                encoding  = 'Int';
                            if (propInfo.datatype=='Boolean')
                                encoding  = 'Int';
                            if (propInfo.isPrimKey)
                                tablePart = 0;
                            var sortable = (!tableInfo.hasGenomePositions) || ( (propInfo.propid!='chrom') && (propInfo.propid!='pos') );
                            var col = that.myTable.createTableColumn(
                                QueryTable.Column(propInfo.name,propInfo.propid,tablePart),
                                encoding,
                                sortable
                            );
                            if (propInfo.settings.Description)
                                col.setToolTip(propInfo.settings.Description);
                            if ( (tableInfo.hasGenomePositions) && (that.myTable.findColumn('chrom')) && (that.myTable.findColumn('pos')) ) {
                                // Define a joint sort action on both columns chrom+pos, and set it as default
                                that.myTable.addSortOption("Position", SQL.TableSort(['chrom', 'pos']),true);
                            }

                            if (propInfo.datatype=='Boolean')
                                col.setDataType_MultipleChoiceInt([{id:0, name:'No'}, {id:1, name:'Yes'}]);

                            if (propInfo.propid=='chrom')
                                col.setDataType_MultipleChoiceString(MetaData.chromosomes);

                            if (propInfo.propCategories) {
                                var cats = [];
                                $.each(propInfo.propCategories, function(idx, cat) {
                                    cats.push({id:cat, name:cat});
                                });
                                col.setDataType_MultipleChoiceString(cats);
                            }

                            col.setHeaderClickHandler(function(id) {
                                that.createColumnPopup(id);
                            })

                            if (propInfo.isPrimKey) {
                                col.setCellClickHandler(function(fetcher,downloadrownr) {
                                    var itemid=that.panelTable.getTable().getCellValue(downloadrownr,propInfo.propid);
                                    Msg.send({ type: 'ItemPopup' }, { tableid: that.tableid, itemid: itemid } );
                                })
                            }

                            col.CellToText = propInfo.toDisplayString;

                            if ( (propInfo.isFloat) && (propInfo.settings.hasValueRange) )
                                col.CellToColor = createFuncFraction2Color(propInfo.settings.minval, propInfo.settings.maxval); //Create a background color that reflects the value

                            if (propInfo.isBoolean)
                                col.CellToColor = function(vl) { return vl?DQX.Color(0.75,0.85,0.75):DQX.Color(1.0,0.9,0.8); }

                            // Create checkbox that controls the visibility of the column
                            var chk = Controls.Check(null,{label:propInfo.name, value:(!colIsHidden[col.myCompID]) }).setClassID(propInfo.propid).setOnChanged(function() {
                                that.myTable.findColumnRequired(chk.colID).setVisible(chk.getValue());
                                that.myTable.render();
                            });
                            chk.colID = col.myCompID;
                            if (colIsHidden[col.myCompID])
                                col.setVisible(false);
                            that.visibilityControlsGroup.addControl(chk);
                            that.columnVisibilityChecks.push(chk);
                        }
                    });

                    that.myTable.reLoadTable();
                    this.panelSimpleQuery.render();
                }


                that.theQuery.notifyQueryUpdated = that.updateQuery2;
                return that;
            }

        };

        return TableViewerModule;
    });