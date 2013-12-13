define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "Wizards/ManageStoredEntities", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, ManageStoredEntities, MetaData) {

        var QueryTool = {};





        QueryTool.Create = function(tableid, settings) {
            var that={};
            that.tableInfo = MetaData.getTableInfo(tableid);
            that.query = SQL.WhereClause.Trivial();
            if (that.tableInfo.currentQuery)
                that.query = SQL.WhereClause.decode(SQL.WhereClause.encode(that.tableInfo.currentQuery));
            that.prevQueries = [];

            if (settings) {
                that.includeCurrentQuery = settings.includeCurrentQuery;
            }

            that.get = function() {
                return that.query;
            }

            that.store = function() {
                return SQL.WhereClause.encode(that.query);
            }

            that.recall = function(settObj, notify) {
                that.query = SQL.WhereClause.decode(settObj);
                that.ctrlQueryString.modifyValue(that.tableInfo.tableViewer.getQueryDescription(that.query));
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



            that.createControl = function() {

                var theControl = Controls.BaseCustom(true);
                theControl.setLegend("Active "+that.tableInfo.name).setAutoFillX(true);

                var buttonDefineQuery = Controls.Button(null, { content: 'Define query...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: DQX.BMP('filter1.png') });
                buttonDefineQuery.setOnChanged(function() {
                    EditQuery.CreateDialogBox(that.tableInfo.id, that.query, function(query) {
                        that.modify(query);
                    });
                });

                var states = [ {id:'', name:'- Stored queries -'}, {id:'_all_', name:'All '+that.tableInfo.name}, {id:'_manage_', name:'- Manage... -'} ];
                that.ctrlPick = Controls.Combo(null, { label:'', states:states, width:130 }).setOnChanged(that.handlePickQuery);

                that.buttonPrevQuery = Controls.Button(null, { content: 'Previous', hint:'Back to previous query', buttonClass: 'DQXToolButton2', bitmap: DQX.BMP('link2.png'), width:120, height:20}).setOnChanged(function() {
                    if (that.prevQueries.length>0) {
                        that.query = SQL.WhereClause.decode(that.prevQueries.pop());
                        that.ctrlQueryString.modifyValue(that.tableInfo.tableViewer.getQueryDescription(that.query));
                        that.notifyQueryUpdated();
                        that.buttonPrevQuery.modifyEnabled(that.prevQueries.length>0);
                    }
                });
                that.buttonPrevQuery.modifyEnabled(that.prevQueries.length>0);


                that.ctrlQueryString = Controls.Html(null,that.tableInfo.tableViewer.getQueryDescription(that.query));

                theControl.addControl(buttonDefineQuery);
                theControl.addControl(that.ctrlPick);
                theControl.addControl(that.buttonPrevQuery);
                theControl.addControl(that.ctrlQueryString);


                that.updateStoredQueries();

                Msg.listen('', { type: 'StoredQueriesModified'}, function(scope, content) {
                    if (content.tableid == that.tableInfo.id)
                        that.updateStoredQueries();
                });

                return theControl;
                //return group;
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
                        newValue = that.store();
                    ManageStoredEntities.manage('storedqueries', that.tableInfo.id, 'stored query', 'stored queries', newValue);
                    return;
                }

                if (state=='_all_') {
                    that.modify(SQL.WhereClause.Trivial());
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


