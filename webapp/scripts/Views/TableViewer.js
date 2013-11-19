define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/SQL", "DQX/QueryTable", "DQX/QueryBuilder", "DQX/DataFetcher/DataFetchers", "MetaData", "Plots/ItemScatterPlot", "Plots/BarGraph", "Plots/Histogram", "Plots/Histogram2D", "Wizards/EditQuery", "Utils/QueryTool"],
    function (require, Application, Framework, Controls, Msg, DocEl, DQX, SQL, QueryTable, QueryBuilder, DataFetchers, MetaData, ItemScatterPlot, BarGraph, Histogram, Histogram2D, EditQuery, QueryTool) {


        //A helper function, turning a fraction into a color string
        var funcFraction2Color = function (vl) {
            if (vl == null)
                return "white";
            else {
                vl=parseFloat(vl);
                var vl = Math.abs(vl);
                vl = Math.min(1, vl);
                if (vl > 0) vl = 0.05 + vl * 0.95;
                vl = Math.sqrt(vl);
                var b = 255 ;
                var g = 255 * (1 - 0.3*vl * vl);
                var r = 255 * (1 - 0.6*vl);
                return "rgb(" + parseInt(r) + "," + parseInt(g) + "," + parseInt(b) + ")";
            }
        };




        var TableViewerModule = {

            init: function (tableid) {
                // Instantiate the view object
                var that = Application.View(
                    'table_'+tableid,  // View ID
                    MetaData.mapTableCatalog[tableid].name+' table'  // View title
                );

                that.tableid = tableid;

                that.theQuery = QueryTool.Create(tableid);

                Msg.listen('',{ type: 'SelectionUpdated'}, function(scope,tableid) {
                    if (that.tableid==tableid) {
                        if (that.myTable)
                            that.myTable.render();
                    }
                } );

                if (tableid == 'SNP') {
                    Msg.listen('',{type: 'ShowSNPsInRange'}, function(scope, info) {
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
                    var tableInfo = MetaData.mapTableCatalog[that.tableid];
                    tableInfo.currentQuery = qry;
                    if ((settObj.activecolumns) && (that.visibilityControlsGroup) )
                        Controls.recallSettings(that.visibilityControlsGroup, settObj.activecolumns, false);

                };

                that.activateWithQuery = function(qry) {
                    that.activateState();
                    that.theQuery.modify(qry);
                };


                //This function is called during the initialisation. Create the frame structure of the view here
                that.createFrames = function(rootFrame) {
                    rootFrame.makeGroupHor();//Declare the root frame as a horizontally divided set of subframes
                    //this.frameQueriesContainer = rootFrame.addMemberFrame(Framework.FrameGroupVert('', 0.4));//Create frame that will contain the query panels
                    this.frameControls = rootFrame.addMemberFrame(Framework.FrameFinal('',0.2)).setMinSize(Framework.dimX,250)
                    this.frameTable = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.8))//Create frame that will contain the table viewer
                        .setAllowScrollBars(false,true);
                }

                MetaData.mapTableCatalog[that.tableid].tableViewer = that;


                //This function is called during the initialisation. Create the panels that will populate the frames here
                that.createPanels = function() {


                    //Initialise the data fetcher that will download the data for the table
                    this.theTableFetcher = DataFetchers.Table(
                        MetaData.serverUrl,
                        MetaData.database,
                        that.tableid + 'CMB_' + MetaData.workspaceid
                    );
                    this.theTableFetcher.showDownload=true; //Allows the user to download the data in the table

                    this.createPanelTableViewer();

                    // Create the "simple query" panel
                    this.createPanelControls();

                    this.reLoad();


                };

                that.onBecomeVisible = function() {
                    that.reLoad();
                }

                //Create the table viwer panel
                that.createPanelTableViewer = function () {
                    //Initialise the panel that will contain the table
                    this.panelTable = QueryTable.Panel(
                        this.frameTable,
                        this.theTableFetcher,
                        { leftfraction: 50 }
                    );
                    this.myTable = this.panelTable.getTable();// A shortcut variable
                    this.myTable.fetchBuffer = 300;
                    this.myTable.immediateFetchRecordCount = false;
                    that.myTable.setQuery(that.theQuery.get());

                    // Add a column for chromosome
                    var comp = that.myTable.createTableColumn(
                        QueryTable.Column("Chrom.","chrom",0),
                        "String",
                        false
                    );

                    // For the query tools, define this column as a multiple choice set
                    var chromPickList = [];
                    $.each(MetaData.chromosomes,function(idx,chrom) {
                        chromPickList.push({ id: idx+1, name: MetaData.chromosomes[idx].id });
                    })
                    //comp.setDataType_MultipleChoiceInt(chromPickList);

                };


                that.createPanelControls = function () {
                    this.panelSimpleQuery = Framework.Form(this.frameControls);
                    this.panelSimpleQuery.setPadding(10);

                    var ctrlQuery = that.theQuery.createControl();

                    var cmdHistogram = Controls.Button(null, { content: 'Histogram...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                    cmdHistogram.setOnChanged(function() {
                        Histogram.Create(that.tableid);
                    });

                    var cmdBarGraph = Controls.Button(null, { content: 'Bar graph...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                    cmdBarGraph.setOnChanged(function() {
                        BarGraph.Create(that.tableid);
                    });

                    var cmdHistogram2d = Controls.Button(null, { content: '2D Histogram...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                    cmdHistogram2d.setOnChanged(function() {
                        Histogram2D.Create(that.tableid);
                    });

                    var cmdScatterPlot = Controls.Button(null, { content: 'Scatter plot...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                    cmdScatterPlot.setOnChanged(function() {
                        ItemScatterPlot.Create(that.tableid);
                    });

                    that.visibilityControlsGroup = Controls.CompoundVert([]);


                    this.panelSimpleQuery.addControl(Controls.CompoundVert([
                        ctrlQuery,
                        Controls.VerticalSeparator(15),
                        cmdHistogram,
                        cmdBarGraph,
                        cmdHistogram2d,
                        cmdScatterPlot,
                        that.visibilityControlsGroup
                    ]));
                }

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
                        return MetaData.mapTableCatalog[that.tableid].primkey;
                    return that.myTable.getSortColumn();
                };


                that.updateQuery2 = function() {
                    if (that.myTable) {
                        that.myTable.setQuery(that.theQuery.get());
                        that.myTable.reLoadTable();
                        var tableInfo = MetaData.mapTableCatalog[that.tableid];
                        tableInfo.currentQuery = that.theQuery.get();
                        Msg.broadcast({ type: 'QueryChanged'}, that.tableid );
                    }
                };

                that.reLoad = function() {
                    var tableInfo = MetaData.mapTableCatalog[that.tableid];

                    if (that.uptodate)
                        return;
                    that.uptodate = true;

                    this.theTableFetcher.resetAll();
                    that.myTable.clearTableColumns();

                    that.myTable.createSelectionColumn("sel", "Sel", tableInfo.id, tableInfo.primkey, tableInfo, DQX.Color(1,0,0), function() {
                        Msg.broadcast({type:'SelectionUpdated'}, tableInfo.id);
                    });


                    that.visibilityControlsGroup.clear();


                    //Create a column for each population frequency
                    $.each(MetaData.customProperties,function(idx,propInfo) {
                        if ((propInfo.tableid == that.tableid) && (propInfo.settings.showInTable)) {
                            var encoding  = 'String';
                            //var encoding  = 'Generic';
                            var tablePart = 1;
                            if (propInfo.datatype=='Value') {
                                encoding  = 'Float3';
                            }
                            if (propInfo.datatype=='Boolean') {
                                encoding  = 'Int';
                            }
                            if (propInfo.isPrimKey)
                                tablePart = 0;
                            var sortable = (!tableInfo.hasGenomePositions) || ( (propInfo.propid!='chrom') && (propInfo.propid!='pos') );
                            var col = that.myTable.createTableColumn(
                                QueryTable.Column(
                                    propInfo.name,propInfo.propid,tablePart),
                                encoding,
                                sortable
                            );
                            if ( (tableInfo.hasGenomePositions) && (that.myTable.findColumn('chrom')) && (that.myTable.findColumn('pos')) ) {
                                that.myTable.addSortOption("Position", SQL.TableSort(['chrom', 'pos']),true); // Define a joint sort action on both columns chrom+pos, and set it as default
                            }

                            if (propInfo.datatype=='Boolean') {
                                col.setDataType_MultipleChoiceInt([{id:0, name:'No'}, {id:1, name:'Yes'}]);
                            }

                            if (propInfo.propid=='chrom') {
                                col.setDataType_MultipleChoiceString(MetaData.chromosomes);
                            }

                            if (propInfo.propCategories) {
                                var cats = [];
                                $.each(propInfo.propCategories, function(idx, cat) {
                                    cats.push({id:cat, name:cat});
                                });
                                col.setDataType_MultipleChoiceString(cats);
                            }

                            //col.setToolTip(pop.name); //Provide a tool tip for the column
                            //Define a callback when the user clicks on a column
                            col.setHeaderClickHandler(function(id) {
                                alert('column clicked '+id);
                            })

                            if (propInfo.isPrimKey) {
                                col.setCellClickHandler(function(fetcher,downloadrownr) {
                                    var itemid=that.panelTable.getTable().getCellValue(downloadrownr,propInfo.propid);
                                    Msg.send({ type: 'ItemPopup' }, { tableid: that.tableid, itemid: itemid } );
                                })
                            }

                            col.CellToText = propInfo.toDisplayString;

                            if (propInfo.isFloat) {
                                col.CellToColor = funcFraction2Color; //Create a background color that reflects the value
                            }
                            if (propInfo.isBoolean) {
                                col.CellToColor = function(vl) { return vl?DQX.Color(0.75,0.85,0.75):DQX.Color(1.0,0.9,0.8); }
                            }

                            var chk = Controls.Check(null,{label:propInfo.name, value:true }).setClassID(propInfo.propid).setOnChanged(function() {
                                col.setVisible(chk.getValue());
                                that.myTable.render();
                            });
                            that.visibilityControlsGroup.addControl(chk);
                        }
                    });

                    that.myTable.reLoadTable();
                }



                that.theQuery.notifyQueryUpdated = that.updateQuery2;
                return that;
            }

        };

        return TableViewerModule;
    });