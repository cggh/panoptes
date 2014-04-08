define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/Popup", "DQX/DocEl", "DQX/Utils", "DQX/FrameTree", "DQX/FrameList", "DQX/DataFetcher/DataFetchers", "DQX/SQL", "MetaData", "Wizards/UploadProperties"],
    function (require, Application, Framework, Controls, Msg, Popup, DocEl, DQX, FrameTree, FrameList, DataFetchers, SQL, MetaData, UploadProperties) {

        ////////////// Utilities for async server communication in case of lengthy operations



        var IntroModule = {

            init: function () {
                // Instantiate the view object
                var that = Application.View(
                    'start',        // View ID
                    'Start page'    // View title
                );

                //This function is called during the initialisation. Create the frame structure of the view here
                that.createFrames = function(rootFrame) {
                    rootFrame.makeGroupHor();
                    rootFrame.setSeparatorSize(5);

                    this.frameButtons2 = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.45));
                    this.frameButtons = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.55))/*.setFixedSize(Framework.dimX, 400)*/;
                    this.frameButtons.setMargins(0);
                    this.frameButtons2.setMargins(15);
                    //this.frameCalculations = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.5)).setDisplayTitle("Server calculations");
                }

                // This function is called during the initialisation. Create the panels that will populate the frames here
                that.createPanels = function() {
                    this.panelButtons = Framework.Form(this.frameButtons);
                    this.panelButtons.setPadding(0);
                    this.panelButtons2 = Framework.Form(this.frameButtons2);
                    this.panelButtons2.setPadding(10);

                    //this.panelChannels = FrameTree.Tree(this.frameChannels);
                    //that.updateChannelInfo();

                    var miscButtonList = [];

                    if (MetaData.generalSettings.hasGenomeBrowser) {
                        var browserButton = Application.getView('genomebrowser').createActivationButton({
                            content: "Genome browser",
                            bitmap: 'Bitmaps/GenomeBrowser.png'
                        });
                        miscButtonList.push(browserButton);
                    }

                    var tableButtons = [];
                    $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                        var tableViewerButton = Application.getView('table_'+tableInfo.id).createActivationButton({
                            content: "Show table",
                            bitmap: 'Bitmaps/datagrid2.png'
                        });

                        var button_Showplots = Controls.Button(null, {content: 'Create plot...', buttonClass: 'DQXToolButton2', width:120, height:50, bitmap:'Bitmaps/chart.png'}).setOnChanged(function() {
                            Msg.send({type: 'CreateDataItemPlot'}, { query: null , tableid: tableInfo.id });
                        });

                        var descr = tableInfo.settings.Description||'<i>No description</i>';
                        if ((tableInfo.relationsChildOf.length>0) || (tableInfo.relationsParentOf.length>0)) {
                            descr += '<br><br><div style="color:rgb(128,128,128);margin-left:15px"><b>Relations:</b>'
                            $.each(tableInfo.relationsChildOf, function(idx, relationInfo) {
                                descr += '<br>A ' + tableInfo.tableNameSingle + ' <i>' + relationInfo.forwardname+'</i> a '+MetaData.mapTableCatalog[relationInfo.parenttableid].tableNameSingle;
                            });
                            $.each(tableInfo.relationsParentOf, function(idx, relationInfo) {
                                descr += '<br>A ' + tableInfo.tableNameSingle + ' <i>' + relationInfo.reversename+'</i> '+MetaData.mapTableCatalog[relationInfo.childtableid].tableNamePlural;
                            });
                            descr += '</div>';
                        }
                        var info = Controls.Static(descr);
                        var grp = Controls.CompoundHor([
                            info,
                            Controls.AlignRight(Controls.CompoundHor([tableViewerButton, button_Showplots]))
                        ]);;
                        tableButtons.push(Controls.Section(grp, {
                            title: tableInfo.tableCapNamePlural,
                            headerStyleClass: 'GenomeBrowserMainSectionHeader',
                            bodyStyleClass: 'ControlsSectionBodyIntro',
                            canCollapse: false
                        }));
                    })

//                    var bt_addprops = Controls.Button(null, { content: 'Upload custom properties...', width:120, height:40 });
//                    bt_addprops.setOnChanged(function() {
//                        UploadProperties.execute(function() {});
//                    })
//                    miscButtonList.push(bt_addprops);


                    this.panelButtons.addControl(Controls.CompoundVert([
                        Controls.CompoundVert(tableButtons)
                    ]));

                    this.panelButtons2.addControl(Controls.CompoundVert([
                        //Controls.Static('<small>Workspace ID: '+MetaData.workspaceid+'</small>')
                        Controls.Static('<h1>'+MetaData.generalSettings.Name+'</h1>'),
                        Controls.Static(MetaData.generalSettings.Description||'<i>No description</i>'),
                        Controls.VerticalSeparator(20),
                        Controls.CompoundVert(miscButtonList).setTreatAsBlock()
                    ]));



                    //this.panelCalculations = FrameList(this.frameCalculations);

//                    if (MetaData.updateCalculationInfo)
//                        that.updateCalculationInfo();

                }


//                that.updateChannelInfo = function(proceedFunction) {
//
//                    var scrollpos = that.panelChannels.getScrollPosVert();
//                    this.panelChannels.root.clear();
//                    that.panelChannels.render();
//
//                    var tableRoots = {}
//                    $.each(MetaData.tableCatalog, function(idx, tableInfo) {
//                        tableRoots[tableInfo.id] = that.panelChannels.root.addItem(FrameTree.Branch(null,'<span class="DQXLarge">'+tableInfo.tableCapNamePlural+'</span>')).setCanSelect(false);
//                    });
//
//                    var br = that.panelChannels.root.addItem(FrameTree.Branch(null,'<span class="DQXLarge">Genomic values</span>')).setCanSelect(false);
//                    //var br1 = br.addItem(FrameTree.Branch(null,'<span class="DQXLarge">Individual points</span>')).setCanSelect(false);
//                    var rootSummary = br.addItem(FrameTree.Branch(null,'<span class="DQXLarge">Filterbank summarised</span>')).setCanSelect(false);
//
//
//                    /*Application.getChannelInfo(function()*/ {
//
//                        $.each(MetaData.customProperties, function(idx, prop) {
//                            str = '<b><span style="color:{col}">'.DQXformat({col:(prop.isCustom?'black':'rgb(128,0,0)')})+prop.name+'</span></b><span style="color:rgb(150,150,150)"> ';
//                            if (prop.name!=prop.propid)
//                                str += prop.propid;
//                            str += ' ('+prop.datatype+')';
//                            str += '</span>';
//                            var openButton = Controls.LinkButton(null,{smartLink : true, opacity:(prop.isCustom?1:0.15) }).setOnChanged(function() {
//                                EditProperty.execute(prop.tableid, prop.propid);
//                            });
//                            var moveUpButton = Controls.LinkButton(null, { bitmap:DQX.BMP('triangle_up_1.png'), vertShift:-2, opacity:0.35 }).setOnChanged(function() {
//                                that.moveProperty(prop.tableid,prop.propid,-1);
//                            });
//                            var moveDownButton = Controls.LinkButton(null, { bitmap:DQX.BMP('triangle_down_1.png'), vertShift:-2, opacity:0.35 }).setOnChanged(function() {
//                                that.moveProperty(prop.tableid,prop.propid,+1);
//                            });
//                            var root = tableRoots[prop.tableid];
//                            root.addItem(FrameTree.Control(Controls.CompoundHor([openButton,Controls.HorizontalSeparator(7),moveUpButton,Controls.HorizontalSeparator(0),moveDownButton,Controls.HorizontalSeparator(7),Controls.Static(str)])));
//                        });
//
//                        $.each(MetaData.summaryValues, function(idx, summaryValue) {
//                            str = '<b><span style="color:{col}">'.DQXformat({col:(summaryValue.isCustom?'black':'rgb(128,0,0)')})+summaryValue.name+'</span></b><span style="color:rgb(150,150,150)"> ';
//                            if (summaryValue.name!=summaryValue.propid)
//                                str += summaryValue.propid;
//                            str += '</span>';
//                            var openButton = Controls.LinkButton(null,{smartLink : true, opacity:(summaryValue.isCustom?1:0.15) }).setOnChanged(function() {
//                                EditSummaryValue.execute(summaryValue.propid);
//                            });
//                            var moveUpButton = Controls.LinkButton(null, { bitmap:DQX.BMP('triangle_up_1.png'), vertShift:-2, opacity:0.35 }).setOnChanged(function() {
//                                that.moveSummaryValue(summaryValue.propid,-1);
//                            });
//                            var moveDownButton = Controls.LinkButton(null, { bitmap:DQX.BMP('triangle_down_1.png'), vertShift:-2, opacity:0.35 }).setOnChanged(function() {
//                                that.moveSummaryValue(summaryValue.propid,+1);
//                            });
//                            rootSummary.addItem(FrameTree.Control(Controls.CompoundHor([openButton,Controls.HorizontalSeparator(7),moveUpButton,Controls.HorizontalSeparator(0),moveDownButton,Controls.HorizontalSeparator(7),Controls.Static(str)])));
//                        });
//
//
//                        that.panelChannels.render();
//                        that.panelChannels.setScrollPosVert(scrollpos);
//                        if (proceedFunction) proceedFunction();
//                    }/*)*/;
//
//
//                }

//                that.moveProperty = function(tableid, propid, dir) {
//                    DQX.setProcessing();
//                    var data ={};
//                    data.database = MetaData.database;
//                    data.workspaceid = MetaData.workspaceid;
//                    data.tableid = tableid;
//                    data.propid = propid;
//                    data.dir = dir;
//                    DQX.customRequest(MetaData.serverUrl,PnServerModule,'property_move', data, function(resp) {
//                        DQX.stopProcessing();
//                        Msg.send({ type: 'ReloadChannelInfo' });
//                    });
//                }


//                that.updateCalculationInfo = function() {
//                    //return;
//                    var fetcher = DataFetchers.RecordsetFetcher(MetaData.serverUrl, ''/*Falls back to default DB in DQXServer config*/, 'calculations');
//                    fetcher.addColumn('id', 'GN');
//                    fetcher.addColumn('user', 'GN');
//                    fetcher.addColumn('timestamp', 'GN');
//                    fetcher.addColumn('name', 'GN');
//                    fetcher.addColumn('status', 'GN');
//                    fetcher.addColumn('progress', 'IN');
//                    fetcher.addColumn('completed', 'IN');
//                    fetcher.addColumn('failed', 'IN');
//                    fetcher._maxResultCount = 20;
//                    fetcher._sortReverse = true;
//                    var whc = SQL.WhereClause.OR([
//                        SQL.WhereClause.CompareFixed('scope','=',''),
//                        SQL.WhereClause.CompareFixed('scope','=',MetaData.database),
//                        SQL.WhereClause.CompareFixed('scope','=',MetaData.database+'_'+MetaData.workspaceid)
//                    ]);
//                    fetcher.getData(whc, 'timestamp', function (data) {
//                            var calcs = [];
//                            for (var i=0; i<data.id.length; i++) {
//                                var color = DQX.Color(0,0,0);
//                                if (data.completed[i]&&(!data.failed[i]))
//                                    color = DQX.Color(0.6,0.6,0.6);
//                                var str = '<span style="color:{cl}">'.DQXformat({cl: color.toString()});
//                                str += '<span style="font-size:70%">{usr}, {tme}</span><br>{name}<br>'.DQXformat({
//                                    usr: data.user[i],
//                                    tme: data.timestamp[i],
//                                    name: data.name[i]
//                                });
//                                if (data.failed[i])
//                                    str += '<span style="font-weight:bold;color:red">FAILED: </span><span style="font-weight:bold">{status}</span>'.DQXformat({
//                                        status: data.status[i]
//                                    });
//                                else {
//                                    if (data.completed[i])
//                                        str +='<span style="color:rgb(0,128,0)">Completed</span>';
//                                    else {
//                                        progressstr = '';
//                                        if (data.progress[i]>0)
//                                            progressstr = str(data.progress[i])+' %';
//                                        str += '<span style="font-weight:bold;color:blue">{status} {progress}</span>'.DQXformat({
//                                            status: data.status[i],
//                                            progress: progressstr
//                                        });
//                                    }
//                                }
//                                str += '</span>';
//                                calcs.push({id: data.id[i], content: str});
//                            }
//                            that.panelCalculations.setItems(calcs,'');
//                            that.panelCalculations.render();
//                            setTimeout(that.updateCalculationInfo,2000);
//                        },
//                        function() {
//                            setTimeout(that.updateCalculationInfo,5000);
//                        }
//                    );
//                }



//                Msg.listen('', { type: 'ReloadChannelInfo' }, function () {
//                    that.updateChannelInfo(function() {
//                        $.each(MetaData.tableCatalog, function(idx, tableInfo) {
//                            Application.getView(tableInfo.tableViewId).uptodate = false;
//                        });
//                        Application.getView('genomebrowser').uptodate = false;
//                    });
//                });


                //alert(JSON.stringify({ states: [{id:'S', name:'Silent'}, {id:'N', name:'Non-silent'}]}));

                return that;
            }

        };

        return IntroModule;
    });