// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/QueryTable", "DQX/QueryBuilder", "DQX/DataFetcher/DataFetchers", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "Utils/QueryTool", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, QueryTable, QueryBuilder, DataFetchers, DocEl, DQX, Wizard, Popup, PopupFrame, QueryTool, MetaData) {

        var EditTableBasedSummaryValues = {};

        EditTableBasedSummaryValues.storedValues = {};

        EditTableBasedSummaryValues.prompt = function(tableid) {
            var tableInfo = MetaData.getTableInfo(tableid);
            var content = '';

            var countInfo = Controls.Html(null,'');
            content += countInfo.renderHtml()+'<p>';
            var updateCountInfo = function() {
                countInfo.modifyValue('Currently active: '+tableInfo.genomeTrackSelectionManager.getSelectedCount());
            }

            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', height:45, width:140, icon:'fa-crosshairs', content: 'Pick '+tableInfo.name+'...' }).setOnChanged(function() {
                Popup.closeIfNeeded(popupid);
                EditTableBasedSummaryValues.CreateDialogBox(tableid);
            });
            content += bt.renderHtml();

            var str = 'Use current query';
            var recordCount  = Application.getView('table_'+tableid).getRecordCount();
            if (recordCount!=null)
                str += '<br>('+recordCount+' items)';
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', height:45, width:140, icon:'fa-filter', content: str }).setOnChanged(function() {
                Popup.closeIfNeeded(popupid);
                DQX.executeProcessing(function() {
                    EditTableBasedSummaryValues.loadCurrentQuery(tableid);
                });
            });
            content += bt.renderHtml();

            content += '<br>';


            var str = 'Use currently highlighted';
            var recordCount  = tableInfo.getSelectedList().length;
            str += '<br>('+recordCount+' items)';
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', height:45, width:140, icon: 'fa-check-circle' , content: str }).setOnChanged(function() {
                Popup.closeIfNeeded(popupid);
                DQX.executeProcessing(function() {
                    EditTableBasedSummaryValues.loadCurrentSelection(tableid);
                });
            });
            content += bt.renderHtml();


            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', height:45, width: 140, icon:'fa-ban', content: 'Clear all' }).setOnChanged(function() {
                DQX.executeProcessing(function() {
                    Popup.closeIfNeeded(popupid);
                    tableInfo.genomeTrackSelectionManager.clearAll();
//                    updateCountInfo();
                });
            });
            content += bt.renderHtml();

            content += '<p/>';

            var picker = QueryTool.CreateStoredQueryPicker(tableid, function(query) {
                EditTableBasedSummaryValues.loadQuery(tableid, query);
                Popup.closeIfNeeded(popupid);
            });
            content += 'Load a query: '+picker.renderHtml();
            content += '<p/>';

            var popupid = Popup.create(tableInfo.name+' active genome tracks', content);
            updateCountInfo();
        };


        EditTableBasedSummaryValues.loadCurrentQuery = function(tableid) {
            var tableInfo = MetaData.getTableInfo(tableid);
            var tableView = Application.getView('table_'+tableid);


            var currentQuery = tableView.theQuery.get();
            if (!currentQuery)
                currentQuery = SQL.WhereClause.Trivial();
            currentQuery.sortColumn = tableView.getSortColumn();

            EditTableBasedSummaryValues.loadQuery(tableid,currentQuery);
        };

        EditTableBasedSummaryValues.loadQuery = function(tableid, query) {
            var tableInfo = MetaData.getTableInfo(tableid);
            var tableView = Application.getView('table_'+tableid);

            tableInfo.genomeTrackSelectionManager.clearAll();

            var sortColumn = query.sortColumn;
            if (!sortColumn)
                sortColumn = tableInfo.primkey;
            var maxlength = 200;
            var fetcher = DataFetchers.RecordsetFetcher(
                MetaData.serverUrl,
                MetaData.database,
                tableid + 'CMB_' + MetaData.workspaceid
            );
            fetcher.setMaxResultCount(maxlength);
            fetcher.addColumn(tableInfo.primkey, 'GN');
            fetcher.getData(query, sortColumn, function (data) {
                    var list = data[tableInfo.primkey];
                    if (list.length>=maxlength)
                        alert('WARNING: set will be truncated to '+maxlength);
                    var cnt = 0;
                    $.each(list, function(idx, key) {
                        cnt += 1;
                        if (cnt<=maxlength) {
                            tableInfo.genomeTrackSelectionManager.selectItem(key,true, true);
                        }
                    });
                    tableInfo.genomeTrackSelectionManager.notifyChanged();
                }
            );
        };


        EditTableBasedSummaryValues.loadCurrentSelection = function(tableid) {
            var tableInfo = MetaData.getTableInfo(tableid);
            tableInfo.genomeTrackSelectionManager.clearAll();
            $.each(tableInfo.getSelectedList(), function(idx, key) {
                tableInfo.genomeTrackSelectionManager.selectItem(key,true, true);
            });
            tableInfo.genomeTrackSelectionManager.notifyChanged();
        };


        EditTableBasedSummaryValues.CreateDialogBox = function(tableid) {
            var that = PopupFrame.PopupFrame('EditTableBasedSummaryValues', {title:'Active genome tracks', blocking:true, sizeX:700, sizeY:500 });
            that.tableInfo = MetaData.getTableInfo(tableid);

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                that.frameQuery = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 60).setFrameClassClient('DQXGrayClient');
                that.frameBody = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(true,true);
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 70).setFrameClassClient('DQXGrayClient');
            };

            that.createPanels = function() {

                that.panelQuery = Framework.Form(that.frameQuery);
                var queries = [];
                that.queryControls = {};
                $.each(that.tableInfo.quickFindFields, function(idx, propid) {
                    var propInfo = MetaData.findProperty(that.tableInfo.id, propid);


                    if (!propInfo.propCategories) {
                        var ctrl = Controls.Edit(null,{size:12});
                    }
                    else {
                        var cats = [{id:'', name:'[All]'}];
                        $.each(propInfo.propCategories, function(idx, cat) {
                            cats.push({id:cat, name:cat});
                        });
                        var ctrl = Controls.Combo(null,{size:18, label:'', states:cats});
                    }
                    if (propid in EditTableBasedSummaryValues.storedValues)
                        ctrl.modifyValue(EditTableBasedSummaryValues.storedValues[propid])

                    ctrl.setOnChanged(DQX.debounce(that.updateQuery,200));
                    that.queryControls[propid] = ctrl;
                    queries.push(Controls.HorizontalSeparator(5));
                    queries.push(Controls.CompoundVert([
                        Controls.Static(propInfo.name+':'),
                        ctrl
                    ]).setTreatAsBlock());
                });
                that.panelQuery.addControl(Controls.CompoundHor(queries));

                //that.panelBody = Framework.Form(that.frameBody).setPadding(10);
                that.panelButtons = Framework.Form(that.frameButtons);

                var bt_clearall = Controls.Button(null, { buttonClass: 'DQXWizardButton', content: 'Clear all' }).setOnChanged(function() {
                    that.tableInfo.genomeTrackSelectionManager.clearAll();
                    that.myTable.render();
                });

                var bt_close = Controls.Button(null, { buttonClass: 'DQXWizardButton', content: 'Close', bitmap: DQX.BMP('ok.png'), width:80, height:25 }).setOnChanged(function() {
                    that.close();
                });

                that.panelButtons.addControl(Controls.CompoundHor([
                    Controls.HorizontalSeparator(7),
                    bt_clearall
                ]));
                that.panelButtons.addControl(Controls.AlignRight(Controls.CompoundHor([
                    bt_close,
                    Controls.HorizontalSeparator(7)
                ])));


                //Initialise the data fetcher that will download the data for the table
                if (!that.tableInfo.summaryValuesTableFetcher) {
                    that.tableInfo.summaryValuesTableFetcher = DataFetchers.Table(
                        MetaData.serverUrl,
                        MetaData.database,
                        that.tableInfo.id
                    );
                }

                that.panelTable = QueryTable.Panel(
                    that.frameBody,
                    that.tableInfo.summaryValuesTableFetcher,
                    { leftfraction: 50 }
                );
                that.myTable = that.panelTable.getTable();// A shortcut variable
                that.myTable.fetchBuffer = 300;
                that.myTable.recordCountFetchType = DataFetchers.RecordCountFetchType.DELAYED;
                that.myTable.setQuery(SQL.WhereClause.Trivial());


                //Create the selection column
                that.myTable.createSelectionColumn(
                    'selection',
                    'Active',that.tableInfo.id, that.tableInfo.primkey,
                    that.tableInfo.genomeTrackSelectionManager,
                    DQX.Color(0,0.5,0),
                    function() {
                        that.myTable.render();
                    });

                $.each(that.tableInfo.quickFindFields, function(idx, propid) {
                    var propInfo = MetaData.findProperty(that.tableInfo.id,propid);
                    var col = that.myTable.createTableColumn(
                        QueryTable.Column(
                            propInfo.name,propid,1),
                        'String',//!!! todo: adapt this to datatype, see TableViewer
                        true
                    );
                });


                that.updateQuery();
                that.panelTable.onResize();

            };

            that.updateQuery = function() {
                var qryList = [];
                $.each(that.tableInfo.quickFindFields, function(idx, propid) {
                    var propInfo = MetaData.findProperty(that.tableInfo.id, propid);
                    var value = that.queryControls[propid].getValue();
                    if (value) {
                        EditTableBasedSummaryValues.storedValues[propid] = value;
                        if (!propInfo.propCategories)
                            qryList.push(SQL.WhereClause.CompareFixed(propid, 'LIKE', '%'+value+'%'));
                        else
                            qryList.push(SQL.WhereClause.CompareFixed(propid, '=', value));
                    }
                    else {
                        delete EditTableBasedSummaryValues.storedValues[propid];
                    }
                });
                if (qryList.length>0)
                    var whc = SQL.WhereClause.AND(qryList);
                else
                    var whc = SQL.WhereClause.Trivial();
                that.myTable.setQuery(whc);
                that.myTable.reLoadTable();

            }

            that.onOK = function() {
                var query = that.builder.getQuery();
                that.close();
            }

            that.create();

            return that;
        }



        return EditTableBasedSummaryValues;
    });



