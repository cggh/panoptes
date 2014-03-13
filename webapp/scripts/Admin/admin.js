
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


require(["_", "jquery", "DQX/Application", "DQX/Framework", "DQX/FrameList", "DQX/FrameTree", "DQX/Controls", "DQX/Msg", "DQX/Utils", "DQX/Popup", "DQX/ServerIO", "DQX/SQL", "DQX/DataFetcher/DataFetchers", "MetaData", "Admin/CustomDataManager" ],
    function (_, $, Application, Framework, FrameList, FrameTree, Controls, Msg, DQX, Popup, ServerIO, SQL, DataFetchers, MetaData, CustomDataManager) {
        $(function () {


            var IntroModule = {

                init: function () {
                    // Instantiate the view object
                    var that = Application.View(
                        'start',        // View ID
                        'Start page'    // View title
                    );

                    Msg.listen('',{ type: 'RenderSourceDataInfo' }, function(scope, settings) {
                        var selectPath = null;
                        var proceedFunction = null;
                        if (settings) {
                            selectPath = settings.selectPath;
                            proceedFunction = settings.proceedFunction;
                        }
                        that.reloadInfo(selectPath, proceedFunction);
                    });

                    Msg.listen('',{ type: 'PromptLoadData' }, function(scope, info) {
                        that.loadData(info);
                    });

                    Msg.listen('',{ type: 'ExecLoadDataFull' }, function(scope) {
                        that.execLoadData(false);
                    });

                    //This function is called during the initialisation. Create the frame structure of the view here
                    that.createFrames = function(rootFrame) {
                        rootFrame.makeGroupHor();

                        this.frameButtons = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.3)).setFixedSize(Framework.dimX, 200);
                        this.frameSourceData = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.6)).setDisplayTitle("File sources");
                        this.frameCalculations = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.5)).setDisplayTitle("Server calculations");
                    }

                    // This function is called during the initialisation. Create the panels that will populate the frames here
                    that.createPanels = function() {

                        this.panelButtons = Framework.Form(this.frameButtons);
                        this.panelButtons.setPadding(10);

                        var buttonCreateDataSet = Controls.Button(null, { content: 'Create dataset...', width:150, height:25 }).setOnChanged(function() {
                            CustomDataManager.createDataSet();
                        })

                        var buttonLoadDataset = Controls.Button(null, { content: 'Import to Server...', width:150, height:25 }).setOnChanged(function() {
                            var sourceFileInfo = that.sourceFileInfoList[that.panelSourceData.getActiveItem()];
                            if (!sourceFileInfo) {
                                alert('Please select a source file set from the tree')
                                return;
                            }
                            that.loadData(sourceFileInfo);
                        })

                        var buttonViewData = Controls.Button(null, { content: 'View data...', width:150, height:25 }).setOnChanged(function() {
                            var sourceFileInfo = that.sourceFileInfoList[that.panelSourceData.getActiveItem()];
                            if (!sourceFileInfo) {
                                alert('Please select a data source from the tree')
                                return;
                            }
                            CustomDataManager.viewData(sourceFileInfo);
                        })

                        var buttonEditSettings = Controls.Button(null, { content: 'Edit settings...', width:150, height:25 }).setOnChanged(function() {
                            var sourceFileInfo = that.sourceFileInfoList[that.panelSourceData.getActiveItem()];
                            if (!sourceFileInfo) {
                                alert('Please select a data source from the tree')
                                return;
                            }
                            CustomDataManager.editSettings(sourceFileInfo);
                        })

                        var buttonDelData = Controls.Button(null, { content: 'Delete...', width:150, height:25 }).setOnChanged(function() {
                            var sourceFileInfo = that.sourceFileInfoList[that.panelSourceData.getActiveItem()];
                            if (!sourceFileInfo) {
                                alert('Please select a data source from the tree');
                                return;
                            }
                            CustomDataManager.delData(sourceFileInfo);
                        })


                        var buttonDataTable = Controls.Button(null, { content: 'Upload datatable...', width:150, height:25 }).setOnChanged(function() {
                            var sourceFileInfo = that.sourceFileInfoList[that.panelSourceData.getActiveItem()];
                            if ((!sourceFileInfo) || (!sourceFileInfo.datasetid) ) {
                                alert('Please select a dataset from the tree')
                                return;
                            }
                            CustomDataManager.uploadDataTable(sourceFileInfo.datasetid);
                        })

                        var buttonUploadCustomData = Controls.Button(null, { content: 'Upload custom data...', width:150, height:25 }).setOnChanged(function() {
                            var sourceFileInfo = that.sourceFileInfoList[that.panelSourceData.getActiveItem()];
                            if ((!sourceFileInfo) || (!sourceFileInfo.workspaceid) || (sourceFileInfo.sourceid) ) {
                                alert('Please select a workspace from the tree')
                                return;
                            }
                            CustomDataManager.uploadCustomData(sourceFileInfo.datasetid, sourceFileInfo.workspaceid);
                        })



                        this.panelButtons.addControl(Controls.CompoundVert([
                            buttonCreateDataSet,
                            Controls.VerticalSeparator(20),
                            Controls.Static('Highlighted file source:'),
                            buttonLoadDataset,
                            buttonViewData,
                            buttonEditSettings,
                            buttonDelData,
                            Controls.VerticalSeparator(20),
                            buttonDataTable,
                            buttonUploadCustomData
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
                            ServerIO.customAsyncRequest(MetaData.serverUrl, PnServerModule, 'fileload_customsource', data, function(resp) {
                            });
                            return;
                        }
                        if (sourceFileInfo.workspaceid) {
                            //Upload a workspace
                            data.datasetid = sourceFileInfo.datasetid;
                            data.workspaceid = sourceFileInfo.workspaceid;
                            ServerIO.customAsyncRequest(MetaData.serverUrl, PnServerModule, 'fileload_workspace', data, function(resp) {
                            });
                            return;
                        }
                        if (sourceFileInfo.tableid) {
                            //Upload a single datatable
                            data.datasetid = sourceFileInfo.datasetid;
                            data.tableid = sourceFileInfo.tableid;
                            ServerIO.customAsyncRequest(MetaData.serverUrl, PnServerModule, 'fileload_datatable', data, function(resp) {
                            });
                            return;
                        }
                        //Upload a dataset
                        data.datasetid = sourceFileInfo.datasetid;
                        ServerIO.customAsyncRequest(MetaData.serverUrl, PnServerModule, 'fileload_dataset', data, function(resp) {
                        });
                    }

                    that.loadData = function(sourceFileInfo) {
                        var content = '<p>' + CustomDataManager.getSourceFileDescription(sourceFileInfo);
                        content += '<p><i>Import the data in this file source<br>to the web server</i></p>';
                        var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: 'Import all data', width:180, height:28 }).setOnChanged(function() {
                            Popup.closeIfNeeded(popupid);
                            that.execLoadData(false);
                        });
                        content += bt.renderHtml() + '<br>';
                        var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: 'Update configuration only', width:180, height:28 }).setOnChanged(function() {
                            Popup.closeIfNeeded(popupid);
                            that.execLoadData(true);
                        });
                        content += bt.renderHtml() + '<br>';
                        var popupid = Popup.create('Import file source data', content);
                    }

                    that.createPanelSourceData = function() {
                        that.panelSourceData = FrameTree.Tree(this.frameSourceData);
                        that.panelSourceData.canCollapse = false;
                        that.renderInfo();

                    }

                    that.renderInfo = function(selectItemPath) {

                        var createBranch = function(branchID, content, actionList) {
                            //return FrameTree.Branch(branchID, content);
                            var controllist1 = [];
                            var controllist2 = [];
                            $.each(actionList, function(idx, action) {
                                //var actionButton = Controls.Hyperlink(null, {content:'<img src="'+action.bitmap+'"/>', hint:action.hint});
                                var actionButton = Controls.ImageButton(null, { bitmap:action.bitmap, hint:action.hint})
                                actionButton.setOnChanged(action.actionHandler);
                                if (!action.atend) {
                                    controllist1.push(actionButton);
                                    controllist1.push(Controls.HorizontalSeparator(5));
                                } else {
                                    controllist2.push(Controls.HorizontalSeparator(5));
                                    controllist2.push(actionButton);
                                }
                            });
                            controllist1.push(Controls.HorizontalSeparator(5));
                            controllist1.push(Controls.Static(content));
                            controllist1.push(Controls.HorizontalSeparator(5));
                            $.each(controllist2, function(idx, control) {
                                controllist1.push(control);
                            });
                            var bra = FrameTree.Control(Controls.CompoundHor(controllist1));
                            if (branchID)
                                bra.setID(branchID);
                            //bra.showBracket = false;
                            return bra;
                        }

                        var createActionEdit = function(branchid) {
                            return {
                                bitmap:'Bitmaps/actionbuttons/settings.png',
                                hint:'Edit settings',
                                actionHandler: function() {
                                    var sourceFileInfo = that.sourceFileInfoList[branchid];
                                    if (!sourceFileInfo)
                                        return;
                                    CustomDataManager.editSettings(sourceFileInfo);
                                }
                            }
                        };

                        var createActionView = function(branchid) {
                            return {
                                bitmap:'Bitmaps/actionbuttons/viewdata.png',
                                hint:'View data',
                                actionHandler: function() {
                                    var sourceFileInfo = that.sourceFileInfoList[branchid];
                                    if (!sourceFileInfo)
                                        return;
                                    CustomDataManager.viewData(sourceFileInfo);
                                }
                            }
                        };

                        var createActionDelete = function(branchid) {
                            return {
                                bitmap:'Bitmaps/actionbuttons/delete.png',
                                hint:'Delete',
                                actionHandler: function() {
                                    var sourceFileInfo = that.sourceFileInfoList[branchid];
                                    if (!sourceFileInfo)
                                        return;
                                    CustomDataManager.delData(sourceFileInfo);
                                }
                            }
                        };

                        var createActionLoad = function(branchid) {
                            return {
                                bitmap:'Bitmaps/actionbuttons/import.png',
                                hint:'Import to server',
                                actionHandler: function() {
                                    var sourceFileInfo = that.sourceFileInfoList[branchid];
                                    if (!sourceFileInfo)
                                        return;
                                    that.loadData(sourceFileInfo);
                                }
                            }
                        };

                        that.panelSourceData.clear();
                        that.sourceFileInfoList = {};

                        var actionList = [
                            {
                                bitmap:'Bitmaps/actionbuttons/new.png',
                                hint:"Add new dataset",
                                atend: true,
                                actionHandler: function() {
                                    CustomDataManager.createDataSet();
                                }
                            }
                        ];
                        var datasetsBranch = createBranch(null, '<span class="DQXExtraLarge AdminTreeNonClickable">Datasets</span>', actionList);
                        datasetsBranch.showBracket = false;
                        that.panelSourceData.root.addItem(datasetsBranch);

                        $.each(MetaData.sourceFileInfo, function(datasetid, datasetInfo) {
                            var branchid = datasetid;
                            var actionList = [createActionEdit(branchid), createActionLoad(branchid), createActionDelete(branchid)];
                            var datasetBranch = createBranch(branchid, '<div class="DQXExtraLarge" style=" width:100%;padding-bottom:2px;padding-top:20px;">'+datasetid+'</div>', actionList);
                            datasetsBranch.addItem(datasetBranch);
                            that.sourceFileInfoList[branchid] = {
                                tpe: 'dataset',
                                datasetid: datasetid
                            };

                            var actionList = [
                                {
                                    bitmap:'Bitmaps/actionbuttons/new.png',
                                    hint:"Add new datatable",
                                    atend: true,
                                    actionHandler: function() {
                                        CustomDataManager.uploadDataTable(datasetid);
                                    }
                                }
                            ];
                            var datatablesBranch = createBranch(null, '<div class="AdminTreeNonClickable" style="padding-bottom:6px;padding-top:6px">Datatables</div>', actionList);
                            datatablesBranch.setCanSelect(false);
                            datasetBranch.addItem(datatablesBranch);


                            $.each(datasetInfo.datatables, function(datatableid, datatableInfo) {
                                var branchid = 'datatable_'+datasetid+'_'+datatableid;
                                var actionList = [createActionView(branchid), createActionEdit(branchid), createActionLoad(branchid), createActionDelete(branchid)];
                                var branch = createBranch(branchid, '<b>'+datatableid+'</b>', actionList);
                                datatablesBranch.addItem(branch);
                                that.sourceFileInfoList[branchid] = {
                                    tpe: 'datatable',
                                    datasetid: datasetid,
                                    tableid: datatableid
                                };
                            });

                            var workspacesBranch = datasetBranch.addItem(FrameTree.Branch(null, '<div class="AdminTreeNonClickable" style="padding-bottom:6px;padding-top:6px">Workspaces</div>').setCanSelect(false));
                            $.each(datasetInfo.workspaces, function(workspaceid, workspaceInfo) {
                                var branchid = datasetid+'_'+workspaceid;
                                var actionList = [createActionEdit(branchid), createActionLoad(branchid), createActionDelete(branchid)];
                                var workspaceBranch = createBranch(branchid, '<b>'+workspaceid+'</b>', actionList);
                                workspacesBranch.addItem(workspaceBranch);
                                that.sourceFileInfoList[branchid] = {
                                    tpe: 'workspace',
                                    datasetid: datasetid,
                                    workspaceid: workspaceid
                                };

                                var actionList = [
                                    {
                                        bitmap:'Bitmaps/actionbuttons/new.png',
                                        hint:"Add new custom data",
                                        atend: true,
                                        actionHandler: function() {
                                            CustomDataManager.uploadCustomData(datasetid, workspaceid);
                                        }
                                    }
                                ];
                                var customdataBranch = createBranch(null, '<div class="AdminTreeNonClickable" style="padding-bottom:6px;padding-top:6px">Custom data</div>', actionList);
                                customdataBranch.setCanSelect(false);
                                workspaceBranch.addItem(customdataBranch);


                                $.each(workspaceInfo.sources, function(sourceid, sourceInfo) {
                                    var branchid = datasetid+'_'+workspaceid+'_'+sourceid;
                                    var actionList = [createActionView(branchid), createActionEdit(branchid), createActionLoad(branchid), createActionDelete(branchid)];
                                    var branch = createBranch(branchid, '<b>'+sourceid+'</b>', actionList);
                                    customdataBranch.addItem(branch);
                                    that.sourceFileInfoList[branchid] = {
                                        tpe: 'customdata',
                                        datasetid: datasetid,
                                        workspaceid: workspaceid,
                                        sourceid: sourceid,
                                        tableid: sourceInfo.tableid
                                    };
                                });
                            });
                        });

                        that.panelSourceData.render();

                        if (selectItemPath) {
                            selectId = selectItemPath.datasetid;
                            if (selectItemPath.workspaceid) {
                                selectId += '_' + selectItemPath.workspaceid;
                                if (selectItemPath.sourceid)
                                    selectId += '_' + selectItemPath.sourceid;
                            }
                            that.panelSourceData.setActiveItem(selectId);
                        }
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
                                    str += '<img SRC="{bmp}" style="float:left;margin-right:5px;margin-bottom:1px;margin-top:2px"/>'.DQXformat({bmp:DQX.BMP('link1.png')});
                                    str += '<span style="font-size:75%">{usr}, {tme}</span><br>{name}<br>'.DQXformat({
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

                    that.reloadInfo = function(selectPath, proceedFunction) {
                        DQX.customRequest(MetaData.serverUrl,PnServerModule,'getimportfilelist',{},function(resp) {
                            if (resp.Error)
                                alert(resp.Error);
                            MetaData.sourceFileInfo =resp.datasets;
                            that.renderInfo(selectPath);
                            if (proceedFunction)
                                proceedFunction()
                        });
                    };

                    that.showCalculationLog = function(id) {
                        ServerIO.showLog(MetaData.serverUrl, id);
                    }


                    return that;
                }

            };

            Application.bootScheduler = DQX.Scheduler();

            Application.bootScheduler.add([], function() {
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'getimportfilelist',{},function(resp) {
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
