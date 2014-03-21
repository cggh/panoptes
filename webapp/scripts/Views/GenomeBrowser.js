define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup",
    "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence", "DQX/ChannelPlot/ChannelAnnotation",
    "DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "DQX/DataFetcher/DataFetcherAnnotation",
    "Wizards/EditTableBasedSummaryValues", "MetaData", "Utils/QueryTool", "Views/Genotypes/Components/GenotypeChannel"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup,
              GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, ChannelAnnotation,
              DataFetchers, DataFetcherSummary, DataFetcherAnnotation,
              EditTableBasedSummaryValues, MetaData, QueryTool, GenotypeChannel
        ) {

        var GenomeBrowserModule = {

            init: function () {
                // Instantiate the view object
                var that = Application.View(
                    'genomebrowser',    // View ID
                    'Genome browser'    // View title
                );
                that.setEarlyInitialisation();

                Msg.listen('',{ type: 'SelectionUpdated'}, function(scope,tableid) {
                    if ((MetaData.mapTableCatalog[tableid].hasGenomePositions) || (MetaData.mapTableCatalog[tableid].hasGenomeRegions)) {
                        that.panelBrowser.render();
                    }
                } );


                that.storeSettings = function() {
                    var obj= {};
                    if (that.panelBrowser) {
                        obj.chromoid = that.panelBrowser.getCurrentChromoID();
                        obj.range = that.panelBrowser.getVisibleRange();
                        var markInfo = that.panelBrowser.getMark();
                        if (markInfo)
                            obj.mark = markInfo;
                        obj.settings = Controls.storeSettings(that.visibilityControlsGroup);
                        obj.settingsButtons = Controls.storeSettings(that.buttonsGroup);
                    }
                    obj.datatables = {};
                    $.each(MetaData.mapTableCatalog,function(tableid,tableInfo) {
                        if (tableInfo.hasGenomePositions || tableInfo.hasGenomeRegions) {
                            var tableSett = {};
                            tableSett.query = SQL.WhereClause.encode(tableInfo.genomeBrowserInfo.theQuery.get());
                            obj.datatables[tableid] = tableSett;
                        }
                    });
                    return obj;
                };

                that.recallSettings = function(settObj) {
                    if ( (settObj.chromoid) && (that.panelBrowser) ) {
                        that.panelBrowser.setChromosome(settObj.chromoid, true, false);
                        that.panelBrowser.setPosition((settObj.range.max+settObj.range.min)/2, settObj.range.max-settObj.range.min);
                        if (settObj.mark)
                            that.panelBrowser.setMark(settObj.mark.min, settObj.mark.max);
                    }
                    if ((settObj.settings) && (that.visibilityControlsGroup) )
                        Controls.recallSettings(that.visibilityControlsGroup, settObj.settings, false);

                    if ((settObj.settingsButtons) && (that.buttonsGroup) )
                        Controls.recallSettings(that.buttonsGroup, settObj.settingsButtons, false);

                    if (settObj.datatables) {
                        $.each(MetaData.mapTableCatalog,function(tableid,tableInfo) {
                            if (tableInfo.hasGenomePositions || tableInfo.hasGenomeRegions) {
                                if (settObj.datatables[tableid]) {
                                    tableSett = settObj.datatables[tableid];
                                    if (tableSett.query) {
                                        var qry = SQL.WhereClause.decode(tableSett.query);
                                        tableInfo.genomeBrowserInfo.theQuery.modify(qry);
                                    }
                                }
                            }
                        });
                    }

                    //Initialise all the table based summary values
                    $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                        that.rebuildTableBasedSummaryValues(tableInfo.id);
                    });
                };


                that.fetchers={};


                that.createFrames = function(rootFrame) {
                    rootFrame.makeGroupHor();
                    this.frameControls = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.3)).setFrameClassClient('GenomeBrowserControlBackground');//Create frame that will contain the controls panel
                    this.frameBrowser = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.7));//Create frame that will contain the genome browser panel

                    Msg.listen("", { type: 'JumpgenomeRegion' }, that.onJumpGenomeRegion);
                    Msg.listen("", { type: 'JumpgenomePosition' }, that.onJumpGenomePosition);

                    Msg.listen("", { type: 'TableBasedSummaryValueSelectionChanged' }, function(scope, params) {
                        that.rebuildTableBasedSummaryValues(params.tableid);
                    });

                }



                that.createPanels = function() {
                    this.panelControls = Framework.Form(this.frameControls);
                    this.panelControls.setPadding(10);

                    var chromosomeField = null;
                    $.each(MetaData.mapTableCatalog, function(idx, tableInfo) {
                        if (tableInfo.hasGenomePositions) {
                            if (!chromosomeField)
                                chromosomeField = tableInfo.ChromosomeField;
                            else {
                                if (chromosomeField != tableInfo.ChromosomeField)
                                    DQX.reportError('Inconsistent chromosome field column over different datasets: ' + chromosomeField + ', ' + tableInfo.ChromosomeField);
                            }
                        }
                    });
                    if (!chromosomeField)
                        chromosomeField = 'chrom';

                    //Browser configuration settings
                    var browserConfig = {
                        serverURL: MetaData.serverUrl,              //Url of the DQXServer instance used
                        database: MetaData.database,                //Database name
                        annotTableName: MetaData.tableAnnotation,   //Name of the table containing the annotation
                        chromoIdField: chromosomeField,
                        viewID: '',
                        canZoomVert: true                           //Viewer contains buttons to alter the vertical size of the channels
                    };

                    //Initialise a genome browser panel
                    this.panelBrowser = GenomePlotter.Panel(this.frameBrowser, browserConfig);
                    this.panelBrowser.setMaxXZoomFactor(4.0,6000);

                    //Define chromosomes
                    $.each(MetaData.chromosomes,function(idx,chromosome) {
                        that.panelBrowser.addChromosome(chromosome.id, chromosome.id, chromosome.len);//provide identifier, name, and size in megabases
                    });

                    this.panelBrowser.getAnnotationFetcher().setFeatureType('gene', 'CDS');
                    this.panelBrowser.getAnnotationChannel().setMinDrawZoomFactX(1.0/99999999);

                    that.panelBrowser.setOnRangeSelected(function() {
                        var range = that.panelBrowser.getMark();
                        that.genomeRangePopup(that.panelBrowser.getCurrentChromoID(), range.min, range. max);
                    });


                    if (MetaData.generalSettings.AnnotMaxViewportSize)
                        this.panelBrowser.getAnnotationChannel().setMaxViewportSizeX(MetaData.generalSettings.AnnotMaxViewportSize);

                    //Define the action when a user clicks on a gene in the annotation channel
                    this.panelBrowser.getAnnotationChannel().handleFeatureClicked = function (geneID) {
                        Msg.send({type:'GenePopup'}, geneID);
                    }

                    if (MetaData.generalSettings.RefSequenceSumm) {
                        SeqChannel = ChannelSequence.Channel(MetaData.serverUrl, 'SummaryTracks/' + MetaData.database+'/Sequence', 'Summ');
                        this.panelBrowser.addChannel(SeqChannel, true);

                    }

                    that.visibilityControlsGroup = Controls.CompoundVert([]);

                    //Create controls for each table that has genome summary tracks defined
                    that.buttonsGroup = Controls.CompoundVert([]);
                    $.each(MetaData.tableCatalog,function(idx,tableInfo) {
                        if (tableInfo.tableBasedSummaryValues.length>0) {
                            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Select active "+tableInfo.tableNamePlural+"...",  width:140 }).setOnChanged(function() {
                                EditTableBasedSummaryValues.prompt(tableInfo.id);
                            });
                            states = [];
                            $.each(tableInfo.quickFindFields, function(idx, propid) {
                                states.push({id: propid, name: MetaData.findProperty(tableInfo.id,propid).name});
                            });
                            tableInfo.genomeBrowserFieldChoice = Controls.Combo(null,{label:'Label: ', states: states}).setClassID('genometrack_displayedfields_'+tableInfo.id);
                            tableInfo.genomeBrowserFieldChoice.setOnChanged(function() {
                                that.updateTableBasedSummaryValueHeaders();
                            });
                            var activeTrackList = [];
                            $.each(tableInfo.tableBasedSummaryValues, function(idx, summaryValue) {
                                var chk = Controls.Check(null, {label:summaryValue.trackname, value:summaryValue.settings.defaultVisible}).setClassID('trackactive_'+tableInfo.id+'_'+summaryValue.trackid).setOnChanged(function() {
                                    tableInfo.mapTableBasedSummaryValues[chk.trackid].isVisible = chk.getValue();
                                    that.rebuildTableBasedSummaryValues(tableInfo.id);
                                });
                                chk.trackid = summaryValue.trackid;
                                activeTrackList.push(chk);
                            });
                            that.buttonsGroup.addControl(Controls.CompoundVert([
                                bt,
                                tableInfo.genomeBrowserFieldChoice,
                                Controls.CompoundVert(activeTrackList)
                            ]).setLegend('<h3>'+tableInfo.tableCapNameSingle+' tracks</h3>')).setLegendClass('GenomeBrowserControlGroup');
                        }
                    });


                    this.panelControls.addControl(Controls.CompoundVert([
                        that.visibilityControlsGroup,
                        Controls.VerticalSeparator(12),
                        that.buttonsGroup
                    ]));

                    that.reLoad();

                    Msg.listen('', {type:'TableFieldCacheModified'}, function() {
                        that.updateTableBasedSummaryValueHeaders();
                    });

                };




                that.onBecomeVisible = function() {
                    if (that.visibilityControlsGroup)
                        that.reLoad();
                }


                //Call this function to jump to & highlight a specific region on the genome
                // need args.chromoID, args.start, args.end
                that.onJumpGenomeRegion = function (context, args) {
                    if ('chromoID' in args)
                        var chromoID = args.chromoID;
                    else {
                        DQX.assertPresence(args, 'chromNr');
                        var chromoID = that.panelBrowser.getChromoID(args.chromNr);
                    }
                    DQX.assertPresence(args, 'start'); DQX.assertPresence(args, 'end');
                    that.activateState();
                    that.panelBrowser.highlightRegion(chromoID, (args.start + args.end) / 2, args.end - args.start);
                };

                //Call this function to jump to & highlight a specific position on the genome
                // need args.chromoID, args.position
                that.onJumpGenomePosition = function (context, args) {
                    if ('chromoID' in args)
                        var chromoID = args.chromoID;
                    else {
                        DQX.assertPresence(args, 'chromNr');
                        var chromoID = that.panelBrowser.getChromoID(args.chromNr);
                    }
                    DQX.assertPresence(args, 'position');
                    that.activateState();
                    that.panelBrowser.highlightRegion(chromoID, args.position, 0);
                };


                // Returns a summary fetcher compatible with a track with a given minimum block size
                // For efficiency, fetchers automatically pool tracks up to a given maximum count
                that.getSummaryFetcher =function(minblocksize) {
                    //Try to find suitable existing fetcher
                    var theFetcher = null;
                    $.each(that.listDataFetcherProfiles,function(idx,fetcher) {
                        if ( (fetcher.minblocksize==minblocksize) && (fetcher.usedChannelCount<30) )
                            theFetcher = fetcher;
                    });
                    if (!theFetcher) {
                        theFetcher = new DataFetcherSummary.Fetcher(MetaData.serverUrl,minblocksize,800);
                        theFetcher.usedChannelCount = 0;
                        theFetcher.minblocksize=minblocksize;
                        that.listDataFetcherProfiles.push(theFetcher);
                    }
                    theFetcher.usedChannelCount++;
                    return theFetcher;
                }

                //Creates channels in the browser that displaying various summary properties
                that.createSummaryChannels = function() {

                    if (MetaData.summaryValues.length==0)
                        return;

                    that.visibilityControlsGroup.addControl(Controls.VerticalSeparator(10));

                    //Iterate over all summary profiles shown by the app
                    $.each(MetaData.summaryValues,function(idx,summaryValue) {
                        if (!summaryValue.isDisplayed) {//Notr: this flag is set if that summary value was associated with a datatable property
                            var trackid ='smm'+summaryValue.tableid+'_'+summaryValue.propid;
                            var theFetcher = that.getSummaryFetcher(summaryValue.minblocksize);
                            var channelid=trackid;
                            var folder=that.summaryFolder+'/'+summaryValue.propid;//The server folder where to find the info, relative to the DQXServer base path

                            var SummChannel = that.channelMap[channelid];
                            if (!SummChannel) {
                                var SummChannel = ChannelYVals.Channel(channelid, { minVal: summaryValue.minval, maxVal: summaryValue.maxval });//Create the channel
                                SummChannel
                                    .setTitle(summaryValue.name).setHeight(120, true)
                                    .setChangeYScale(true,true);//makes the scale adjustable by dragging it
                                SummChannel.controls = Controls.CompoundVert([]);
                                that.panelBrowser.addChannel(SummChannel);//Add the channel to the browser
                                that.channelMap[channelid] = SummChannel;
                            }

                            that.listSummaryChannels.push(channelid);

                            var theColor = DQX.parseColorString(summaryValue.settings.channelColor);;

                            //Create the min-max range
                            var colinfo_min = theFetcher.addFetchColumn(folder, 'Summ', summaryValue.propid + "_min");//get the min value from the fetcher
                            var colinfo_max = theFetcher.addFetchColumn(folder, 'Summ', summaryValue.propid + "_max");//get the max value from the fetcher
                            var comp_minmax = SummChannel.addComponent(ChannelYVals.YRange(null,//Define the range component
                                theFetcher,               // data fetcher containing the profile information
                                colinfo_min.myID,                       // fetcher column id for the min value
                                colinfo_max.myID,                       // fetcher column id for the max value
                                theColor.changeOpacity(0.25)
                            ), true );

                            //Create the average value profile
                            var colinfo_avg = theFetcher.addFetchColumn(folder, 'Summ', summaryValue.propid + "_avg");//get the avg value from the fetcher
                            var comp_avg = SummChannel.addComponent(ChannelYVals.Comp(null,//Add the profile to the channel
                                theFetcher,               // data fetcher containing the profile information
                                colinfo_avg.myID                        // fetcher column id containing the average profile
                            ), true);
                            comp_avg.setColor(theColor);//set the color of the profile
                            comp_avg.myPlotHints.makeDrawLines(3000000.0); //that causes the points to be connected with lines
                            comp_avg.myPlotHints.interruptLineAtAbsent = true;
                            comp_avg.myPlotHints.drawPoints = false;//only draw lines, no individual points

                            var ctrl_onoff = SummChannel.createVisibilityControl(true);
                            that.visibilityControlsGroup.addControl(ctrl_onoff);

                        }
                    })

                }


                //Map a categorical property to position indicators, color coding a categorical property
                that.createPositionChannel = function(tableInfo, propInfo, controlsGroup, dataFetcher) {
                    var trackid =tableInfo.id+'_'+propInfo.propid;
                    tableInfo.genomeBrowserInfo.currentCustomProperties.push(trackid);
                    var theChannel = ChannelPositions.Channel(trackid,
                        dataFetcher,
                        tableInfo.primkey
                    );
                    theChannel
                        .setTitle(propInfo.name + '-' + tableInfo.tableCapNamePlural)
                        .setMaxViewportSizeX(tableInfo.settings.GenomeMaxViewportSizeX);

                    theChannel.setSelectionStateHandler(tableInfo.isItemSelected);

                    if (propInfo.settings.categoryColors) {
                        var mapping = {};
                        $.each(propInfo.settings.categoryColors, function(key, val) {
                            mapping[key] = DQX.parseColorString(val);
                        });
                        theChannel.makeCategoricalColors(
                            propInfo.propid,
                            mapping
                        );
                    }
                    else if (propInfo.isBoolean) {
                        theChannel.makeCategoricalColors(
                            propInfo.propid,
                            { '0': DQX.Color(1,0.75,0.5), '1': DQX.Color(0,0.5,0.5) }
                        );
                    }

                    //Define a custom tooltip
                    theChannel.setToolTipHandler(function(id) { return id; })
                    //Define a function that will be called when the user clicks a snp
                    theChannel.setClickHandler(function(id) {
                        Msg.send({ type: 'ItemPopup' }, { tableid:tableInfo.id, itemid:id } );//Send a message that should trigger showing the snp popup
                    })
                    that.panelBrowser.addChannel(theChannel, false);//Add the channel to the browser
                }

                //Map a numerical property
                that.createPropertyChannel = function(tableInfo, propInfo, controlsGroup, dataFetcher) {
                    var trackid =tableInfo.id+'_'+propInfo.propid;
                    tableInfo.genomeBrowserInfo.currentCustomProperties.push(trackid);
                    if (propInfo.settings.channelName) { // Channel specified -> add to this channel
                        var channelId = propInfo.settings.channelName;
                        var channelName = propInfo.settings.channelName;
                        var inSeparateChannel = false;
                    } else { // No channel specified -> auto create new one
                        var channelId = trackid;
                        var channelName = propInfo.name;
                        var inSeparateChannel = true;
                    }

                    var theChannel = that.channelMap[channelId];
                    if (!theChannel) { // Channel does not yet exist -> create
                        theChannel = ChannelYVals.Channel(trackid,
                            { minVal: propInfo.settings.minval, maxVal: propInfo.settings.maxval } // range
                        );
                        theChannel
                            .setTitle(channelName)
                            .setHeight(150,true)
                            .setChangeYScale(true,true);
                        that.panelBrowser.addChannel(theChannel, false);
                        that.channelMap[channelId] = theChannel;
                        theChannel.controls = Controls.CompoundVert([]);
                        if (propInfo.settings.channelName)
                            theChannel.controls.setLegend(channelName).setAutoFillX(false);
                        controlsGroup.addControl(theChannel.controls);

                        theChannel.getToolTipContent = function(compID, pointIndex) {
                            var itemid = dataFetcher.getColumnPoint(pointIndex, tableInfo.primkey);
                            var pos = dataFetcher.getPosition(pointIndex);
                            var value = dataFetcher.getColumnPoint(pointIndex, compID);
                            return itemid+'<br/>Position= '+pos+'<br/>'+MetaData.findProperty(propInfo.tableid,compID).name+'= '+value.toFixed(4);
                        };
                        theChannel.handlePointClicked = function(compID, pointIndex) {
                            var itemid = dataFetcher.getColumnPoint(pointIndex, tableInfo.primkey);
                            Msg.send({ type: 'ItemPopup' }, { tableid:tableInfo.id, itemid:itemid } );//Send a message that should trigger showing the item popup
                        };
                    }

                    if ((true) && (MetaData.hasSummaryValue(propInfo.tableid,propInfo.propid))) {
                        // There is a summary value associated to this datatable property, and we add it to this channel
                        var summInfo = MetaData.findSummaryValue(propInfo.tableid,propInfo.propid);
                        summInfo.isDisplayed = true; // Set this flag so that it does not get added twice
                        var theColor = DQX.parseColorString(summInfo.settings.channelColor);;
                        var theFetcher = that.getSummaryFetcher(summInfo.minblocksize);
                        var summFolder = that.summaryFolder+'/'+propInfo.propid;
                        //Create the min-max range
                        var colinfo_min = theFetcher.addFetchColumn(summFolder, 'Summ', propInfo.propid + "_min");
                        var colinfo_max = theFetcher.addFetchColumn(summFolder, 'Summ', propInfo.propid + "_max");
                        var comp_minmax = theChannel.addComponent(ChannelYVals.YRange(null,theFetcher,colinfo_min.myID,colinfo_max.myID,theColor.changeOpacity(0.25)), true );
                        //Create the average value profile
                        var colinfo_avg = theFetcher.addFetchColumn(summFolder, 'Summ', propInfo.propid + "_avg");//get the avg value from the fetcher
                        var comp_avg = theChannel.addComponent(ChannelYVals.Comp(null,theFetcher,colinfo_avg.myID), true);
                        comp_avg.setColor(theColor);//set the color of the profile
                        comp_avg.myPlotHints.makeDrawLines(3000000.0); //that causes the points to be connected with lines
                        comp_avg.myPlotHints.interruptLineAtAbsent = true;
                        comp_avg.myPlotHints.drawPoints = false;//only draw lines, no individual points
                    }

                    var plotcomp = theChannel.addComponent(ChannelYVals.Comp(null, dataFetcher, propInfo.propid), true);//Create the component
                    plotcomp.myPlotHints.pointStyle = 1;//chose a sensible way of plotting the points
                    plotcomp.myPlotHints.color = DQX.parseColorString(propInfo.settings.channelColor);
                    plotcomp.setMaxViewportSizeX(tableInfo.settings.GenomeMaxViewportSizeX);
                    if (propInfo.settings.connectLines)
                        plotcomp.myPlotHints.makeDrawLines(1.0e99);
                    var label = propInfo.name;
                    if (!plotcomp.myPlotHints.color.isBlack())
                        label = '&nbsp;<span style="background-color:{cl}">&nbsp;&nbsp;</span>&nbsp;'.DQXformat({cl:plotcomp.myPlotHints.color.toString()}) + label;
                    if (inSeparateChannel) {
                        var ctrl_onoff = theChannel.createVisibilityControl(true);
                    }
                    else {
                        var ctrl_onoff = theChannel.createComponentVisibilityControl(propInfo.propid, label, false, true);
                    }
                    theChannel.controls.addControl(ctrl_onoff);
                }


                that.reLoad = function() {
                    if (that.uptodate)
                        return;
                    that.uptodate = true;

                    if (that.visibilityControlsGroup)
                        that.visibilityControlsGroup.clear();

                    that.channelMap = {};

                    if (that.listDataFetcherProfiles) {
                        $.each(that.listDataFetcherProfiles, function(idx,fetcher) {
                            that.panelBrowser.delDataFetcher(fetcher);
                        });
                    }

                    if (that.listSummaryChannels) {
                        $.each(that.listSummaryChannels, function(idx, channelid) {
                            that.panelBrowser.delChannel(channelid);
                        })
                    }

                    that.listDataFetcherProfiles = [];
                    that.listSummaryChannels = [];

                    that.summaryFolder = 'SummaryTracks/' + MetaData.database;

                    // Loop over all datatables that contain genomic positions
                    $.each(MetaData.mapTableCatalog,function(tableid,tableInfo) {
                        if (tableInfo.hasGenomePositions) {
                            if (tableInfo.genomeBrowserInfo.dataFetcher) {//Remove any existing channels
                                $.each(tableInfo.genomeBrowserInfo.currentCustomProperties,function(idx,propid) {
                                    that.panelBrowser.delChannel(propid);
                                });
                                that.panelBrowser.delDataFetcher(tableInfo.genomeBrowserInfo.dataFetcher);
                            }

                            var controlsGroup = Controls.CompoundVert([]).setLegend('<h3>'+tableInfo.tableCapNamePlural+'</h3>').setLegendClass('GenomeBrowserControlGroup');
                            that.visibilityControlsGroup.addControl(controlsGroup);

                            tableInfo.genomeBrowserInfo.theQuery = QueryTool.Create(tableInfo.id, {includeCurrentQuery:true});
                            tableInfo.genomeBrowserInfo.theQuery.notifyQueryUpdated = function() {
                                tableInfo.genomeBrowserInfo.dataFetcher.setUserQuery2(tableInfo.genomeBrowserInfo.theQuery.get());
                                that.panelBrowser.render();
                            };
                            var ctrlQuery = tableInfo.genomeBrowserInfo.theQuery.createControl();
                            controlsGroup.addControl(ctrlQuery);
                            controlsGroup.addControl(Controls.VerticalSeparator(12));

                            //Initialise the data fetcher that will download the data for the table
                            var dataFetcher = new DataFetchers.Curve(
                                MetaData.serverUrl,
                                MetaData.database,
                                tableInfo.id + 'CMB_' + MetaData.workspaceid,
                                tableInfo.PositionField
                            );
                            dataFetcher.setMaxViewportSizeX(tableInfo.settings.GenomeMaxViewportSizeX);

                            tableInfo.genomeBrowserInfo.dataFetcher = dataFetcher;
                            dataFetcher.addFetchColumnActive(tableInfo.primkey, "String");//add id column to the datafetcher, not plotted but needed for the tooltip & click actions

                            dataFetcher.setUserQuery2(tableInfo.genomeBrowserInfo.theQuery.get());

                            //Loop over all datatable properties, and add those that are declared to be displayed in the genome browser
                            tableInfo.genomeBrowserInfo.currentCustomProperties = [];
                            $.each(MetaData.customProperties,function(idx,propInfo) {
                                if ((propInfo.tableid==tableInfo.id) && (propInfo.isFloat) && (propInfo.settings.showInBrowser)) {
                                    that.createPropertyChannel(tableInfo, propInfo, controlsGroup, dataFetcher);
                                }
                                if ((propInfo.tableid==tableInfo.id) && ((propInfo.isText)||(propInfo.isBoolean)) && (propInfo.settings.showInBrowser)) {
                                    that.createPositionChannel(tableInfo, propInfo, controlsGroup, dataFetcher);
                                }
                            });
                        }

                    });

                    // Loop over all 2D data tables that have genotypes to show
                    // TODO - Could be for all that have genomic columns
                    $.each(MetaData.map2DTableCatalog,function(tableid,table_info) {
                        if (!table_info.settings.ShowInGenomeBrowser) {
                            return;
                        }
                        var controls_group = Controls.CompoundVert([]).setLegend('<h3>'+table_info.tableCapNamePlural+'</h3>').setLegendClass('GenomeBrowserControlGroup');
                        that.visibilityControlsGroup.addControl(controls_group);
                        var the_channel = GenotypeChannel.Channel(table_info, controls_group, that.panelBrowser);
                        the_channel.setMaxViewportSizeX(table_info.settings.GenomeMaxViewportSizeX);
                        that.panelBrowser.addChannel(the_channel, false);//Add the channel to the browser
                    });

                    // Loop over all datatables that contain genomic regions
                    $.each(MetaData.mapTableCatalog,function(tableid,tableInfo) {
                        if (tableInfo.hasGenomeRegions) {

                            var controlsGroup = Controls.CompoundVert([]).setLegend('<h3>'+tableInfo.tableCapNamePlural+'</h3>').setLegendClass('GenomeBrowserControlGroup');
                            that.visibilityControlsGroup.addControl(Controls.VerticalSeparator(12));
                            that.visibilityControlsGroup.addControl(controlsGroup);

                            tableInfo.genomeBrowserInfo.theQuery = QueryTool.Create(tableInfo.id, {includeCurrentQuery:true});
                            tableInfo.genomeBrowserInfo.theQuery.notifyQueryUpdated = function() {
                                tableInfo.genomeBrowserInfo.dataFetcher.setUserQuery2(tableInfo.genomeBrowserInfo.theQuery.get());
                                that.panelBrowser.render();
                            };
                            var ctrlQuery = tableInfo.genomeBrowserInfo.theQuery.createControl();
                            controlsGroup.addControl(ctrlQuery);

                            states = [];
                            $.each(MetaData.customProperties, function(idx, propInfo) {
                                if (propInfo.tableid == tableInfo.id)
                                    states.push({id: propInfo.propid, name: propInfo.name});
                            });
                            tableInfo.genomeBrowserFieldChoice = Controls.Combo(null,{label:'Label: ', states: states, value:tableInfo.primkey}).setClassID('genometrack_displayedfields_'+tableInfo.id);
                            tableInfo.genomeBrowserFieldChoice.setOnChanged(function() {
                                tableInfo.genomeBrowserInfo.dataFetcher.field_name = tableInfo.genomeBrowserFieldChoice.getValue();
                                tableInfo.genomeBrowserInfo.dataFetcher.clearData();
                                that.panelBrowser.render();
                            });

                            controlsGroup.addControl(Controls.VerticalSeparator(12));
                            controlsGroup.addControl(tableInfo.genomeBrowserFieldChoice);

                            //Create the repeats channel
                            var regionConfig = {
                                database: MetaData.database,
                                serverURL: MetaData.serverUrl,
                                annotTableName: tableInfo.id + 'CMB_' + MetaData.workspaceid
                            };
                            var regionFetcher = new DataFetcherAnnotation.Fetcher(regionConfig);
                            tableInfo.genomeBrowserInfo.dataFetcher = regionFetcher;
                            regionFetcher.setFeatureType('','')
                            regionFetcher.field_start = tableInfo.settings.RegionStart;
                            regionFetcher.field_stop = tableInfo.settings.RegionStop;
                            regionFetcher.field_chrom = tableInfo.settings.Chromosome;
                            regionFetcher.field_id = tableInfo.primkey;
                            regionFetcher.field_name = tableInfo.primkey;
                            regionFetcher.fetchSubFeatures = false;
                            that.panelBrowser.addDataFetcher(regionFetcher);
                            regionChannel = ChannelAnnotation.Channel('regions_'+tableInfo.id, regionFetcher);
                            regionChannel.setHeight(60);
                            regionChannel.setTitle(tableInfo.tableCapNamePlural);
                            regionChannel.setMaxViewportSizeX(tableInfo.settings.GenomeMaxViewportSizeX);
                            regionChannel.setMinDrawZoomFactX(1.0/99999999);
                            that.panelBrowser.addChannel(regionChannel, false);
                            regionChannel.handleFeatureClicked = function (itemid) {
                                Msg.send({ type: 'ItemPopup' }, { tableid: tableInfo.id, itemid: itemid } );
                            };


                        }

                    });



                    that.tableBasedSummaryValue_Add = function(tableid, trackid, recordid) {
                        var summaryValue = MetaData.getTableInfo(tableid).mapTableBasedSummaryValues[trackid];
                        var channelid=trackid+'_'+recordid;
                        if (that.panelBrowser.findChannel(channelid)) {
                            //Already exists - simply make visible
                            that.panelBrowser.findChannelRequired(channelid).modifyVisibility(true, true);
                        }
                        else {
                            //Does not exist - create
                            var theFetcher = that.getSummaryFetcher(summaryValue.minblocksize);

                            var folder=that.summaryFolder+'/TableTracks/'+tableid+'/'+trackid+'/'+recordid;

                            var SummChannel = ChannelYVals.Channel(channelid, { minVal: summaryValue.minval, maxVal: summaryValue.maxval });//Create the channel
                            SummChannel
                                .setTitle(channelid).setHeight(120, true)
                                .setChangeYScale(true,true);//makes the scale adjustable by dragging it
                            SummChannel.controls = Controls.CompoundVert([]);
                            SummChannel.fromTable_tableid = tableid;
                            SummChannel.fromTable_trackid = trackid;
                            SummChannel.fromTable_trackid = trackid;
                            SummChannel.fromTable_recordid = recordid;
                            SummChannel.setSubTitle(summaryValue.trackname);
                            SummChannel.setOnClickHandler(function() {
                                Msg.send({ type: 'ItemPopup' }, { tableid: tableid, itemid: recordid } );
                            });

                            that.panelBrowser.addChannel(SummChannel);//Add the channel to the browser
                            that.channelMap[channelid] = SummChannel;

                            var theColor = DQX.parseColorString(summaryValue.settings.channelColor);;

                            //Create the min-max range
                            var colinfo_min = theFetcher.addFetchColumn(folder, 'Summ', channelid + "_min");//get the min value from the fetcher
                            var colinfo_max = theFetcher.addFetchColumn(folder, 'Summ', channelid + "_max");//get the max value from the fetcher
                            var comp_minmax = SummChannel.addComponent(ChannelYVals.YRange(null,//Define the range component
                                theFetcher,               // data fetcher containing the profile information
                                colinfo_min.myID,                       // fetcher column id for the min value
                                colinfo_max.myID,                       // fetcher column id for the max value
                                theColor.changeOpacity(0.25)
                            ), true );

                            //Create the average value profile
                            var colinfo_avg = theFetcher.addFetchColumn(folder, 'Summ', channelid + "_avg");//get the avg value from the fetcher
                            var comp_avg = SummChannel.addComponent(ChannelYVals.Comp(null,//Add the profile to the channel
                                theFetcher,               // data fetcher containing the profile information
                                colinfo_avg.myID                        // fetcher column id containing the average profile
                            ), true);
                            comp_avg.setColor(theColor);//set the color of the profile
                            comp_avg.myPlotHints.makeDrawLines(3000000.0); //that causes the points to be connected with lines
                            comp_avg.myPlotHints.interruptLineAtAbsent = true;
                            comp_avg.myPlotHints.drawPoints = false;//only draw lines, no individual points
                        }
                    };

                    // For a specific datatable, (re)builds all the tracks that correspond to that datatable records
                    that.rebuildTableBasedSummaryValues = function(tableid) {
                        var tableInfo=MetaData.getTableInfo(tableid);

                        //remove tracks that are not visible anymore
                        var presentMap = {};
                        var toDeleteList = [];
                        $.each(that.panelBrowser.getChannelList(), function(idx, channel) {
                            if (channel.fromTable_tableid==tableid) {
                                if (channel.getVisible()) {
                                    if ( (!tableInfo.mapTableBasedSummaryValues[channel.fromTable_trackid].isVisible) ||
                                         (!tableInfo.genomeTrackSelectionManager.isItemSelected(channel.fromTable_recordid)) ) {
                                        channel.modifyVisibility(false, true);
                                        toDeleteList.push(channel.getID());
                                    }
                                }
                                presentMap[channel.fromTable_trackid+'_'+channel.fromTable_recordid]=channel.getVisible();
                            }
                        });
                        $.each(toDeleteList, function(idx,channelid) {
                            that.panelBrowser.delChannel(channelid);
                        });

                        //Add new tracks
                        $.each(tableInfo.genomeTrackSelectionManager.getSelectedList(), function(idx, recordid) {
                            $.each(tableInfo.tableBasedSummaryValues, function(idx2, summaryValue) {
                                if (summaryValue.isVisible) {
                                    if (!presentMap[summaryValue.trackid+'_'+recordid])
                                        that.tableBasedSummaryValue_Add(tableid, summaryValue.trackid, recordid);
                                }
                            });
                        });

                        //!!! todo: automatically sort the tablesummary tracks according to a meaningful criterion

                        that.panelBrowser.handleResize();
                        that.updateTableBasedSummaryValueHeaders();
                    };

                    // Updates the header information for datatable-related genome tracks
                    that.updateTableBasedSummaryValueHeaders = function() {
                        $.each(that.panelBrowser.getChannelList(), function(idx,channel) {
                             if (channel.fromTable_tableid) {
                                 var tableInfo = MetaData.getTableInfo(channel.fromTable_tableid);
                                 var activePropID = tableInfo.genomeBrowserFieldChoice.getValue();//obtain the property id that is currently used to create the header line
                                 var value = tableInfo.fieldCache.getField(channel.fromTable_recordid, activePropID);
                                 channel.setTitle(value);
                                 var tooltip = '';
                                 $.each(tableInfo.quickFindFields, function(idx, propid) {
                                     tooltip += '<b>'+MetaData.findProperty(tableInfo.id,propid).name+': </b>';
                                     tooltip += tableInfo.fieldCache.getField(channel.fromTable_recordid, propid);
                                     tooltip += '<br/>';
                                 });

                                 channel.setHeaderTooltip(tooltip);
                             }
                        });
                        that.panelBrowser.render();
                    }

                    that.genomeRangePopup = function(chromosome, rangeMin, rangeMax) {
                        var content = '';
                        var hasButtons  = false;
                        var regionString = chromosome + ':' + parseInt(rangeMin) + '-' + parseInt(rangeMax);
                        $.each(MetaData.mapTableCatalog, function(idx, tableInfo) {

                            if (tableInfo.hasGenomePositions) {
                                hasButtons = true;
                                var qry = tableInfo.genomeBrowserInfo.theQuery.get();
                                qry = SQL.WhereClause.createValueRestriction(qry, tableInfo.ChromosomeField, chromosome);
                                qry = SQL.WhereClause.createRangeRestriction(qry, tableInfo.PositionField, rangeMin, rangeMax);

                                var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: tableInfo.tableCapNamePlural+' in range', bitmap:'Bitmaps/datagrid2.png', width:160, height:50 }).setOnChanged(function() {
                                    Msg.send({type: 'DataItemTablePopup'}, {
                                        tableid: tableInfo.id,
                                        query: qry,
                                        title: tableInfo.tableCapNamePlural + ' in ' + regionString
                                    });
                                    Popup.closeIfNeeded(popupid);
                                });
                                content += bt.renderHtml();
                            }

                            if (tableInfo.hasGenomeRegions) {
                                hasButtons = true;
                                var qry = tableInfo.genomeBrowserInfo.theQuery.get();
                                qry = SQL.WhereClause.createValueRestriction(qry, tableInfo.settings.Chromosome, chromosome);
                                qry = SQL.WhereClause.createValueRestriction(qry, tableInfo.settings.RegionStart, rangeMax, '<=');
                                qry = SQL.WhereClause.createValueRestriction(qry, tableInfo.settings.RegionStop, rangeMin, '>=');

                                var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: tableInfo.tableCapNamePlural+' spanning range', bitmap:'Bitmaps/datagrid2.png', width:160, height:50 }).setOnChanged(function() {
                                    Msg.send({type: 'DataItemTablePopup'}, {
                                        tableid: tableInfo.id,
                                        query: qry,
                                        title: tableInfo.tableCapNamePlural + ' spanning ' + regionString
                                    });
                                    Popup.closeIfNeeded(popupid);
                                });
                                content += bt.renderHtml();
                            }

                        });

                        if (hasButtons) {
                            var popupid = Popup.create('Genome region '+regionString, content);

                        }
                    };


                    that.createSummaryChannels();

                    this.panelControls.render();

                    that.panelBrowser.handleResize();
                    //if (MetaData.chromosomes.length>0)
                    that.panelBrowser.setChromosome(MetaData.chromosomes[0].id,true,true);

                }




                return that;
            }

        };

        return GenomeBrowserModule;
    });