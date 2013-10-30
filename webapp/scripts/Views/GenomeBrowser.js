define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData) {

        var GenomeBrowserModule = {

            init: function () {
                // Instantiate the view object
                var that = Application.View(
                    'genomebrowser',    // View ID
                    'Genome browser'    // View title
                );

                that.fetchers={};


                //This function is called during the initialisation. Create the frame structure of the view here
                that.createFrames = function(rootFrame) {
                    that.filterByQuery = false;
                    rootFrame.makeGroupHor();//Declare the root frame as a horizontally divided set of subframes
                    this.frameControls = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.3));//Create frame that will contain the controls panel
                    this.frameBrowser = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.7));//Create frame that will contain the genome browser panel

                    Msg.listen("", { type: 'JumpgenomeRegion' }, that.onJumpGenomeRegion);
                    Msg.listen("", { type: 'JumpgenomePosition' }, that.onJumpGenomePosition);

                    Msg.listen("", {type: 'QueryChanged'}, function(scope, tableid) {
                        var tableInfo = MetaData.mapTableCatalog[tableid];
                        if (tableInfo.hasGenomePositions) {
                            if ( (tableInfo.genomeBrowserInfo.dataFetcher) && (tableInfo.genomeBrowserInfo.filterByQuery) )
                                tableInfo.genomeBrowserInfo.dataFetcher.setUserQuery2(tableInfo.currentQuery);
                        }
                    });

                }



                //This function is called during the initialisation. Create the panels that will populate the frames here
                that.createPanels = function() {
                    this.panelControls = Framework.Form(this.frameControls);//This panel will contain controls for switching on/off channels on the genome browser
                    this.panelControls.setPadding(10);

                    this.createPanelBrowser();

                };


                //Create the genome browser panel
                that.createPanelBrowser = function() {
                    //Browser configuration settings
                    var browserConfig = {
                        serverURL: MetaData.serverUrl,              //Url of the DQXServer instance used
                        database: MetaData.database,                //Database name
                        annotTableName: MetaData.tableAnnotation,   //Name of the table containing the annotation
                        chromoIdField: 'chrom',                      //Specifies that chromosomes are identifier by *numbers* in the field 'chrom'
                                                                    //*NOTE*: chromosome identifiers can be used by specifying chromoIdField: 'chromid'
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

                    if (MetaData.generalSettings.AnnotMaxViewportSize)
                        this.panelBrowser.getAnnotationChannel().setMaxViewportSizeX(MetaData.generalSettings.AnnotMaxViewportSize*1.0E6);

                    //Define the action when a user clicks on a gene in the annotation channel
                    this.panelBrowser.getAnnotationChannel().handleFeatureClicked = function (geneID) {
                        Msg.send({type:'GenePopup'}, geneID);
                    }

                    if (MetaData.generalSettings.RefSequenceSumm=='Yes') {
                        SeqChannel = ChannelSequence.Channel(MetaData.serverUrl, 'SummaryTracks/' + MetaData.database+'/Sequence', 'Summ');
                        this.panelBrowser.addChannel(SeqChannel, true);

                    }

                    var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Show visible variants in table",  width:120, height:30 }).setOnChanged(function() {
                        var chromoid = that.panelBrowser.getCurrentChromoID();
                        var range = that.panelBrowser.getVisibleRange();
                        Msg.send({type: 'ShowSNPsInRange'}, { chrom:chromoid, start:range.min, stop:range.max });
                    });

                    that.visibilityControlsGroup = Controls.CompoundVert([]);
                    this.panelControls.addControl(Controls.CompoundVert([
                        bt,
                        that.visibilityControlsGroup
                    ]));


                    that.createSnpPositionChannel();

                    that.reLoad();

                };


                that.onBecomeVisible = function() {
                    that.reLoad();
                }



                //Call this function to jump to & highlight a specific region on the genome
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

                //Call this function to jump to & highlight a specific region on the genome
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



                //Creates a channel that shows the SNP positions
                that.createSnpPositionChannel = function() {

                    that.dataFetcherSNPs = new DataFetchers.Curve(
                        MetaData.serverUrl,
                        MetaData.database,
                        'SNP'
                    );

                    var tableInfo = MetaData.mapTableCatalog['SNP'];

                    var theChannel = ChannelPositions.Channel(null,
                        that.dataFetcherSNPs,   // The datafetcher containing the positions of the snps
                        'snpid'                 // Name of the column containing a unique identifier for each snp
                    );
                    theChannel
                        .setTitle("SNP positions")
                        .setMaxViewportSizeX(tableInfo.settings.GenomeMaxViewportSizeX);


                    if (MetaData.hasProperty('SNP','MutType')) {
                        theChannel.makeCategoricalColors(//Assign a different color to silent/nonsilent snps
                            'MutType',               // Name of the column containing a categorical string value that determines the color of the snp
                            { 'S' :  DQX.Color(1,1,0) , 'N' : DQX.Color(1,0.4,0) }   //Map of value-color pairs
                        );
                    }


                    //Define a custom tooltip
                    theChannel.setToolTipHandler(function(snpid) {
                        return 'SNP: '+snpid;
                    })
                    //Define a function tht will be called when the user clicks a snp
                    theChannel.setClickHandler(function(snpid) {
                        Msg.send({ type: 'ItemPopup' }, { tableid:'SNP', itemid:snpid } );//Send a message that should trigger showing the snp popup
                    })
                    that.panelBrowser.addChannel(theChannel, false);//Add the channel to the browser
                }


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


                    //Iterate over all summary profiles shown by the app
                    $.each(MetaData.summaryValues,function(idx,summaryValue) {
                        if (!summaryValue.isDisplayed) {
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


                that.createPropertyChannel = function(tableInfo, propInfo, controlsGroup, dataFetcher) {
                    var trackid =tableInfo.id+'_'+propInfo.propid;
                    tableInfo.genomeBrowserInfo.currentCustomProperties.push(trackid);
                    //Create the channel in the browser that will contain the frequency values
                    var channelId = propInfo.settings.channelName;
                    var channelName = propInfo.settings.channelName;
                    var inSeparateChannel = false;
                    if (!channelId) {
                        channelId = trackid;
                        channelName = propInfo.name;
                        inSeparateChannel = true;
                    }
                    var theChannel = that.channelMap[channelId];
                    if (!theChannel) {
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

                    if ((inSeparateChannel) && (MetaData.hasSummaryValue(propInfo.tableid,propInfo.propid))) {
                        var summInfo = MetaData.findSummaryValue(propInfo.tableid,propInfo.propid);
                        summInfo.isDisplayed = true;
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


                    $.each(MetaData.mapTableCatalog,function(tableid,tableInfo) {
                        if (tableInfo.hasGenomePositions) {
                            if (tableInfo.genomeBrowserInfo.dataFetcher) {//Remove any existing channels
                                $.each(tableInfo.genomeBrowserInfo.currentCustomProperties,function(idx,propid) {
                                    that.panelBrowser.delChannel(propid);
                                });
                                that.panelBrowser.delDataFetcher(tableInfo.genomeBrowserInfo.dataFetcher);
                            }

                            var controlsGroup = Controls.CompoundVert([]).setLegend('<h3>'+tableInfo.name+'</h3>');
                            that.visibilityControlsGroup.addControl(controlsGroup);


                            var ctrl_filtertype = Controls.Combo('', { label:'Filter method: ', states:[{id:'all', name:'All'}, {id:'query', name:'Currently query'}], value:'all'}).setOnChanged(function() {
                                tableInfo.genomeBrowserInfo.filterByQuery = (ctrl_filtertype.getValue()=='query');
                                if (tableInfo.genomeBrowserInfo.filterByQuery)
                                    tableInfo.genomeBrowserInfo.dataFetcher.setUserQuery2(tableInfo.currentQuery);
                                else
                                    tableInfo.genomeBrowserInfo.dataFetcher.setUserQuery2(null);
                                that.panelBrowser.render();
                            });
                            controlsGroup.addControl(ctrl_filtertype);
                            controlsGroup.addControl(Controls.VerticalSeparator(12));


                            //Initialise the data fetcher that will download the data for the table
                            var dataFetcher = new DataFetchers.Curve(
                                MetaData.serverUrl,
                                MetaData.database,
                                tableInfo.id + 'CMB_' + MetaData.workspaceid
                            );
                            dataFetcher.setMaxViewportSizeX(tableInfo.settings.GenomeMaxViewportSizeX);

                            tableInfo.genomeBrowserInfo.dataFetcher = dataFetcher;

                            //add id column to the datafetcher, not plotted but needed for the tooltip & click actions
                            dataFetcher.addFetchColumnActive(tableInfo.primkey, "String");

                            if (tableInfo.genomeBrowserInfo.filterByQuery)
                                dataFetcher.setUserQuery2(tableInfo.currentQuery);

                            tableInfo.genomeBrowserInfo.currentCustomProperties = [];
                            $.each(MetaData.customProperties,function(idx,propInfo) {
                                if ((propInfo.tableid==tableInfo.id) && (propInfo.isFloat) && (propInfo.settings.showInBrowser)) {
                                    that.createPropertyChannel(tableInfo, propInfo, controlsGroup, dataFetcher);
                                }
                            });
                        }

                    });

                    that.createSummaryChannels();



                    this.panelControls.render();

                    that.panelBrowser.handleResize();
                    that.panelBrowser.setChromosome(MetaData.chromosomes[0].id,true,true);

                }




                return that;
            }

        };

        return GenomeBrowserModule;
    });