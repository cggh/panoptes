// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameTree", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "Wizards/ManageStoredEntities", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameTree, DataFetchers, EditQuery, ManageStoredEntities, MetaData) {

        var QueryTool = {};


        QueryTool.getSubSamplingOptions_All = function() {
            var obj = {};
            obj.frac = 1;
            obj.sliceidx = 0;
            return obj;
        };



        QueryTool.Create = function(tableid, settings) {
            var that={};
            that.tableInfo = MetaData.getTableInfo(tableid);
            that.query = SQL.WhereClause.decode(SQL.WhereClause.encode(that.tableInfo.defaultQuery));
            that.hasSubSampler = false;
            if (that.tableInfo.currentQuery)
                that.query = SQL.WhereClause.decode(SQL.WhereClause.encode(that.tableInfo.currentQuery));
            that.prevQueries = [];

            if (settings) {
                that.includeCurrentQuery = settings.includeCurrentQuery;
                that.hasSubSampler = settings.hasSubSampler;
            }

            that.setStartQuery = function(qry) {
                that.query = SQL.WhereClause.decode(SQL.WhereClause.encode(qry));
            }

            that.get = function() {
                return that.query;
            }

            that.getForFetching = function() {
                if (!that.hasSubSampler)
                    return that.get();
                var cnt = that.subSamplerMapper(that.ctrlSubSampler.getValue());
                if (cnt<0)
                    return that.query;
                else {
//                    var sliceCount = Math.floor(1.0/frac);
                    var sliceNr = that.reSampleSliceIndex;// % sliceCount;
                    var fr1 = sliceNr * cnt;
                    var fr2 = (sliceNr+1) * cnt;
                    return SQL.WhereClause.createRestriction(that.query, SQL.WhereClause.CompareBetween('RandPrimKey', fr1, fr2) );
                }
            }

            that.isSubSampling = function() {
                if (!that.hasSubSampler)
                    return false;
                var frac = that.subSamplerMapper(that.ctrlSubSampler.getValue());
                return (frac>0);
            };

            that.getSubSamplingOptions = function() {
                var obj = {};
                if (that.hasSubSampler) {
                    obj.frac = that.ctrlSubSampler.getValue();
                    obj.sliceidx = that.reSampleSliceIndex;
                }
                return obj;
            };

            that.setSubSamplingOptions = function(settObj) {
                if (that.hasSubSampler) {
                    that.ctrlSubSampler.modifyValue(settObj.frac);
                    if (settObj.sliceidx != null)
                        that.reSampleSliceIndex = settObj.sliceidx;
                }
            };


            that.store = function() {
                var obj = {
                    query: SQL.WhereClause.encode(that.query)
                };
                if (that.hasSubSampler) {
                    obj.frac = that.ctrlSubSampler.getValue();
                    obj.sliceidx = that.reSampleSliceIndex;
                }
                return obj;
            }

            that.recall = function(settObj, notify) {
                that.query = SQL.WhereClause.decode(settObj.query);
                if (that.ctrlQueryString)
                    that.ctrlQueryString.modifyValue(that.tableInfo.tableViewer.getQueryDescription(that.query));
                if (that.clearQueryShowHide)
                    that.clearQueryShowHide.setVisible(!that.query.isTrivial);
                if (that.hasSubSampler) {
                    that.ctrlSubSampler.modifyValue(settObj.frac);
                    if (settObj.sliceidx != null)
                        that.reSampleSliceIndex = settObj.sliceidx;
                }
                if (notify && that.notifyQueryUpdated)
                  that.notifyQueryUpdated();
            }

            that.modify = function(qry) {
                that.prevQueries.push(SQL.WhereClause.encode(that.query));
                that.query = qry;
                if (that.ctrlQueryString) {
                    that.ctrlQueryString.modifyValue(that.tableInfo.tableViewer.getQueryDescription(qry));
                }
                if (that.clearQueryShowHide)
                    that.clearQueryShowHide.setVisible(!that.query.isTrivial);
                if (that.notifyQueryUpdated)
                    that.notifyQueryUpdated();
            }


            that.createQueryControl = function(controlSettings, extraControlsList) {

                var defaultHidden = false;
                if (controlSettings && controlSettings.defaultHidden)
                    defaultHidden = true;

                var hasDefine = true;
                if (controlSettings && controlSettings.noDefine)
                    hasDefine = false;

                var hasSection = false;
                if (controlSettings && controlSettings.hasSection)
                    hasSection = true;

                var hasQueryString = false;
                if (controlSettings && controlSettings.hasQueryString)
                    hasQueryString = true;


                that.controlsWidth = 185;
                if (controlSettings && controlSettings.controlsWidth)
                    that.controlsWidth = controlSettings.controlsWidth;


                var theControl = Controls.BaseCustom(true).setMargin(0);

                var group = Controls.CompoundVert().setMargin(6);

                if (that.hasSubSampler) {
                    that.reSampleSliceIndex = 0;

                    var subSampleFrac = 0.65;
                    if (settings.subSamplingOptions) {
                        that.reSampleSliceIndex = settings.subSamplingOptions.sliceidx;
                        subSampleFrac = settings.subSamplingOptions.frac;
                    }

                    that.ctrlSubSampler = Controls.ValueSlider(null, {label: 'Subsampling:', width: that.controlsWidth, height: 18, minval:0, maxval:1, value:subSampleFrac, digits: 10, drawIndicators: false})
                        .setNotifyOnFinished()
                        .setOnChanged(function() {
                            that.reSampleSliceIndex = 0;
                            that.notifyQueryUpdated();
                        });

                    var subSampleValues = [20,50,100,200,500,1000,2000,5000,10000,20000,50000,100000,200000,500000,1000000];
                    that.subSamplerMapper = function(frc) {
                        if (frc>0.95)
                            return -1;
                        var vl  = Math.pow(1.0e6,(frc+0.3)/1.3);
                        var dst = 1.0e9;
                        var bestval=1;
                        $.each(subSampleValues, function(idx, tryval) {
                            if (dst>Math.abs(tryval-vl)) {
                                bestval = tryval;
                                dst = Math.abs(tryval-vl);
                            }
                        });
                        return bestval;
                        //return Math.max(1.0e-4, Math.min(1.0,Math.pow(frc*1.05,3)));
                    }
                    that.ctrlSubSampler.customValueMapper = function(vl) {
                        var frac = that.subSamplerMapper(vl);
                        var st = '';
                        if (frac<0) {
                            st = 'All';
                            //st = '<span style="color:rgb(0,128,0);font-size:13pt;"><b>' + st + '</b></span>';
                        }
                        else {
                            st = (frac).toFixed(0);
                            if (frac>10000)
                                var st = (frac/1000.0).toFixed(0)+'K';
                            //st = '<span style="color:red;background-color:yellow;font-size:13pt;"><b>' + st + '</b></span>';
                        }
                        return st;
                    };

//                    that.ctrlReSample = Controls.ImageButton(null, { bitmap:"Bitmaps/actionbuttons/reload.png", hint:"Resample", vertShift:18})
//                    that.ctrlReSample.setOnChanged(function() {
//                        that.reSampleSliceIndex += 1;
//                        that.notifyQueryUpdated();
//                    });

                    group.addControl(Controls.CompoundHor([
                        that.ctrlSubSampler,
//                        Controls.HorizontalSeparator(4),
//                        that.ctrlReSample
                    ]));
                }


                if (hasDefine) {
                    var buttonDefineQuery = Controls.Button(null, { content: 'Define query', buttonClass: 'PnButtonGrid', width:130, height:30, icon:'fa-filter' });
                    buttonDefineQuery.setOnChanged(function() {
                        EditQuery.CreateDialogBox(that.tableInfo.id, that.query, function(query) {
                            that.modify(query);
                        });
                    });


                    that.buttonOpen = Controls.Button(null, { content: ' ', hint:'Open existing query', buttonClass: 'PnButtonGrid', bitmap:'Bitmaps/ellipsis.png', width:30, height:30}).setOnChanged(function() {
                        QueryTool.createOpenQueryPopup(that);
                    });

                }


                if (hasQueryString) {
                    that.clearQuery = Controls.Button(null, {
                        hint: 'Clear Query',
                        buttonClass: "PnClearQuery",
                        bitmap: DQX.BMP('closeSmall.png')
                    });
                    that.clearQuery.setOnChanged(function() {
                        that.modify(SQL.WhereClause.Trivial());
                    });
                    that.clearQueryShowHide = Controls.ShowHide(that.clearQuery);
                    that.clearQueryShowHide.setVisible(!that.query.isTrivial);
                    that.ctrlQueryString = Controls.Html(null,that.tableInfo.tableViewer.getQueryDescription(that.query), 'PnQueryString');
                    group.addControl(Controls.CompoundFloat([that.clearQueryShowHide, that.ctrlQueryString]));
                }

                if (hasDefine)
                    group.addControl(Controls.CompoundHor([buttonDefineQuery, that.buttonOpen]));


                if (extraControlsList) {
                    $.each(extraControlsList, function(idx, ctrl) {
                        group.addControl(ctrl);
                    });
                }


                that.updateStoredQueries();

                Msg.listen('', { type: 'StoredQueriesModified'}, function(scope, content) {
                    if (content.tableid == that.tableInfo.id)
                        that.updateStoredQueries();
                });

                if (hasSection) {
                    theControl.addControl(Controls.Section(group, {
                        title: that.tableInfo.tableCapNamePlural + ' query',
                        bodyStyleClass: 'ControlsSectionBody',
                        defaultCollapsed: defaultHidden
                    }));
                }
                else
                    theControl.addControl(group);

                return theControl;
            }

            that.updateStoredQueries = function() {
//                var getter = DataFetchers.ServerDataGetter();
//                getter.addTable(
//                    'storedqueries',['id','name'],'name',
//                    SQL.WhereClause.AND([
//                        SQL.WhereClause.CompareFixed('workspaceid', '=', MetaData.workspaceid),
//                        SQL.WhereClause.CompareFixed('tableid', '=', that.tableInfo.id)
//                    ])
//                );
//                getter.execute(MetaData.serverUrl, MetaData.database, function() {
//                    var data = getter.getTableRecords('storedqueries');
//                    var states = [];
//                    states.push({id:'', name:'[ Queries ]'})
//                    states.push({id:'_all_', name:'- All '+that.tableInfo.name+' -'})
//                    states.push({id:'_storedselection_', name:'- Stored selection -'})
//                    if (that.includeCurrentQuery)
//                        states.push({id:'_current_', name:'- '+that.tableInfo.name+' active in table -'})
//                    $.each(data, function(idx, record) {
//                        states.push({id:record.id, name:record.name});
//                    });
//                    states.push({id:'_manage_', name:'---- EDIT STORED QUERIES ----'})
//                    that.ctrlPick.setItems(states,'');
//                    //debugger;
//                });
            };

//            that.handlePickQuery = function() {
//                var state = that.ctrlPick.getValue();
//                that.ctrlPick.modifyValue('');
//
//                if (state=='_manage_') {
//                    newValue = null;
//                    if (that.query)
//                        newValue = that.store().query;
//                    ManageStoredEntities.manage('storedqueries', that.tableInfo.id, 'stored query', 'stored queries', newValue);
//                    return;
//                }
//
//                if (state=='_all_') {
//                    that.modify(SQL.WhereClause.Trivial());
//                    return;
//                }
//
//                if (state=='_storedselection_') {
//                    that.modify(SQL.WhereClause.CompareFixed('StoredSelection', '=', 1));
//                    return;
//                }
//
//                if (state=='_current_') {
//                    var tableView = Application.getView('table_'+that.tableInfo.id);
//                    var currentQuery = tableView.theQuery.get();
//                    if (!currentQuery)
//                        currentQuery = SQL.WhereClause.Trivial();
//                    currentQuery.sortColumn = tableView.getSortColumn();
//                    that.modify(currentQuery);
//                    return;
//                }
//
//                if (state) {
//                    DataFetchers.fetchSingleRecord(MetaData.serverUrl, MetaData.database, 'storedqueries', 'id', state, function(rsp) {
//                        that.modify(SQL.WhereClause.decode(rsp.content));
//                    });
//
//                }
//            }

            that.createQueryDisplayStringHtml = function() {
                var content = '';
                content = that.tableInfo.createQueryDisplayString(that.get());
                if (that.isSubSampling()) {
                    var frac = that.subSamplerMapper(that.ctrlSubSampler.getValue());
                    content += '<br><span style="color:rgb(150,100,100)">(from a <span style="color:rgb(192,0,0);"><b>{count}</b></span> {names} random subsampling set)</span>'.DQXformat({
                        count: frac,
                        names: that.tableInfo.tableNamePlural
                    });

                }
                return content;
            };

            return that;
        }






        QueryTool.CreateStoredQueryPicker = function(tableid, pickedHandler) {
            that = Controls.BaseCustom();
            that.tableInfo = MetaData.getTableInfo(tableid);
            that.pickedHandler = pickedHandler;

            that.handlePickQuery = function() {
                var state = that.ctrlPick.getValue();
                that.ctrlPick.modifyValue('');


                if (state=='_all_') {
                    that.pickedHandler(SQL.WhereClause.Trivial());
                    return;
                }

                if (state) {
                    DataFetchers.fetchSingleRecord(MetaData.serverUrl, MetaData.database, 'storedqueries', 'id', state, function(rsp) {
                        that.pickedHandler(SQL.WhereClause.decode(rsp.content));
                    });
                }
            }


            that.ctrlPick = Controls.Combo(null, { label:'', states:[], width:130 }).setOnChanged(that.handlePickQuery);

            that.addControl(that.ctrlPick);

            that.updateStoredQueries = function() {
                var getter = DataFetchers.ServerDataGetter();
                getter.addTable(
                    'storedqueries',['id','name'],'name',
                    SQL.WhereClause.AND([
                        SQL.WhereClause.CompareFixed('workspaceid', '=', MetaData.workspaceid),
                        SQL.WhereClause.CompareFixed('tableid', '=', that.tableInfo.id)
                    ])
                );
                getter.execute(MetaData.serverUrl, MetaData.database, function() {
                    var data = getter.getTableRecords('storedqueries');
                    var states = [];
                    states.push({id:'', name:'[ Queries ]'})
                    states.push({id:'_all_', name:'All '+that.tableInfo.name})
                    $.each(data, function(idx, record) {
                        states.push({id:record.id, name:record.name});
                    });
                    that.ctrlPick.setItems(states,'');
                    //debugger;
                });
            };

            that.updateStoredQueries();

            Msg.listen('', { type: 'StoredQueriesModified'}, function(scope, content) {
                if (content.tableid == that.tableInfo.id)
                    that.updateStoredQueries();
            });




            return that;
        }





        QueryTool.createOpenQueryPopup = function(iQueryTool) {
            var that = PopupFrame.PopupFrame('OpenStoredQuery_'+iQueryTool.tableInfo.id, {title:'Open '+iQueryTool.tableInfo.tableNamePlural+' query', blocking:true, sizeX:500, sizeY:450 });
            that.queryTool = iQueryTool;
            that.tableInfo = iQueryTool.tableInfo;

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                var frameGroupTop = that.frameRoot.addMemberFrame(Framework.FrameGroupVert('', 0.7)).setSeparatorSize(2);
                //that.frameInfo = frameGroupTop.addMemberFrame(Framework.FrameFinal('', 0.01)).setFrameClassClient('InfoBox')
                //    .setMargins(8).setAutoSize().setAllowScrollBars(false, false);
                that.frameTree = frameGroupTop.addMemberFrame(Framework.FrameFinal('', 0.99))
                    .setAllowScrollBars(false,true);
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 47).setFrameClassClient('DQXGrayClient')
                    .setAllowScrollBars(false,false);
            };

            that.createPanels = function() {

                //var panelInfo = Framework.Form(this.frameInfo);
                //panelInfo.addHtml("A subset is a named collection of {names} that is saved on the server, and can be shared with other users.".DQXformat({names: that.tableInfo.tableNamePlural}));
                //panelInfo.render();

                that.panelTree = FrameTree.Tree(that.frameTree);


//                that.panelList.setOnOpen(that.handleOpenSubset);

                that.panelButtons = Framework.Form(that.frameButtons);



                that.getStoredQueries();

            };


            that.getStoredQueries = function() {
                var getter = DataFetchers.ServerDataGetter();
                getter.addTable(
                    'storedqueries',['id','name'],'name',
                    SQL.WhereClause.AND([
                        SQL.WhereClause.CompareFixed('workspaceid', '=', MetaData.workspaceid),
                        SQL.WhereClause.CompareFixed('tableid', '=', that.tableInfo.id)
                    ])
                );
                getter.execute(MetaData.serverUrl, MetaData.database, function() {
                    var data = getter.getTableRecords('storedqueries');
                    that.storedQueries = [];
                    $.each(data, function(idx, record) {
                        that.storedQueries.push({id:record.id, name:record.name});
                    });
                    that.renderItems();
                    //debugger;
                });
            };

            that.renderItems = function() {
                that.panelTree.clear();
                var prevQueryList = [];
                if (that.queryTool.prevQueries.length>0) {
                    var query = SQL.WhereClause.decode(that.queryTool.prevQueries[that.queryTool.prevQueries.length-1]);
                    if (!query.isTrivial) {
                        prevQueryList.push({
                            id: '_previous_',
                            name: 'Previous query <span style="color:rgb(150,150,150)">(' + that.tableInfo.createQueryDisplayString(query) + ')</span>'
                        })
                    }
                };
                if (!that.queryTool.query.isTrivial) {
                    prevQueryList.push({
                        id: '_all_',
                        name: 'All '+that.tableInfo.tableNamePlural
                    })
                };
                if (prevQueryList.length>0) {
                    $.each(prevQueryList, function(idx, query) {
                        var str = '<div style="padding-bottom:5px;padding-top:5px"><img style="position:relative;top:2px" src="Bitmaps/actionbuttons/open.png"/>&nbsp;' + query.name+'</div>';
                        var item = FrameTree.Branch(query.id, str);
                        that.panelTree.root.addItem(item);
                    });
                }

                var buttonManageStoredQueries = Controls.ImageButton(null, { bitmap:'Bitmaps/actionbuttons/edit.png', hint:'Edit stored queries', vertShift:-3})
                buttonManageStoredQueries.setOnChanged(function() {
                    newValue = null;
                    if (that.queryTool.query)
                        newValue = that.queryTool.store().query;
                    that.close();
                    ManageStoredEntities.manage('storedqueries', that.tableInfo.id, 'stored query', 'stored queries', newValue);
                });

                var grpStoredQueries = FrameTree.Control(Controls.CompoundHor([Controls.Static('<div style="font-size: 120%;font-weight: bold">Stored queries&nbsp;&nbsp;</div>'), buttonManageStoredQueries]));
                grpStoredQueries.canCollapse = false;
                that.panelTree.root.addItem(grpStoredQueries);

                $.each(that.storedQueries, function(idx, query) {
                    var str = '<img style="position:relative;top:2px" src="Bitmaps/actionbuttons/open.png"/>&nbsp;' + query.name;
                    var item = FrameTree.Branch('storedquery_l_'+query.id, str);
                    grpStoredQueries.addItem(item);
                });
                if (that.storedQueries.length == 0) {
                    var item = FrameTree.Branch(null, '<span class="SupportingText"><i>There are currently no stored queries present for {names}. You can store the current query by clicking on the edit button.</i></span>'.DQXformat({names: that.tableInfo.tableNamePlural}));
                    item.setCanSelect(false);
                    grpStoredQueries.addItem(item);
                }

                that.panelTree.notifyClickTreeItem = function(id) {
                    if (id == '_all_') {
                        that.queryTool.modify(SQL.WhereClause.Trivial());
                        that.close();
                        return;
                    }
                    if (id == '_previous_') {
                        that.queryTool.modify(SQL.WhereClause.decode(that.queryTool.prevQueries.pop()));
                        that.queryTool.prevQueries.pop();
                        that.close();
                        return;
                    }
                    if (id.split('_l_')[0] == 'storedquery') {
                        queryid = id.split('_l_')[1];
                        DataFetchers.fetchSingleRecord(MetaData.serverUrl, MetaData.database, 'storedqueries', 'id', queryid, function(rsp) {
                            that.queryTool.modify(SQL.WhereClause.decode(rsp.content));
                        });
                        that.close();
                        return;
                    }
                }

                that.panelTree.render();
            }


            that.create();
            return that;
        };





        return QueryTool;
    });


