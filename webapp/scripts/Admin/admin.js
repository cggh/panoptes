// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

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
        tween: "Externals/Tween",
        lzstring: "DQX/Externals/lz-string"
    },
    shim: {
        d3: {
            exports: 'd3'
        },
        handlebars: {
            exports: 'Handlebars'
        },
        tween: {
            exports: 'TWEEN'
        },
        lzstring: {
          exports: 'LZString'
        }
    },
    waitSeconds: 15,
    urlArgs: "version="+versionString
});


require(["_", "jquery", "DQX/Application", "DQX/Framework", "DQX/FrameList", "DQX/FrameTree", "DQX/Controls", "DQX/Msg", "DQX/Utils", "DQX/Popup", "DQX/ServerIO", "DQX/SQL", "DQX/DataFetcher/DataFetchers", "MetaData", "Admin/CustomDataManager", "Admin/RefGenomeManager", "Utils/MiscUtils" ],
    function (_, $, Application, Framework, FrameList, FrameTree, Controls, Msg, DQX, Popup, ServerIO, SQL, DataFetchers, MetaData, CustomDataManager, RefGenomeManager, MiscUtils) {
        $(function () {


            var IntroModule = {

                init: function () {
                    // Instantiate the view object
                    var that = Application.View(
                        'start',        // View ID
                        'Start page'    // View title
                    );

                    Msg.listen('',{ type: 'RenderSourceDataInfo' }, function(scope, settings) {
                        var proceedFunction = null;
                        if (settings) {
                            proceedFunction = settings.proceedFunction;
                        }
                        that.reloadInfo(function() {
                            if (proceedFunction) proceedFunction();
                            if (settings && settings.activeDataset)
                                that.panelSourceData.scrollToBranch(settings.activeDataset);
                        });
                    });

                    Msg.listen('',{ type: 'PromptLoadData' }, function(scope, info) {
                        that.loadData(info);
                    });

                    Msg.listen('',{ type: 'ExecLoadDataFull' }, function(scope, info) {
                        that.execLoadData(info, 'all');
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


                        this.panelButtons.addControl(Controls.CompoundVert([
                        ]));

                        that.createPanelSourceData();

                        this.panelCalculations = FrameList(this.frameCalculations);
                        this.panelCalculations.setOnItemHighlighted(that.showCalculationLog);
                        that.updateCalculationInfo();
                    }


                    that.execLoadData = function(sourceFileInfo, scopeStr, skipTableTracks) {
                        var data={};
                        //data.ConfigOnly = (scopeStr=='none')?'1':'0';
                        data.ScopeStr = scopeStr;
                        data.SkipTableTracks = skipTableTracks;
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
                            data.type = sourceFileInfo.tpe;
                            ServerIO.customAsyncRequest(MetaData.serverUrl, PnServerModule, 'fileload_datatable', data, function(resp) {
                            });
                            return;
                        }
                        //Upload a dataset
                        data.datasetid = sourceFileInfo.datasetid;
                        ServerIO.customAsyncRequest(MetaData.serverUrl, PnServerModule, 'fileload_dataset', data,
                            function(resp) { Msg.send({type: 'RenderSourceDataInfo'}, {}); },
                            function(resp) { Msg.send({type: 'RenderSourceDataInfo'}, {}); });
                    }

                    that.loadData = function(sourceFileInfo) {
                        var content = '<p>' + CustomDataManager.getSourceFileDescription(sourceFileInfo);
                        content += '<p><i>Import the data in this file source<br>to the web server</i></p>';
                        var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon: 'fa-cog', content: '<b>Import</b>', width:120, height:35 }).setOnChanged(function() {
                            var scopeStr = ctrlLoadScope.getValue();
                            if (!scopeStr) {
                                alert('Please select a data load option.');
                                return;
                            }
                            Popup.closeIfNeeded(popupid);
                            that.execLoadData(sourceFileInfo, scopeStr, ctrlSkipTableTracks.getValue());
                        });
                        content += bt.renderHtml() + '&nbsp;';

                        content += MiscUtils.createDocButton('importdata/importdialog').renderHtml();

                        content += '<p>';

                        var ctrlLoadScope = Controls.RadioGroup(null,{label:'Load data:', value: '', states: [
                            {id:'all', name:'Full import'},
                            {id:'none', name:'Update configuration only'},
                            {id:'1k', name:'Top 1K preview'},
                            {id:'10k', name:'Top 10K preview'},
                            {id:'100k', name:'Top 100K preview'},
                            {id:'1M', name:'Top 1M preview'},
                            {id:'10M', name:'Top 10M preview'}
                        ]});
                        content += ctrlLoadScope.renderHtml();
                        content += '</p><p>';

                        var ctrlSkipTableTracks = Controls.Check(null, {
                          label:'Skip filterbanking of table-row-linked tracks',
                        });
                        content += ctrlSkipTableTracks.renderHtml();
                        content += '</p>';



                      var popupid = Popup.create('Import file source data', content);
                    }

                    that.createPanelSourceData = function() {
                        that.panelSourceData = FrameTree.Tree(this.frameSourceData);
                        //that.panelSourceData.canCollapse = false;
                        that.renderInfo();

                    }

                    that.renderInfo = function() {

                        // Store info about dataset branch collapsedness
                        var branchWasCollapsed = {};
                        $.each(MetaData.sourceFileInfo, function(datasetid, datasetInfo) {
                            var branch = that.panelSourceData.findItem(datasetid);
                            if (branch)
                                branchWasCollapsed[datasetid] = branch.isCollapsed();
                        });


                        var createBranch = function(branchID, content, clss, actionList) {
                            //return FrameTree.Branch(branchID, content);
                            var controllist1 = [];
                            var controllist2 = [];
                            $.each(actionList, function(idx, action) {
                                //var actionButton = Controls.Hyperlink(null, {content:'<img src="'+action.bitmap+'"/>', hint:action.hint});
                                var actionButton = Controls.ImageButton(null, { bitmap:action.bitmap, hint:action.hint, vertShift:-2})
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
                            controllist1.push(Controls.Static('<div class="{clss}">'.DQXformat({clss:clss}) + content + '</div>'));
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
                                bitmap:'Bitmaps/actionbuttons/edit.png',
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
                                bitmap:'Bitmaps/actionbuttons/run.png',
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
                        var datasetsBranch = createBranch(null, "Datasets", "AdminTreeRoot", actionList);
                        datasetsBranch.showBracket = false;
                        datasetsBranch.canCollapse = false;
                        that.panelSourceData.root.addItem(datasetsBranch);

                        $.each(MetaData.sourceFileInfo, function(datasetid, datasetInfo) {
                            var branchid = datasetid;
                            var actionList = [createActionEdit(branchid), createActionLoad(branchid), createActionDelete(branchid)];
                            var codebmp = 'codered';
                            var codedescr = 'Dataset is currently not imported to the server';
                            if (datasetInfo.importstatus == 'outdated') {
                                var codebmp = 'codeorange';
                                var codedescr = 'Served dataset may be outdated';
                            }
                            if (datasetInfo.importstatus == 'ok') {
                                var codebmp = 'codegreen';
                                var codedescr = 'Served dataset is up to date';
                            }
                            actionList.push(
                                {
                                    bitmap:'Bitmaps/actionbuttons/{bmp}.png'.DQXformat({bmp: codebmp}),
                                    atend: true,
                                    hint: codedescr,
                                    actionHandler: function() {
                                        if (datasetInfo.importstatus == 'ok')
                                            Popup.create('Dataset server status', 'Served dataset is up to date.<br>No action required');
                                        else {
                                            var content = 'Dataset is currently not imported for serving.';
                                            if (datasetInfo.importstatus == 'outdated')
                                                content = 'Served dataset may be outdated.';
                                            content += '<p>Dou you want to update and import the served dataset now?<br><i>Note: this may take a while!</i><p>';
                                            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: '<b>Import now</b>', width:180, height:28 }).setOnChanged(function() {
                                                Popup.closeIfNeeded(popupid);
                                                that.execLoadData({datasetid: datasetid}, 'all');
                                            });
                                            content += bt.renderHtml() + '<br>';
                                            var popupid =  Popup.create('Dataset server status', content);
                                        }

                                    }
                                }
                            );
                            var datasetBranch = createBranch(branchid, datasetid, "AdminTreeDataSet", actionList);
                            datasetBranch.setCollapsed(branchWasCollapsed[datasetid]);
                            datasetsBranch.addItem(datasetBranch);
                            that.sourceFileInfoList[branchid] = {
                                tpe: 'dataset',
                                datasetid: datasetid
                            };


                            var actionList = [
                                {
                                    bitmap:'Bitmaps/actionbuttons/import.png',
                                    hint:"Upload data...",
                                    actionHandler: function() {
                                        RefGenomeManager.uploadData(datasetid);
                                    }
                                },
                                {
                                    bitmap:'Bitmaps/actionbuttons/edit.png',
                                    hint:"Edit settings...",
                                    actionHandler: function() {
                                        RefGenomeManager.editData(datasetid);
                                    }
                                }
//                                {
//                                    bitmap:'Bitmaps/actionbuttons/run.png',
//                                    hint:"Import to server...",
//                                    actionHandler: function() {
//                                        RefGenomeManager.importData(datasetid);
//                                    }
//                                }
                            ];
                            var branch = createBranch(null, 'Reference genome', 'AdminTreeNormal', actionList );
                            branch.canCollapse = false;
                            datasetBranch.addItem(branch);


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
                            var datatablesBranch = createBranch(null, "Datatables", "AdminTreeSection", actionList);
                            datatablesBranch.canCollapse = false;
                            datatablesBranch.setCanSelect(false);
                            datasetBranch.addItem(datatablesBranch);


                            $.each(datasetInfo.datatables, function(datatableid, datatableInfo) {
                                var branchid = 'datatable_'+datasetid+'_'+datatableid;
                                var actionList = [createActionView(branchid), createActionEdit(branchid), createActionLoad(branchid), createActionDelete(branchid)];
                                var branch = createBranch(branchid, datatableid, 'AdminTreeNormal', actionList );
                                branch.canCollapse = false;
                                datatablesBranch.addItem(branch);
                                that.sourceFileInfoList[branchid] = {
                                    tpe: 'datatable',
                                    datasetid: datasetid,
                                    tableid: datatableid
                                };
                            });

                            var twoDdatatablesBranch = createBranch(null, "2D Datatables", "AdminTreeSection", []);
                            twoDdatatablesBranch.canCollapse = false;
                            twoDdatatablesBranch.setCanSelect(false);
                            datasetBranch.addItem(twoDdatatablesBranch);


                            $.each(datasetInfo['2D_datatables'], function(datatableid, datatableInfo) {
                                var branchid = '2D_datatable_'+datasetid+'_'+datatableid;
                                var actionList = [createActionEdit(branchid), createActionLoad(branchid), createActionDelete(branchid)];
                                var branch = createBranch(branchid, datatableid, 'AdminTreeNormal', actionList );
                                branch.canCollapse = false;
                                twoDdatatablesBranch.addItem(branch);
                                that.sourceFileInfoList[branchid] = {
                                    tpe: '2D_datatable',
                                    datasetid: datasetid,
                                    tableid: datatableid
                                };
                            });


                            var actionList = [
                                {
                                    bitmap:'Bitmaps/actionbuttons/new.png',
                                    hint:"Add new workspace",
                                    atend: true,
                                    actionHandler: function() {
                                        CustomDataManager.createWorkspace({datasetid: datasetid});
                                    }
                                }
                            ];
                            var workspacesBranch = createBranch(null, "Workspaces", "AdminTreeSection", actionList);
                            workspacesBranch.canCollapse = false;
                            workspacesBranch.setCanSelect(false);
                            datasetBranch.addItem(workspacesBranch);

                            //var workspacesBranch = datasetBranch.addItem(FrameTree.Branch(null, "Workspaces").setCanSelect(false));

                            $.each(datasetInfo.workspaces, function(workspaceid, workspaceInfo) {
                                var branchid = datasetid+'_'+workspaceid;
                                var actionList = [createActionEdit(branchid), createActionLoad(branchid), createActionDelete(branchid)];
                                var workspaceBranch = createBranch(branchid, workspaceid, 'AdminTreeNormal', actionList);
                                workspaceBranch.canCollapse = false;
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
                                var customdataBranch = createBranch(null, "Custom data", "AdminTreeSection", actionList);
                                customdataBranch.setCanSelect(false);
                                customdataBranch.canCollapse = false;
                                workspaceBranch.addItem(customdataBranch);


                                $.each(workspaceInfo.sources, function(sourceid, sourceInfo) {
                                    var branchid = datasetid+'_'+workspaceid+'_'+sourceid;
                                    var actionList = [createActionView(branchid), createActionEdit(branchid), createActionLoad(branchid), createActionDelete(branchid)];
                                    var branch = createBranch(branchid, sourceid + ' ('+sourceInfo.tableid + ')', 'AdminTreeNormal', actionList);
                                    branch.canCollapse = false;
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
                                    var str = '<div style="color:{cl};padding:6px">'.DQXformat({cl: color.toString()});
                                    str += '<img SRC="{bmp}" style="opacity:0.7;float:left;margin-right:8px;margin-bottom:5px;margin-top:2px"/>'.DQXformat({bmp:'Bitmaps/actionbuttons/open.png'});
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
                                    str += '</div>';
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

                    that.reloadInfo = function(proceedFunction) {
                        DQX.customRequest(MetaData.serverUrl,PnServerModule,'getimportfilelist',{},function(resp) {
                            if (resp.Error)
                                alert(resp.Error);
                            MetaData.sourceFileInfo =resp.datasets;
                            that.renderInfo();
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
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'serverstatus', {}, function(resp) {
                    if ('issue' in resp) {
                        var issueText = resp.issue;
                        issueText = issueText.replace(/\n/g, "<br>");
                        var content = '<div style="margin:30px"><p><h2>Server configuration problem</h2><p>' + issueText;
                        var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon: 'fa-arrow-circle-right', content: 'Proceed anyway', width:120, height:35 }).setOnChanged(function() {
                            Popup.closeIfNeeded(popupid);
                            Application.bootScheduler.setCompleted('serverstatus');
                        });
                        content += '<p><span style="color:red"><b>The software will not work correctly!</b></span></p>'
                        content += '<br>' + bt.renderHtml();
                        content += '</div>';
                        var popupid = Popup.create('Fatal error', content, null, {canClose: false});
                        return;
                    }
                    Application.bootScheduler.setCompleted('serverstatus');
                });
            });


            Application.bootScheduler.add(['serverstatus'], function() {
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'getimportfilelist',{},function(resp) {
                    if (resp.Error)
                        alert(resp.Error);
                    MetaData.sourceFileInfo =resp.datasets;
                    Application.bootScheduler.setCompleted('getimportfilelist');
                });
            });

            Application.bootScheduler.add(['getimportfilelist'], function() {
                IntroModule.init();
                //Define the header content (visible in the top-left corner of the window)
                var headerContent = '<a href="index.html" target="_blank"><img src="Bitmaps/PanoptesSmall.png" alt="Panoptes logo" align="top" style="border:0px;margin:3px"/></a>';
                Application.setHeader(headerContent);
                Application.init('Panoptes Admin');
            });

            Application.bootScheduler.execute();




        });

    });
