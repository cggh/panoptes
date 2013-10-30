define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/SQL", "DQX/QueryTable", "DQX/QueryBuilder", "DQX/DataFetcher/DataFetchers", "MetaData", "Plots/ItemScatterPlot", "Plots/BarGraph", "Plots/Histogram", "Wizards/EditQuery"],
    function (require, Application, Framework, Controls, Msg, DocEl, DQX, SQL, QueryTable, QueryBuilder, DataFetchers, MetaData, ItemScatterPlot, BarGraph, Histogram, EditQuery) {

        //A helper function, turning a fraction into a 3 digit text string
        var createFuncVal2Text = function(digits) {
            return function(vl) {
                if (vl==null)
                    return '-';
                else
                    return parseFloat(vl).toFixed(digits);
            }
        }

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

                Msg.listen('',{ type: 'SelectionUpdated'}, function(scope,tableid) {
                    if (that.tableid==tableid) {
                        if (that.myTable)
                            that.myTable.render();
                    }
                } );

                if (tableid == 'SNP') {
                    Msg.listen('',{type: 'ShowSNPsInRange'}, function(scope, info) {
                        that.activateState();
                        var qry= SQL.WhereClause.AND([
                            SQL.WhereClause.CompareFixed('chrom','=',info.chrom),
                            SQL.WhereClause.CompareFixed('pos','>=',info.start),
                            SQL.WhereClause.CompareFixed('pos','<=',info.stop)
                            ]);
                        that.updateQuery(qry);
                    });

                }


                //This function is called during the initialisation. Create the frame structure of the view here
                that.createFrames = function(rootFrame) {
                    rootFrame.makeGroupHor();//Declare the root frame as a horizontally divided set of subframes
                    //this.frameQueriesContainer = rootFrame.addMemberFrame(Framework.FrameGroupVert('', 0.4));//Create frame that will contain the query panels
                    this.frameControls = rootFrame.addMemberFrame(Framework.FrameFinal('',0.4)).setFixedSize(Framework.dimX,200)
                    this.frameTable = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.6))//Create frame that will contain the table viewer
                        .setAllowScrollBars(false,true);
                }



                //This function is called during the initialisation. Create the panels that will populate the frames here
                that.createPanels = function() {

                    MetaData.mapTableCatalog[that.tableid].tableViewer = that;

                    //Initialise the data fetcher that will download the data for the table
                    this.theTableFetcher = DataFetchers.Table(
                        MetaData.serverUrl,
                        MetaData.database,
                        that.tableid + 'CMB_' + MetaData.workspaceid
                    );
                    this.theTableFetcher.showDownload=true; //Allows the user to download the data in the table

                    this.createPanelTableViewer();


                    this.reLoad();

                    // Create the "simple query" panel
                    this.createPanelControls();

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
                    that.ctrlQueryString = Controls.Html(null,'');
                    var queryButton = Controls.Button(null, { content: 'Define query...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: DQX.BMP('filter1.png') });
                    queryButton .setOnChanged(function() {
                        var tableInfo = MetaData.mapTableCatalog[that.tableid];
                        EditQuery.CreateDialogBox(tableInfo.id, tableInfo.currentQuery, function(query) {
                            that.updateQuery(query);
                        });
                    })

                    var cmdHistogram = Controls.Button(null, { content: 'Histogram...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                    cmdHistogram.setOnChanged(function() {
                        Histogram.Create(that.tableid);
                    });

                    var cmdBarGraph = Controls.Button(null, { content: 'Bar graph...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                    cmdBarGraph.setOnChanged(function() {
                        BarGraph.Create(that.tableid);
                    });

                    var cmdScatterPlot = Controls.Button(null, { content: 'Scatter plot...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                    cmdScatterPlot.setOnChanged(function() {
                        ItemScatterPlot.Create(that.tableid);
                    });

                    this.panelSimpleQuery.addControl(Controls.CompoundVert([
                        queryButton,
                        that.ctrlQueryString,
                        Controls.VerticalSeparator(15),
                        cmdHistogram,
                        cmdBarGraph,
                        cmdScatterPlot
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
                }


                that.updateQuery = function(qry) {
                    that.myTable.setQuery(qry);
                    that.myTable.reLoadTable();
                    var tableInfo = MetaData.mapTableCatalog[that.tableid];
                    tableInfo.currentQuery = qry;
                    Msg.broadcast({ type: 'QueryChanged'}, that.tableid );
                    that.ctrlQueryString.modifyValue(that.getQueryDescription(qry));
                }

                that.reLoad = function() {
                    var tableInfo = MetaData.mapTableCatalog[that.tableid];

                    if (that.uptodate)
                        return;
                    that.uptodate = true;

                    this.theTableFetcher.resetAll();
                    that.myTable.clearTableColumns();

                    that.myTable.createSelectionColumn(tableInfo.id, tableInfo.primkey, tableInfo);



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
                        }
                    });

                    //we start by defining a query that returns everything
                    that.myTable.queryAll();

                }



                return that;
            }

        };

        return TableViewerModule;
    });