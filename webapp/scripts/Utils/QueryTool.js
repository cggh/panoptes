define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "Wizards/ManageStoredEntities", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, ManageStoredEntities, MetaData) {

        var QueryTool = {};





        QueryTool.Create = function(tableid) {
            var that={};
            that.tableInfo = MetaData.mapTableCatalog[tableid];
            that.query = SQL.WhereClause.Trivial();
            if (that.tableInfo.currentQuery)
                that.query = SQL.WhereClause.decode(SQL.WhereClause.encode(that.tableInfo.currentQuery));
            that.prevQueries = [];

            that.get = function() {
                return that.query;
            }

            that.store = function() {
                return SQL.WhereClause.encode(that.query);
            }

            that.recall = function(settObj) {
                that.query = SQL.WhereClause.decode(settObj);
                that.ctrlQueryString.modifyValue(that.tableInfo.tableViewer.getQueryDescription(that.query));
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

            that.createPickSortedQueryStates = function() {
                var states = [];
                states.push({id:'', name:'- Pick stored query -'})
                states.push({id:'_manage_', name:'- Manage queries... -'})
                return states;
            }


            that.createControl = function() {
                var buttonDefineQuery = Controls.Button(null, { content: 'Define query...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: DQX.BMP('filter1.png') });
                buttonDefineQuery.setOnChanged(function() {
                    EditQuery.CreateDialogBox(that.tableInfo.id, that.query, function(query) {
                        that.modify(query);
                    });
                });

                that.ctrlPick = Controls.Combo(null, { label:'', states:that.createPickSortedQueryStates()}).setOnChanged(that.handlePickQuery);

                that.buttonPrevQuery = Controls.Button(null, { content: 'Previous'}).setOnChanged(function() {
                    if (that.prevQueries.length>0) {
                        that.query = SQL.WhereClause.decode(that.prevQueries.pop());
                        that.ctrlQueryString.modifyValue(that.tableInfo.tableViewer.getQueryDescription(that.query));
                        that.notifyQueryUpdated();
                        that.buttonPrevQuery.modifyEnabled(that.prevQueries.length>0);
                    }
                });
                that.buttonPrevQuery.modifyEnabled(that.prevQueries.length>0);

                that.ctrlQueryString = Controls.Html(null,that.tableInfo.tableViewer.getQueryDescription(that.query));

                var group = Controls.CompoundVert([
                    buttonDefineQuery,
                    that.ctrlPick,
                    that.buttonPrevQuery,
                    that.ctrlQueryString
                ]);

                group.setLegend("Active "+that.tableInfo.name);

                return group;
            }


            that.handlePickQuery = function() {
                var state = that.ctrlPick.getValue();
                that.ctrlPick.modifyValue('');

                if (state=='_manage_') {
                    newValue = null;
                    if (that.query)
                        newValue = that.store();
                    ManageStoredEntities.manage('storedqueries', 'stored query', 'stored queries', newValue);
                }
            }

            return that;
        }



        return QueryTool;
    });


