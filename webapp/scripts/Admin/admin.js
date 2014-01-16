
//Versionstring is supposed to be defined in main.html
//It is used to differentiate different versions, preventing them from being cached
if (typeof versionString == 'undefined')
    alert('Fatal error: versionString is missing');

//Configuration of require.js
require.config({
    baseUrl: "scripts",
    paths: {
        jquery: "DQX/Externals/jquery",
        d3: "DQX/Externals/d3",
        handlebars: "DQX/Externals/handlebars",
        markdown: "DQX/Externals/markdown",
        DQX: "DQX",
        _:"DQX/Externals/lodash",
        easel: "Externals/createjs-2013.05.14.min",
        tween: "Externals/Tween"
    },
    shim: {
        d3: {
            exports: 'd3'
        },
        handlebars: {
            exports: 'Handlebars'
        },
        easel: {
            exports: 'createjs'
        },
        tween: {
            exports: 'TWEEN'
        }
    },
    waitSeconds: 15,
    urlArgs: "version="+versionString
});


require(["_", "jquery", "DQX/Application", "DQX/Framework", "DQX/FrameList", "DQX/FrameTree", "DQX/Controls", "DQX/Msg", "DQX/Utils", "DQX/Popup", "DQX/ServerIO", "DQX/SQL", "DQX/DataFetcher/DataFetchers", "MetaData",  ],
    function (_, $, Application, Framework, FrameList, FrameTree, Controls, Msg, DQX, Popup, ServerIO, SQL, DataFetchers, MetaData) {
        $(function () {


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

                        this.frameButtons = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.3)).setFixedSize(Framework.dimX, 300);
                        this.frameSourceData = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.7)).setDisplayTitle("File sources");
                        this.frameCalculations = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.5)).setDisplayTitle("Server calculations");
                    }

                    // This function is called during the initialisation. Create the panels that will populate the frames here
                    that.createPanels = function() {

                        this.panelButtons = Framework.Form(this.frameButtons);
                        this.panelButtons.setPadding(10);

                        var buttonLoadDataset = Controls.Button(null, { content: 'Load highlighted file source', width:120, height:40 }).setOnChanged(function() {
                            var sourceFileInfo = that.sourceFileInfoList[that.panelSourceData.getActiveItem()];
                            if (!sourceFileInfo) {
                                alert('Please select a source file set from the tree')
                                return;
                            }
                            that.loadData();
                        })

                        this.panelButtons.addControl(Controls.CompoundHor([
                            buttonLoadDataset
                        ]));

                        that.createPanelSourceData();

                        this.panelCalculations = FrameList(this.frameCalculations);
                        this.panelCalculations.setOnItemHighlighted(that.showCalculationLog);
                        that.updateCalculationInfo();
                    }


                    that.execLoadData = function(configOnly) {
                        var sourceFileInfo = that.sourceFileInfoList[that.panelSourceData.getActiveItem()];
                        var data={};
                        data.ConfigOnly = configOnly?'1':'0';
                        if (sourceFileInfo.sourceid) {
                            //Upload a specific custom data source
                            data.datasetid = sourceFileInfo.datasetid;
                            data.workspaceid = sourceFileInfo.workspaceid;
                            data.sourceid = sourceFileInfo.sourceid;
                            data.tableid = sourceFileInfo.tableid;
                            ServerIO.customAsyncRequest(MetaData.serverUrl, "uploadtracks", 'fileload_customsource', data, function(resp) {
                            });
                            return;
                        }
                        if (sourceFileInfo.workspaceid) {
                            //Upload a workspace
                            data.datasetid = sourceFileInfo.datasetid;
                            data.workspaceid = sourceFileInfo.workspaceid;
                            ServerIO.customAsyncRequest(MetaData.serverUrl, "uploadtracks", 'fileload_workspace', data, function(resp) {
                            });
                            return;
                        }
                        //Upload a dataset
                        data.datasetid = sourceFileInfo.datasetid;
                        ServerIO.customAsyncRequest(MetaData.serverUrl, "uploadtracks", 'fileload_dataset', data, function(resp) {
                        });
                    }

                    that.loadData = function() {
                        var content = '';
                        var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: 'Load all data', width:160, height:28 }).setOnChanged(function() {
                            Popup.closeIfNeeded(popupid);
                            that.execLoadData(false);
                        });
                        content += bt.renderHtml() + '<br>';
                        var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: 'Load configuration only', width:160, height:28 }).setOnChanged(function() {
                            Popup.closeIfNeeded(popupid);
                            that.execLoadData(true);
                        });
                        content += bt.renderHtml() + '<br>';
                        var popupid = Popup.create('Load file data', content);
                    }

                    that.createPanelSourceData = function() {
                        that.panelSourceData = FrameTree.Tree(this.frameSourceData);

                        that.sourceFileInfoList = {};
                        $.each(MetaData.sourceFileInfo, function(datasetid, datasetInfo) {
                            var datasetBranch = that.panelSourceData.root.addItem(FrameTree.Branch(null,'<span class="DQXLarge">'+datasetid+'</span>'));
                            that.sourceFileInfoList[datasetBranch.getID()] = {
                                datasetid: datasetid
                            };
                            $.each(datasetInfo.workspaces, function(workspaceid, workspaceInfo) {
                                var workspaceBranch = datasetBranch.addItem(FrameTree.Branch(null,'<b>'+workspaceid+'</b>'));
                                that.sourceFileInfoList[workspaceBranch.getID()] = {
                                    datasetid: datasetid,
                                    workspaceid: workspaceid
                                };
                                $.each(workspaceInfo.sources, function(sourceid, sourceInfo) {
                                    var branch = workspaceBranch.addItem(FrameTree.Branch(null,sourceid+' ('+sourceInfo.tableid+')'));
                                    that.sourceFileInfoList[branch.getID()] = {
                                        datasetid: datasetid,
                                        workspaceid: workspaceid,
                                        sourceid: sourceid,
                                        tableid: sourceInfo.tableid
                                    };
                                });
                            });
                        });

                        that.panelSourceData.render();

                    }


                    that.updateCalculationInfo = function() {
                        //return;
                        var fetcher = DataFetchers.RecordsetFetcher(MetaData.serverUrl, ''/*Falls back to default DB in DQXServer config*/, 'calculations');
                        fetcher.addColumn('id', 'GN');
                        fetcher.addColumn('user', 'GN');
                        fetcher.addColumn('timestamp', 'GN');
                        fetcher.addColumn('name', 'GN');
                        fetcher.addColumn('status', 'GN');
                        fetcher.addColumn('progress', 'IN');
                        fetcher.addColumn('completed', 'IN');
                        fetcher.addColumn('failed', 'IN');
                        fetcher._maxResultCount = 20;
                        fetcher._sortReverse = true;
                        var whc = SQL.WhereClause.Trivial();
                        fetcher.getData(whc, 'timestamp', function (data) {
                                var calcs = [];
                                for (var i=0; i<data.id.length; i++) {
                                    var color = DQX.Color(0,0,0);
                                    if (data.completed[i]&&(!data.failed[i]))
                                        color = DQX.Color(0.6,0.6,0.6);
                                    var str = '<span style="color:{cl}">'.DQXformat({cl: color.toString()});
                                    str += '<span style="font-size:70%">{usr}, {tme}</span><br>{name}<br>'.DQXformat({
                                        usr: data.user[i],
                                        tme: data.timestamp[i],
                                        name: data.name[i]
                                    });
                                    if (data.failed[i])
                                        str += '<span style="font-weight:bold;color:red">FAILED: </span><span style="font-weight:bold">{status}</span>'.DQXformat({
                                            status: data.status[i]
                                        });
                                    else {
                                        if (data.completed[i])
                                            str +='<span style="color:rgb(0,128,0)">Completed</span>';
                                        else {
                                            progressstr = '';
                                            if (data.progress[i]>0)
                                                progressstr = str(data.progress[i])+' %';
                                            str += '<span style="font-weight:bold;color:blue">{status} {progress}</span>'.DQXformat({
                                                status: data.status[i],
                                                progress: progressstr
                                            });
                                        }
                                    }
                                    str += '</span>';
                                    calcs.push({id: data.id[i], content: str});
                                }
                                that.panelCalculations.setItems(calcs,'');
                                that.panelCalculations.render();
                                setTimeout(that.updateCalculationInfo,2000);
                            },
                            function() {
                                setTimeout(that.updateCalculationInfo,5000);
                            }
                        );
                    }

                    that.showCalculationLog = function(id) {
                        ServerIO.showLog(MetaData.serverUrl, id);
                    }


                    return that;
                }

            };

            Application.bootScheduler = DQX.Scheduler();

            Application.bootScheduler.add([], function() {
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','getimportfilelist',{},function(resp) {
                    if (resp.Error)
                        alert(resp.Error);
                    MetaData.sourceFileInfo =resp.datasets;
                    Application.bootScheduler.setCompleted('getimportfilelist');
                });
            });

            Application.bootScheduler.add(['getimportfilelist'], function() {
                IntroModule.init();
                Application.init('Panoptes Admin');
            });

            Application.bootScheduler.execute();




        });

    });
