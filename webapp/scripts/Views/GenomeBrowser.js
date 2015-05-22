// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame",
    "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence", "DQX/ChannelPlot/ChannelAnnotation", "DQX/ChannelPlot/ChannelMultiCatDensity",
    "DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "DQX/DataFetcher/DataFetcherAnnotation",
    "Wizards/EditTableBasedSummaryValues", "MetaData", "Utils/QueryTool", "Views/Genotypes/GenotypeChannel"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame,
              GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, ChannelAnnotation, ChannelMultiCatDensity,
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

                that.serialisableComponents = {};

                Msg.listen('',{ type: 'SelectionUpdated'}, function(scope,tableid) {
                    var tableInfo = MetaData.mapTableCatalog[tableid];
                    if ((tableInfo.hasGenomePositions) || (tableInfo.hasGenomeRegions)) {
                        that.panelBrowser.render();
                    }
                } );

                Msg.listen('',{ type: 'FindGenomeRegion'}, function(scope, settings) {
                    that.genomeRangePopup(settings.chromosome, settings.start, settings.end, settings);
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

                    obj.extraComps = {};
                    $.each(that.serialisableComponents, function(id, comp) {
                        obj.extraComps[id] = comp.storeSettings();
                    });

                    return obj;
                };

                that.recallSettings = function(settObj) {
                    that.recallingSettings = true;
                    that.panelBrowser.recallingSettings = true;
                    if ( (settObj.chromoid) && (that.panelBrowser) ) {
                        that.panelBrowser.setChromosome(settObj.chromoid, true, false);
                        that.panelBrowser.setPosition((settObj.range.max+settObj.range.min)/2, settObj.range.max-settObj.range.min);
                        if (settObj.mark)
                            that.panelBrowser.setMark(settObj.mark.min, settObj.mark.max);
                        else
                            that.panelBrowser.delMark();
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

                    if (settObj.extraComps) {
                        $.each(that.serialisableComponents, function(id, comp) {
                            if (settObj.extraComps[id])
                                comp.recallSettings(settObj.extraComps[id]);
                        });
                    }


                    that.recallingSettings = false;
                    that.panelBrowser.recallingSettings = false;

                    //Initialise all the table based summary values
                    $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                        that.rebuildTableBasedSummaryValues(tableInfo.id);
                    });
                };


                that.fetchers={};


                that.createFrames = function(rootFrame) {
                    this.frameControls = Framework.FrameFinal('', 0.25).setFrameClassClient('GenomeBrowserControlBackground');//Create frame that will contain the controls panel
                    this.frameBrowser = Framework.FrameFinal('', 0.75);//Create frame that will contain the genome browser panel
                    rootFrame.MakeControlsFrame(this.frameControls, this.frameBrowser, 280);

                    Msg.listen("", { type: 'JumpgenomeRegion' }, that.onJumpGenomeRegion);
                    Msg.listen("", { type: 'JumpgenomePosition' }, that.onJumpGenomePosition);

                    Msg.listen("", { type: 'TableBasedSummaryValueSelectionChanged' }, function(scope, params) {
                        that.rebuildTableBasedSummaryValues(params.tableid);
                    });

                }



                that.createPanels = function() {
                    this.panelControls = Framework.Form(this.frameControls);
                    //this.panelControls.setPadding(10);

                    var chromosomeField = null;
                    $.each(MetaData.mapTableCatalog, function(idx, tableInfo) {
                        if (tableInfo.hasGenomePositions) {
                            if (!chromosomeField)
                                chromosomeField = tableInfo.ChromosomeField;
                            else {
                                if (chromosomeField != tableInfo.ChromosomeField)
                                    DQX.reportError('Inconsistent chromosome field column over different datatables: ' + chromosomeField + ', ' + tableInfo.ChromosomeField);
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
                    this.panelBrowser.setMaxXZoomFactor(30.0,2000000);

                    //Define chromosomes
                    $.each(MetaData.chromosomes,function(idx,chromosome) {
                        that.panelBrowser.addChromosome(chromosome.id, chromosome.id, chromosome.len);//provide identifier, name, and size in megabases
                    });

                    this.panelBrowser.getAnnotationFetcher().setFeatureType('gene', 'CDS');
                    this.panelBrowser.getAnnotationChannel().setMinDrawZoomFactX(1.0/99999999);

                    that.panelBrowser.setOnRangeSelected(function() {
                        var range = that.panelBrowser.getMark();
                        if (range)
                            that.genomeRangePopup(that.panelBrowser.getCurrentChromoID(),
                                Math.min(range.min, range. max),
                                Math.max(range.min, range. max),
                                {}
                            );
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

                    that.visibilityControlsGroup = Controls.CompoundVert([]).setMargin(0);

                    //Create controls for each table that has genome summary tracks defined
                    that.buttonsGroup = Controls.CompoundVert([]).setMargin(0);
                    $.each(MetaData.tableCatalog,function(idx,tableInfo) {
                        if (tableInfo.tableBasedSummaryValues.length>0) {
                            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Select active "+tableInfo.tableNamePlural+"...",  width:140, height: 30, icon: 'fa-crosshairs' }).setOnChanged(function() {
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
                            that.buttonsGroup.addControl(Controls.Section(Controls.CompoundVert([
                                bt,
                                tableInfo.genomeBrowserFieldChoice,
                                Controls.CompoundVert(activeTrackList)
                            ]).setMargin(10), {
                                title: tableInfo.tableCapNameSingle+' tracks',
                                headerStyleClass: 'GenomeBrowserMainSectionHeader',
                                bodyStyleClass: 'ControlsSectionBody'
                            }));
                        }
                    });


                    var content = '';
                    content += '<img SRC="Bitmaps/GenomeBrowser.png" style="float:left;margin-right:10px;margin-bottom:5px;opacity:0.7" ></img>';
                    content += '<span class="DescriptionText">'+(MetaData.generalSettings.GenomeBrowserDescr||'Genome browser') + '</span>';

                    that.introText = Controls.Html(null, content);

                    this.panelControls.addControl(Controls.CompoundVert([
                        Controls.Wrapper(that.introText, "ControlsSectionBody"),
                        that.visibilityControlsGroup,
                        that.buttonsGroup
                    ]).setMargin(0));

                    that.reLoad();

                    Msg.listen('', {type:'TableFieldCacheModified'}, function() {
                        that.updateTableBasedSummaryValueHeaders();
                    });

                };




                that.onBecomeVisible = function() {
                    ga('send', 'screenview', {screenName: that._myID});
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
                        if ( (fetcher.minblocksize==minblocksize) && (fetcher.usedChannelCount<12) )
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

                    var controlsList = [];

                    //Iterate over all summary profiles shown by the app ....
                    $.each(MetaData.summaryValues,function(idx,summaryValue) {

                        //Verify if this summary channel corresponds to a datatable property
                        var isTableProperty = false;
                        $.each(MetaData.customProperties,function(idx,propInfo) {
                            if ((propInfo.tableid==summaryValue.tableid) && (propInfo.propid==summaryValue.propid) && (propInfo.settings.showInBrowser))
                                isTableProperty = true;
                        });

                        if (!isTableProperty) {
                            var trackid ='smm'+summaryValue.tableid+'_'+summaryValue.propid;
                            var theFetcher = that.getSummaryFetcher(summaryValue.minblocksize);
                            var channelid=trackid;
                            var folder=that.summaryFolder+'/'+summaryValue.propid;//The server folder where to find the info, relative to the DQXServer base path

                            if (!summaryValue.settings.isCategorical) {
                                var SummChannel = that.channelMap[channelid];
                                if (!SummChannel) {
                                    var SummChannel = ChannelYVals.Channel(channelid, {
                                        minVal: summaryValue.minval,
                                        maxVal: summaryValue.maxval
                                    });//Create the channel
                                    SummChannel
                                      .setTitle(summaryValue.name).setHeight(120, true)
                                      .setChangeYScale(true, true);//makes the scale adjustable by dragging it
                                    SummChannel.controls = Controls.CompoundVert([]);
                                    that.panelBrowser.addChannel(SummChannel);//Add the channel to the browser
                                    that.channelMap[channelid] = SummChannel;
                                }

                                that.listSummaryChannels.push(channelid);

                                var theColor = DQX.parseColorString(summaryValue.settings.channelColor);
                                ;

                                //Create the min-max range
                                var colinfo_min = theFetcher.addFetchColumn(folder, 'Summ', summaryValue.propid + "_min");//get the min value from the fetcher
                                var colinfo_max = theFetcher.addFetchColumn(folder, 'Summ', summaryValue.propid + "_max");//get the max value from the fetcher
                                var comp_minmax = SummChannel.addComponent(ChannelYVals.YRange(null,//Define the range component
                                  theFetcher,               // data fetcher containing the profile information
                                  colinfo_min.myID,                       // fetcher column id for the min value
                                  colinfo_max.myID,                       // fetcher column id for the max value
                                  theColor.changeOpacity(0.25)
                                ), true);

                                //Create the average value profile
                                var colinfo_avg = theFetcher.addFetchColumn(folder, 'Summ', summaryValue.propid + "_avg");//get the avg value from the fetcher
                                var comp_avg = SummChannel.addComponent(ChannelYVals.Comp(null,//Add the profile to the channel
                                  theFetcher,               // data fetcher containing the profile information
                                  colinfo_avg.myID,                        // fetcher column id containing the average profile
                                  false                                    //No high precison
                                ), true);
                                comp_avg.setColor(theColor);//set the color of the profile
                                comp_avg.myPlotHints.makeDrawLines(3000000.0); //that causes the points to be connected with lines
                                comp_avg.myPlotHints.interruptLineAtAbsent = true;
                                comp_avg.myPlotHints.drawPoints = false;//only draw lines, no individual points

                                var ctrl_onoff = SummChannel.createVisibilityControl(!summaryValue.settings.DefaultVisible);
                                controlsList.push(ctrl_onoff);

                            } else {
                                //Categorical track
                                var colinfo = theFetcher.addFetchColumn(folder, 'Summ', summaryValue.propid + "_cats");
                                theFetcher.activateFetchColumn(colinfo.myID);

                                var maxVal = 1.0;
                                if (summaryValue.settings.MaxVal)
                                    maxVal = summaryValue.settings.MaxVal;

                                var SummChannel = that.channelMap[channelid];
                                if (!SummChannel) {
                                    var SummChannel = ChannelMultiCatDensity.Channel(channelid, theFetcher, colinfo, {
                                        maxVal: maxVal,
                                        categoryColors: summaryValue.settings.categoryColors
                                    });
                                    SummChannel
                                      .setTitle(summaryValue.name).setHeight(120, true)
                                      .setChangeYScale(true, true);//makes the scale adjustable by dragging it
                                    SummChannel.controls = Controls.CompoundVert([]);
                                    that.panelBrowser.addChannel(SummChannel);//Add the channel to the browser
                                    that.channelMap[channelid] = SummChannel;
                                }

                                that.listSummaryChannels.push(channelid);
                                
                                var colorMapping = null;
                                if (summaryValue.settings.categoryColors) {
                                    var colorMapping = {};
                                    $.each(summaryValue.settings.categoryColors, function(key, val) {
                                        colorMapping[key] = DQX.parseColorString(val);
                                    });
                                }

                                // Define visibility control & color states
                                var ctrl_onoff = Controls.Check(null, {
                                    label: summaryValue.name,
                                    hint: summaryValue.settings.Description,
                                    value: summaryValue.settings.DefaultVisible
                                }).setClassID('compvisib_'+summaryValue.propid).setOnChanged(function() {
                                    that.panelBrowser.channelModifyVisibility(SummChannel.getID(), ctrl_onoff.getValue());
                                    if (SummChannel.chk_percent)
                                        SummChannel.chk_percent.modifyEnabled(ctrl_onoff.getValue());
                                    if (ctrl_onoff.getValue())
                                        SummChannel.scrollInView();

                                });
                                that.panelBrowser.channelModifyVisibility(SummChannel.getID(), ctrl_onoff.getValue());
                                controlsList.push(ctrl_onoff);

                                if (colorMapping) {
                                    var controlsSubList = [];
                                    if (colorMapping) {
                                        var str = '';
                                        $.each(colorMapping, function (state, col) {
                                            if (state != '_other_') {
                                                if (str)
                                                    str += ' &nbsp; ';
                                                str += '<span style="background-color:{cl}">&nbsp;&nbsp;</span>&nbsp;'.DQXformat({cl: col.toString()}) + state;
                                            }
                                        });
                                        controlsSubList.push(Controls.Html(null, str));
                                    }
                                    if (SummChannel && colorMapping) {
                                        var chk_densPercent = Controls.Check(null, {label: 'Show density as percentage'}).setClassID('denspercent' + summaryValue.propid).setOnChanged(function (id, ctrl) {
                                            SummChannel._scaleRelative = ctrl.getValue();
                                            that.panelBrowser.render();
                                        });
                                        chk_densPercent.modifyEnabled(summaryValue.settings.DefaultVisible);
                                        controlsSubList.push(chk_densPercent);
                                        SummChannel.chk_percent = chk_densPercent;
                                    }
                                    controlsList.push(Controls.CompoundVert(controlsSubList).setTreatAsBlock(true).setLeftIndent(25));
                                }
                            }
                        }
                    });

                    if (controlsList.length>0) {
                        var generalSummaryChannelsControls = Controls.CompoundVert(controlsList).setMargin(10);

                        that.visibilityControlsGroup.addControlTop(Controls.Section(generalSummaryChannelsControls, {
                            title: 'Genome tracks',
                            headerStyleClass: 'GenomeBrowserMainSectionHeader',
                            bodyStyleClass: 'ControlsSectionBody'
                        }));
                    }
                }


                //Map a categorical property to position indicators, color coding a categorical property
                that.createPositionChannel = function(tableInfo, propInfo, controlsGroup, dataFetcher) {
                    var trackid =tableInfo.id+'_'+propInfo.propid;
                    tableInfo.genomeBrowserInfo.currentCustomProperties.push(trackid);
                    var channelDefaultVisible = !!(propInfo.settings.BrowserDefaultVisible);
                    var channelShowOnTop = !!(propInfo.settings.BrowserShowOnTop);
                    if (channelShowOnTop) channelDefaultVisible = true;

                    var densChannel = null;
                    if (MetaData.hasSummaryValue(propInfo.tableid,propInfo.propid)) {
                        // There is a summary value associated to this datatable property, and we add it to this channel
                        var summInfo = MetaData.findSummaryValue(propInfo.tableid,propInfo.propid);
                        summInfo.isDisplayed = true; // Set this flag so that it does not get added twice

                        var theFetcher = new DataFetcherSummary.Fetcher(MetaData.serverUrl,summInfo.minblocksize,800);
                        theFetcher.usedChannelCount = 0;
                        theFetcher.minblocksize=summInfo.minblocksize;
                        that.listDataFetcherProfiles.push(theFetcher);
                        var summFolder = that.summaryFolder+'/'+propInfo.propid;
                        var colinfo = theFetcher.addFetchColumn(summFolder, 'Summ', propInfo.propid + "_cats");
                        theFetcher.activateFetchColumn(colinfo.myID);
                        var denstrackid =tableInfo.id+'_'+propInfo.propid+'_dens';
                        var maxVal = 1.0;
                        if (propInfo.settings.SummaryValues.MaxVal)
                            maxVal = propInfo.settings.SummaryValues.MaxVal;
                        var densChannel = ChannelMultiCatDensity.Channel(denstrackid, theFetcher, colinfo, {
                            maxVal:maxVal,
                            categoryColors: propInfo.settings.categoryColors
                        });
                        var trackH = 120;
                        if (tableInfo.settings.BrowserTrackHeightFactor)
                            trackH = Math.round(trackH*tableInfo.settings.BrowserTrackHeightFactor);
                        densChannel
                            .setTitle(propInfo.name)
                            .setHeight(trackH)
                            .setSubTitle(tableInfo.tableCapNamePlural);
                        that.panelBrowser.addChannel(densChannel, false);
                        that.panelBrowser.channelModifyVisibility(densChannel.getID(), channelDefaultVisible, true);
                    }

                    var positionChannel = ChannelPositions.Channel(trackid,
                        dataFetcher,
                        tableInfo.primkey
                    );
                    if (!channelShowOnTop)
                        var theTitle = propInfo.name + '-' + tableInfo.tableCapNamePlural;
                    else
                        var theTitle = tableInfo.tableCapNamePlural;
                    positionChannel
                        .setTitle(theTitle)
                        .setMaxViewportSizeX(tableInfo.settings.GenomeMaxViewportSizeX);

                    positionChannel.setSelectionStateHandler(tableInfo.isItemSelected);

                    var colorMapping = null;
                    if (propInfo.settings.categoryColors) {
                        var colorMapping = {};
                        $.each(propInfo.settings.categoryColors, function(key, val) {
                            colorMapping[key] = DQX.parseColorString(val);
                        });
                        positionChannel.makeCategoricalColors(
                            propInfo.propid,
                            colorMapping
                        );
                    }
                    else if (propInfo.isBoolean) {
                        positionChannel.makeCategoricalColors(
                            propInfo.propid,
                            { '': DQX.Color(0.85,0.25,0), '0': DQX.Color(0.85,0.25,0), '1': DQX.Color(0.0,0.5,1.0) }
                        );
                    }

                    //Define a custom tooltip
                    positionChannel.setToolTipHandler(function(id, pointIndex)
                    {
                        var posit = dataFetcher.getPosition(pointIndex);
                        var value = dataFetcher.getColumnPoint(pointIndex, propInfo.propid);
                        var str = id+'<br/>Position= '+posit;
                        str += '<br/><b>'+propInfo.name+'= '+propInfo.toDisplayString(value)+'</b>';
                        return str;
                    })
                    //Define a function that will be called when the user clicks a snp
                    positionChannel.setClickHandler(function(id) {
                        Msg.send({ type: 'ItemPopup' }, { tableid:tableInfo.id, itemid:id } );//Send a message that should trigger showing the snp popup
                    })
                    that.panelBrowser.addChannel(positionChannel, channelShowOnTop);//Add the channel to the browser
                    that.panelBrowser.channelModifyVisibility(positionChannel.getID(), channelDefaultVisible, true);

                    if (!channelShowOnTop) {
                        // Define visibility control & color states
                        var ctrl_onoff = Controls.Check(null, {
                            label: propInfo.name,
                            hint: propInfo.settings.Description,
                            value: channelDefaultVisible
                        }).setClassID('compvisib_'+propInfo.propid).setOnChanged(function() {
                            that.panelBrowser.channelModifyVisibility(positionChannel.getID(), ctrl_onoff.getValue());
                            if (densChannel) {
                                that.panelBrowser.channelModifyVisibility(densChannel.getID(), ctrl_onoff.getValue());
                                densChannel.chk_percent.modifyEnabled(ctrl_onoff.getValue());
                                if (ctrl_onoff.getValue())
                                    densChannel.scrollInView();
                            }
                        });
                        controlsGroup.addControl(ctrl_onoff);
                    }

                    if (colorMapping) {
                        var controlsSubList = [];
                        if (colorMapping) {
                            var str = '';
                            $.each(colorMapping, function(state, col) {
                                if (state!='_other_') {
                                    if (str)
                                        str += ' &nbsp; ';
                                    str += '<span style="background-color:{cl}">&nbsp;&nbsp;</span>&nbsp;'.DQXformat({cl: col.toString()}) + state;
                                }
                            });
                            controlsSubList.push(Controls.Html(null, str));
                        }
                        if (densChannel && colorMapping) {
                            chk_densPercent = Controls.Check(null, {label: 'Show density as percentage'}).setClassID('denspercent'+propInfo.propid).setOnChanged(function(id, ctrl) {
                                densChannel._scaleRelative = ctrl.getValue();
                                that.panelBrowser.render();
                            });
                            chk_densPercent.modifyEnabled(channelDefaultVisible);
                            controlsSubList.push(chk_densPercent);
                            densChannel.chk_percent = chk_densPercent;
                        }
                        if (controlsGroup)
                            controlsGroup.addControl(Controls.CompoundVert(controlsSubList).setTreatAsBlock(true).setLeftIndent(25));
                    }

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
                        var trackH = 150;
                        if (tableInfo.settings.BrowserTrackHeightFactor)
                            trackH = Math.round(trackH*tableInfo.settings.BrowserTrackHeightFactor);
                        theChannel
                            .setTitle(channelName)
                            .setSubTitle(tableInfo.tableCapNamePlural)
                            .setHeight(trackH,true)
                            .setChangeYScale(true,true);
                        that.panelBrowser.addChannel(theChannel, false);
                        that.channelMap[channelId] = theChannel;
                        theChannel.controls = Controls.CompoundVert([]);
                        if (propInfo.settings.channelName) {
                            controlsGroup.addControl(Controls.Static(channelName + ':'));
                            theChannel.controls.setTreatAsBlock(true).setLeftIndent(20);
                        }
                        controlsGroup.addControl(theChannel.controls);

                        theChannel.getToolTipContent = function(compID, pointIndex) {
                            var itemid = dataFetcher.getColumnPoint(pointIndex, tableInfo.primkey);
                            var pos = dataFetcher.getPosition(pointIndex);
                            var value = dataFetcher.getColumnPoint(pointIndex, compID);
                            return itemid+'<br/>Position= '+pos+'<br/><b>'+MetaData.findProperty(propInfo.tableid,compID).name+'= '+propInfo.toDisplayString(value)+'</b>';
                        };
                        theChannel.handlePointClicked = function(compID, pointIndex) {
                            var itemid = dataFetcher.getColumnPoint(pointIndex, tableInfo.primkey);
                            Msg.send({ type: 'ItemPopup' }, { tableid:tableInfo.id, itemid:itemid } );//Send a message that should trigger showing the item popup
                        };
                    }

                    var plotcomp = null;
                    if ((true) && (MetaData.hasSummaryValue(propInfo.tableid,propInfo.propid))) {
                        var getOpacity = function() {// function dynamically changes opacity when individual points are visible
                            if (plotcomp) {
                                if ( comp_minmax._drawViewportSize > plotcomp._maxViewportSizeX )
                                    return 1;
                                else
                                    return 0.2;
                            }
                            return 1;
                        };
                        // There is a summary value associated to this datatable property, and we add it to this channel
                        var summInfo = MetaData.findSummaryValue(propInfo.tableid,propInfo.propid);
                        summInfo.isDisplayed = true; // Set this flag so that it does not get added twice
                        var theColor = DQX.parseColorString(summInfo.settings.channelColor);//.lighten(0.5).changeOpacity(0.5);
                        var theFetcher = that.getSummaryFetcher(summInfo.minblocksize);
                        var summFolder = that.summaryFolder+'/'+propInfo.propid;
                        //Create the min-max range
                        var colinfo_min = theFetcher.addFetchColumn(summFolder, 'Summ', propInfo.propid + "_min");
                        var colinfo_max = theFetcher.addFetchColumn(summFolder, 'Summ', propInfo.propid + "_max");
                        var comp_minmax = theChannel.addComponent(ChannelYVals.YRange(null,theFetcher,colinfo_min.myID,colinfo_max.myID,theColor.changeOpacity(0.25)), true );
                        comp_minmax.myPlotHints.getOpacity = getOpacity;
                        //Create the average value profile
                        var colinfo_avg = theFetcher.addFetchColumn(summFolder, 'Summ', propInfo.propid + "_avg");//get the avg value from the fetcher
                        var comp_avg = theChannel.addComponent(ChannelYVals.Comp(null,theFetcher,colinfo_avg.myID,false), true);
                        comp_avg.setColor(theColor);//set the color of the profile
                        comp_avg.myPlotHints.getOpacity = getOpacity;
                        comp_avg.myPlotHints.makeDrawLines(3000000.0); //that causes the points to be connected with lines
                        comp_avg.myPlotHints.interruptLineAtAbsent = true;
                        comp_avg.myPlotHints.drawPoints = false;//only draw lines, no individual points
                    }

                    var highPrecision = false;
                    if (propInfo.datatype == 'HighPrecisionValue')
                        highPrecision = true;
                    plotcomp = theChannel.addComponent(ChannelYVals.Comp(null, dataFetcher, propInfo.propid, highPrecision), true);//Create the component
                    plotcomp.myPlotHints.pointStyle = 1;//chose a sensible way of plotting the points
                    plotcomp.myPlotHints.color = DQX.parseColorString(propInfo.settings.channelColor);
                    plotcomp.setMaxViewportSizeX(tableInfo.settings.GenomeMaxViewportSizeX);
                    if (propInfo.settings.connectLines)
                        plotcomp.myPlotHints.makeDrawLines(1.0e99);
                    var label = propInfo.name;
                    if (!plotcomp.myPlotHints.color.isBlack())
                        label = '&nbsp;<span style="background-color:{cl}">&nbsp;&nbsp;</span>&nbsp;'.DQXformat({cl:plotcomp.myPlotHints.color.toString()}) + label;
                    var channelDefaultVisible = propInfo.settings.BrowserDefaultVisible;
                    if (inSeparateChannel) {
                        var ctrl_onoff = theChannel.createVisibilityControl(!channelDefaultVisible);
                    }
                    else {
                        var ctrl_onoff = theChannel.createComponentVisibilityControl(propInfo.propid, label, false, !channelDefaultVisible);
                    }
                    var ctrl_hint = Controls.ImageButton(null, {bitmap:'Bitmaps/actionbuttons/info.png', vertShift:-2}).setOnChanged(function() {
                        Msg.send({type: 'PropInfoPopup'}, {
                            tableid: tableInfo.id,
                            propid: propInfo.propid
                        });
                    });
                    theChannel.controls.addControl(Controls.CompoundHor([ctrl_onoff, Controls.HorizontalSeparator(8), ctrl_hint]));
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

                    that.createSummaryChannels();


                    // Loop over all datatables that contain genomic positions
                    $.each(MetaData.mapTableCatalog,function(tableid,tableInfo) {
                        if (tableInfo.hasGenomePositions) {
                            if (tableInfo.genomeBrowserInfo.dataFetcher) {//Remove any existing channels
                                $.each(tableInfo.genomeBrowserInfo.currentCustomProperties,function(idx,propid) {
                                    that.panelBrowser.delChannel(propid);
                                });
                                that.panelBrowser.delDataFetcher(tableInfo.genomeBrowserInfo.dataFetcher);
                            }

                            var controlsGroup = Controls.CompoundVert([]).setMargin(0);
                            that.visibilityControlsGroup.addControl(Controls.Section(controlsGroup, {
                                title: tableInfo.tableCapNamePlural,
                                headerStyleClass: 'GenomeBrowserMainSectionHeader'
                            }));

                            tableInfo.genomeBrowserInfo.theQuery = QueryTool.Create(tableInfo.id, {includeCurrentQuery:true});
                            tableInfo.genomeBrowserInfo.theQuery.notifyQueryUpdated = function() {

                                //REMOVE QUERY #308
                                //tableInfo.genomeBrowserInfo.dataFetcher.setUserQuery2(tableInfo.genomeBrowserInfo.theQuery.get());
                                tableInfo.genomeBrowserInfo.dataFetcher.setUserQuery2(SQL.WhereClause.Trivial());

                                that.panelBrowser.render();
                            };
                            var ctrlQuery = tableInfo.genomeBrowserInfo.theQuery.createQueryControl({hasSection: true, hasQueryString: true, defaultHidden: true});

                            //REMOVE QUERY #308
                            //controlsGroup.addControl(ctrlQuery);

                            var channelControlsGroup = Controls.CompoundVert([]).setMargin(0);
                            controlsGroup.addControl(channelControlsGroup);

                            //Initialise the data fetcher that will download the data for the table
                            var dataFetcher = new DataFetchers.Curve(
                                MetaData.serverUrl,
                                MetaData.database,
                                tableInfo.getQueryTableName(false),
                                tableInfo.PositionField
                            );
                            dataFetcher.setMaxViewportSizeX(1.2*tableInfo.settings.GenomeMaxViewportSizeX);
                            dataFetcher.setReportIfError(true);

                            tableInfo.genomeBrowserInfo.dataFetcher = dataFetcher;
                            dataFetcher.addFetchColumnActive(tableInfo.primkey, "String");//add id column to the datafetcher, not plotted but needed for the tooltip & click actions

                            //REMOVE QUERY #308
                            //dataFetcher.setUserQuery2(tableInfo.genomeBrowserInfo.theQuery.get());
                            tableInfo.genomeBrowserInfo.dataFetcher.setUserQuery2(SQL.WhereClause.Trivial());

                            //Loop over all datatable properties, and add those that are declared to be displayed in the genome browser
                            tableInfo.genomeBrowserInfo.currentCustomProperties = [];
                            $.each(tableInfo.propertyGroups, function(idx0, groupInfo) {
                                var groupSection = null;
                                var groupList = null;
                                $.each(groupInfo.properties, function(idx1, propInfo) {
                                    var creatorFunc = null;
                                    if (propInfo.settings.showInBrowser) {
                                        if ((propInfo.tableid==tableInfo.id) && (propInfo.isFloat) )
                                            creatorFunc = that.createPropertyChannel;
                                        if ((propInfo.tableid==tableInfo.id) && ((propInfo.isText)||(propInfo.isBoolean)) )
                                            creatorFunc = that.createPositionChannel;
                                    }
                                    if (creatorFunc) {
                                        if ( (!groupList) && (!propInfo.settings.BrowserShowOnTop) ) {
                                            groupList = Controls.CompoundVert([]).setMargin(5);
                                            groupSection = Controls.Section(groupList, {
                                                title: groupInfo.Name,
                                                headerStyleClass: 'DQXControlSectionHeader',
                                                bodyStyleClass: 'ControlsSectionBodySubSection'
                                            });
                                            channelControlsGroup.addControl(groupSection);
                                        }
                                        creatorFunc(tableInfo, propInfo, groupList, dataFetcher);
                                    }
                                })
                            });
                        }

                    });

                    // Loop over all datatables that contain genomic regions
                    $.each(MetaData.mapTableCatalog,function(tableid,tableInfo) {
                        if (tableInfo.hasGenomeRegions) {

                            var controlsGroup = Controls.CompoundVert([]).setMargin(0);
                            that.visibilityControlsGroup.addControl(Controls.Section(controlsGroup, {
                                title: tableInfo.tableCapNamePlural,
                                headerStyleClass: 'GenomeBrowserMainSectionHeader'
                            }));

                            tableInfo.genomeBrowserInfo.theQuery = QueryTool.Create(tableInfo.id, {includeCurrentQuery:true});
                            tableInfo.genomeBrowserInfo.theQuery.notifyQueryUpdated = function() {
                                tableInfo.genomeBrowserInfo.dataFetcher.setUserQuery2(tableInfo.genomeBrowserInfo.theQuery.get());
                                that.panelBrowser.render();
                            };
                            var ctrlQuery = tableInfo.genomeBrowserInfo.theQuery.createQueryControl({hasSection: true, hasQueryString: true, defaultHidden: true});
                            controlsGroup.addControl(ctrlQuery);

                            states = [{id:'', name:'-None-'}];
                            $.each(MetaData.customProperties, function(idx, propInfo) {
                                if (propInfo.tableid == tableInfo.id)
                                    states.push({id: propInfo.propid, name: propInfo.name});
                            });

                            tableInfo.genomeBrowserInfo.defaultRegionFieldName = tableInfo.primkey;
                            if (tableInfo.settings.BrowserDefaultLabel) {
                                if (tableInfo.settings.BrowserDefaultLabel == 'None')
                                    tableInfo.genomeBrowserInfo.defaultRegionFieldName = '';
                                else
                                    tableInfo.genomeBrowserInfo.defaultRegionFieldName = tableInfo.settings.BrowserDefaultLabel;
                            }

                            tableInfo.genomeBrowserFieldChoice = Controls.Combo(null,{label:'Label: ', states: states, value:tableInfo.genomeBrowserInfo.defaultRegionFieldName})
                                .setClassID('region_name_'+tableInfo.id);
                            tableInfo.genomeBrowserFieldChoice.setOnChanged(function() {
                                tableInfo.genomeBrowserInfo.dataFetcher.field_name = tableInfo.genomeBrowserFieldChoice.getValue();
                                tableInfo.genomeBrowserInfo.dataFetcher.clearData();
                                that.panelBrowser.render();
                            });

                            tableInfo.genomeBrowserColorChoice = Controls.Combo(null,{label:'Color: ', states: states, value:''}).setClassID('region_color_'+tableInfo.id);
                            tableInfo.genomeBrowserColorChoice.setOnChanged(function() {
                                tableInfo.genomeBrowserInfo.dataFetcher.extrafield1 = tableInfo.genomeBrowserColorChoice.getValue();
                                if (!tableInfo.genomeBrowserInfo.dataFetcher.extrafield1) {
                                    tableInfo.genomeBrowserColorLegend.modifyValue('');
                                }
                                tableInfo.genomeBrowserInfo.dataFetcher.clearData();
                                tableInfo.genomeBrowserInfo.regionChannel.funcMapExtraField2Color = function(lst) {
                                    var propInfo = MetaData.findProperty(tableInfo.id, tableInfo.genomeBrowserInfo.dataFetcher.extrafield1);
                                    var rs = propInfo.mapColors(lst);
                                    var indices = rs.indices;
                                    var colorsidx = rs.colors;
                                    var colors = [];
                                    for (var regidx=0; regidx<indices.length; regidx++) {
                                        colors.push(colorsidx[indices[regidx]]);
                                    }
                                    var legendStr = '';
                                    $.each(rs.legend,function(idx, legendItem) {
                                        if (legendStr)
                                            legendStr += ' &nbsp; ';
                                        legendStr+='<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}'.DQXformat({cl:legendItem.color.toString(), name:legendItem.state});
                                    });
                                    tableInfo.genomeBrowserColorLegend.modifyValue(legendStr);

                                    return colors;
                                }
                                that.panelBrowser.render();
                            });

                            tableInfo.genomeBrowserColorLegend = Controls.Html(null, "");

                            dispSettingsControlsGroup = Controls.CompoundVert([]).setMargin(8);


                            controlsGroup.addControl(Controls.Section(dispSettingsControlsGroup, {
                                title: 'Display settings',
                                bodyStyleClass: 'ControlsSectionBody'
                            }));

                            var regionConfig = {
                                database: MetaData.database,
                                serverURL: MetaData.serverUrl,
                                annotTableName: tableInfo.getQueryTableName(false)
                            };
                            var regionFetcher = new DataFetcherAnnotation.Fetcher(regionConfig);
                            tableInfo.genomeBrowserInfo.dataFetcher = regionFetcher;
                            regionFetcher.setFeatureType('','')
                            regionFetcher.field_start = tableInfo.settings.RegionStart;
                            regionFetcher.field_stop = tableInfo.settings.RegionStop;
                            regionFetcher.field_chrom = tableInfo.settings.Chromosome;
                            regionFetcher.field_id = tableInfo.primkey;
                            regionFetcher.field_name = tableInfo.genomeBrowserInfo.defaultRegionFieldName;
                            regionFetcher.fetchSubFeatures = false;
                            that.panelBrowser.addDataFetcher(regionFetcher);
                            var regionChannel = ChannelAnnotation.Channel('regions_'+tableInfo.id, regionFetcher);
                            var trackH = 60;
                            if (tableInfo.settings.BrowserTrackHeightFactor)
                                trackH = Math.round(trackH*tableInfo.settings.BrowserTrackHeightFactor);
                            regionChannel.setHeight(trackH);
                            regionChannel.setTitle(tableInfo.tableCapNamePlural);
                            regionChannel.setMaxViewportSizeX(tableInfo.settings.GenomeMaxViewportSizeX);
                            regionChannel.setMinDrawZoomFactX(1.0/99999999);
                            that.panelBrowser.addChannel(regionChannel, false);
                            regionChannel.handleFeatureClicked = function (itemid) {
                                Msg.send({ type: 'ItemPopup' }, { tableid: tableInfo.id, itemid: itemid } );
                            };
                            tableInfo.genomeBrowserInfo.regionChannel = regionChannel;

                            var ctrl_onoff = regionChannel.createVisibilityControl(!tableInfo.settings.BrowserDefaultVisible, 'Display');
                            dispSettingsControlsGroup.addControl(ctrl_onoff);
                            dispSettingsControlsGroup.addControl(tableInfo.genomeBrowserFieldChoice);
                            dispSettingsControlsGroup.addControl(tableInfo.genomeBrowserColorChoice);
                            dispSettingsControlsGroup.addControl(tableInfo.genomeBrowserColorLegend);

                        }

                    });

                    // Loop over all 2D data tables that have genotypes to show
                    // TODO - Could be for all that have genomic columns
                    $.each(MetaData.map2DTableCatalog,function(tableid,table_info) {
                        if (!table_info.settings.ShowInGenomeBrowser) {
                            return;
                        }
                        var controls_group = Controls.CompoundVert([]).setMargin(0);
                        that.visibilityControlsGroup.addControl(Controls.Section(controls_group, {
                            title: table_info.tableCapNamePlural,
                            headerStyleClass: 'GenomeBrowserMainSectionHeader'
                        }));

                        var the_channel = GenotypeChannel.Channel(table_info, controls_group, that.panelBrowser);
                        the_channel.setMaxViewportSizeX(table_info.settings.GenomeMaxViewportSizeX);
                        that.panelBrowser.addChannel(the_channel, false);//Add the channel to the browser
                        that.serialisableComponents['genotypes_'+tableid] = the_channel;
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
                                .setTitle(channelid).setHeight(Math.round(50*that.panelBrowser.variableHeightFactor), true)
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
                        return that.panelBrowser.findChannelRequired(channelid);
                    };




                    // For a specific datatable, (re)builds all the tracks that correspond to that datatable records
                    that.rebuildTableBasedSummaryValues = function(tableid) {
                        if (that.recallingSettings)
                            return;
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
                        var selectedList = tableInfo.genomeTrackSelectionManager.getSelectedList();
                        var firstNewChannel = null;
                        $.each(selectedList, function(idx, recordid) {
                            $.each(tableInfo.tableBasedSummaryValues, function(idx2, summaryValue) {
                                if (summaryValue.isVisible) {
                                    if (!presentMap[summaryValue.trackid+'_'+recordid]) {
                                        var channel = that.tableBasedSummaryValue_Add(tableid, summaryValue.trackid, recordid);
                                        if (!firstNewChannel)
                                            firstNewChannel = channel;
                                    }
                                }
                            });
                        });
                        if (firstNewChannel)
                            firstNewChannel.scrollInView();

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


                    that.formatBpValue = function(value) {
                        var valtxt = value.toFixed(0);
                        valtxt = valtxt.split("").reverse().join("");
                        var valtxt2 = [];
                        for (var sp = 0; sp<valtxt.length; sp++) {
                            if ((sp>0) && (sp%3 == 0))
                                valtxt2.push(",");
                            valtxt2.push(valtxt[sp]);
                        }
                        valtxt = valtxt2.reverse().join("");
                        return valtxt;
                    }

                    that.genomeRangePopup = function(chromosome, rangeMin, rangeMax, settings) {
                        var content = '';
                        var hasButtons  = false;
                        var regionString = chromosome + ':' + parseInt(rangeMin) + '-' + parseInt(rangeMax);

                        var grd = Controls.CompoundGrid();
                        grd.setSeparation(12,2);
                        grd.setItem(0,0,Controls.Static('Chromosome'));
                        grd.setItem(0,1,Controls.Static(chromosome));
                        grd.setItem(1,0,Controls.Static('Begin'));
                        grd.setItem(1,1,Controls.Static(that.formatBpValue(rangeMin)+' bp'));
                        grd.setItem(2,0,Controls.Static('End'));
                        grd.setItem(2,1,Controls.Static(that.formatBpValue(rangeMax)+' bp'));
                        grd.setItem(3,0,Controls.Static('Length'));
                        grd.setItem(3,1,Controls.Static(that.formatBpValue(rangeMax-rangeMin + 1)+' bp'));
                        content += '<p>' + regionString + "<p>";
                        content += grd.renderHtml();
                        content += "<p>";



                        if (settings && settings.buttonShowRegion) {
                            var bt = Controls.Button(null, {
                                buttonClass: 'DQXToolButton2',
                                content: 'Show in genome browser',
                                bitmap: 'Bitmaps/GenomeBrowserSmall.png',
                                width:160, height:50
                            }).setOnChanged(function() {
                                    Popup.closeIfNeeded(popupid);
                                    PopupFrame.minimiseAll({ slow: true});
                                    Msg.send({ type: 'JumpgenomeRegion' }, {
                                        chromoID: chromosome,
                                        start: rangeMin,
                                        end: rangeMax
                                    });
                                });
                            content += bt.renderHtml();
                        }

                        $.each(MetaData.mapTableCatalog, function(idx, tableInfo) {

                            if (tableInfo.hasGenomePositions) {
                                hasButtons = true;
                                var qry = tableInfo.genomeBrowserInfo.theQuery.get();
                                qry = SQL.WhereClause.createValueRestriction(qry, tableInfo.ChromosomeField, chromosome);
                                qry = SQL.WhereClause.createRangeRestriction(qry, tableInfo.PositionField, rangeMin, rangeMax);

                                var bt = Controls.Button(null, {
                                    buttonClass: 'DQXToolButton2',
                                    content: tableInfo.tableCapNamePlural+' in range',
                                    icon: tableInfo.settings.Icon?tableInfo.settings.Icon:'fa-table',
                                    width:160, height:50
                                }).setOnChanged(function() {
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

                                var bt = Controls.Button(null, {
                                    buttonClass: 'DQXToolButton2',
                                    content: tableInfo.tableCapNamePlural+' spanning range',
                                    icon: tableInfo.settings.Icon?tableInfo.settings.Icon:'fa-table',
                                    width:160, height:50
                                }).setOnChanged(function() {
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

                        var popupid = Popup.create('Genome region', content);
                    };



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
