define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "Wizards/ManageStoredEntities", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, ManageStoredEntities, MetaData) {

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
            that.query = SQL.WhereClause.Trivial();
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
                that.ctrlQueryString.modifyValue(that.tableInfo.tableViewer.getQueryDescription(that.query));
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
                    that.buttonPrevQuery.modifyEnabled(true);
                }
                if (that.notifyQueryUpdated)
                    that.notifyQueryUpdated();
            }



            that.createQueryControl = function(settings, extraControlsList) {

                var theControl = Controls.BaseCustom(true).setMargin(0);

                var group = Controls.CompoundVert().setMargin(12);

                if (that.hasSubSampler) {
                    that.reSampleSliceIndex = 0;

                    var subSampleFrac = 0.65;
                    if (settings.subSamplingOptions) {
                        that.reSampleSliceIndex = settings.subSamplingOptions.sliceidx;
                        subSampleFrac = settings.subSamplingOptions.frac;
                    }

                    that.ctrlSubSampler = Controls.ValueSlider(null, {label: 'Subsampling', width: 165, height: 18, minval:0, maxval:1, value:subSampleFrac, digits: 10, drawIndicators: false})
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
                            st = '<span style="color:rgb(0,128,0);font-size:13pt;"><b>' + st + '</b></span>';
                        }
                        else {
                            st = (frac).toFixed(0);
                            if (frac>10000)
                                var st = (frac/1000.0).toFixed(0)+'K';
                            st = '<span style="color:red;background-color:yellow;font-size:13pt;"><b>' + st + '</b></span>';
                        }
                        return st;
                    };

                    that.ctrlReSample = Controls.ImageButton(null, { bitmap:"Bitmaps/actionbuttons/reload.png", hint:"Resample", vertShift:18})
                    that.ctrlReSample.setOnChanged(function() {
                        that.reSampleSliceIndex += 1;
                        that.notifyQueryUpdated();
                    });

                    group.addControl(Controls.CompoundHor([that.ctrlSubSampler, Controls.HorizontalSeparator(4), that.ctrlReSample]));
                }


                var buttonDefineQuery = Controls.Button(null, { content: 'Define query...', buttonClass: 'PnButtonLarge', width:110, height:35, bitmap: DQX.BMP('filter1.png') });
                buttonDefineQuery.setOnChanged(function() {
                    EditQuery.CreateDialogBox(that.tableInfo.id, that.query, function(query) {
                        that.modify(query);
                    });
                });

                var states = [ {id:'', name:'- Stored queries -'}, {id:'_all_', name:'All '+that.tableInfo.name}, {id:'_manage_', name:'- Manage... -'} ];
                that.ctrlPick = Controls.Combo(null, { label:'', states:states, width:160 }).setOnChanged(that.handlePickQuery);

                that.buttonPrevQuery = Controls.Button(null, { content: ' ', hint:'Back to previous query', buttonClass: 'PnButtonLarge', bitmap: DQX.BMP('link2.png'), width:25, height:35}).setOnChanged(function() {
                    if (that.prevQueries.length>0) {
                        that.query = SQL.WhereClause.decode(that.prevQueries.pop());
                        that.ctrlQueryString.modifyValue(that.tableInfo.tableViewer.getQueryDescription(that.query));
                        that.notifyQueryUpdated();
                        that.buttonPrevQuery.modifyEnabled(that.prevQueries.length>0);
                    }
                });
                that.buttonPrevQuery.modifyEnabled(that.prevQueries.length>0);


                that.ctrlQueryString = Controls.Html(null,that.tableInfo.tableViewer.getQueryDescription(that.query));


                group.addControl(Controls.CompoundHor([buttonDefineQuery, Controls.HorizontalSeparator(10), that.buttonPrevQuery]));
                group.addControl(that.ctrlPick);
                group.addControl(that.ctrlQueryString);


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

                var defaultHidden = false;
                if (settings && settings.defaultHidden)
                    defaultHidden = true;

                theControl.addControl(Controls.Section(group, {
                    title: that.tableInfo.tableCapNamePlural + ' filter',
                    bodyStyleClass: 'ControlsSectionBody',
                    defaultCollapsed: defaultHidden
                }));

                return theControl;
            }

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
                    states.push({id:'_all_', name:'- All '+that.tableInfo.name+' -'})
                    states.push({id:'_storedselection_', name:'- Stored selection -'})
                    if (that.includeCurrentQuery)
                        states.push({id:'_current_', name:'- '+that.tableInfo.name+' active in table -'})
                    $.each(data, function(idx, record) {
                        states.push({id:record.id, name:record.name});
                    });
                    states.push({id:'_manage_', name:'---- EDIT STORED QUERIES ----'})
                    that.ctrlPick.setItems(states,'');
                    //debugger;
                });
            };

            that.handlePickQuery = function() {
                var state = that.ctrlPick.getValue();
                that.ctrlPick.modifyValue('');

                if (state=='_manage_') {
                    newValue = null;
                    if (that.query)
                        newValue = that.store().query;
                    ManageStoredEntities.manage('storedqueries', that.tableInfo.id, 'stored query', 'stored queries', newValue);
                    return;
                }

                if (state=='_all_') {
                    that.modify(SQL.WhereClause.Trivial());
                    return;
                }

                if (state=='_storedselection_') {
                    that.modify(SQL.WhereClause.CompareFixed('StoredSelection', '=', 1));
                    return;
                }

                if (state=='_current_') {
                    var tableView = Application.getView('table_'+that.tableInfo.id);
                    var currentQuery = tableView.theQuery.get();
                    if (!currentQuery)
                        currentQuery = SQL.WhereClause.Trivial();
                    currentQuery.sortColumn = tableView.getSortColumn();
                    that.modify(currentQuery);
                    return;
                }

                if (state) {
                    DataFetchers.fetchSingleRecord(MetaData.serverUrl, MetaData.database, 'storedqueries', 'id', state, function(rsp) {
                        that.modify(SQL.WhereClause.decode(rsp.content));
                    });

                }
            }

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



        return QueryTool;
    });


