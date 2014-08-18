// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/FrameList", "DQX/Msg", "DQX/DocEl", "DQX/Popup", "DQX/PopupFrame", "DQX/Utils", "DQX/SQL", "DQX/QueryTable", "DQX/QueryBuilder", "DQX/DataFetcher/DataFetchers",
        "MetaData",
        "Wizards/EditQuery", "Wizards/ManageStoredSubsets", "Utils/QueryTool", "Utils/MiscUtils", "Utils/SelectionTools", "Utils/ButtonChoiceBox"
    ],
    function (require, Application, Framework, Controls, FrameList, Msg, DocEl, Popup, PopupFrame, DQX, SQL, QueryTable, QueryBuilder, DataFetchers, MetaData, EditQuery, ManageStoredSubsets, QueryTool, MiscUtils, SelectionTools, ButtonChoiceBox) {
        var TemplatedViewerModule = {

            init: function (tableid) {
                // Instantiate the view object
                var that = Application.View(
                        'template_' + tableid,  // View ID
                    MetaData.getTableInfo(tableid).tableCapNamePlural
                );

                that.setEarlyInitialisation();
                that.tableid = tableid;
                that.tableInfo = MetaData.getTableInfo(tableid);
                that.tableInfo.templatedViewer = that;
                that.template = that.tableInfo.settings.TemplatedView.Template;

//                Msg.listen('', { type: 'SelectionUpdated'}, function (scope, tableid) {
//                    if (that.tableid == tableid) {
//                        if (that.selectedItemCountText)
//                            that.selectedItemCountText.modifyValue(that.tableInfo.getSelectedCount() + ' ' + that.tableInfo.tableNamePlural + ' selected');
//                        if (that.myTable)
//                            that.myTable.render();
//                    }
//                });

                that.storeSettings = function () {
                    var obj = {};
                    //TODO Store a ref to the selected obj
                    return obj;
                };

                that.recallSettings = function (settObj) {

                };

                // Activates this view, and loads a query
                that.activateWithQuery = function (qry) {
                    that.activateState();
                };


                that.createFrames = function (rootFrame) {
                    this.frameControls = Framework.FrameGroupVert('', 0.2).setMargins(0).setSeparatorSize(0);
                    this.frameTemplate = Framework.FrameFinal('', 0.8).setAllowScrollBars(true, true);
                    rootFrame.MakeControlsFrame(this.frameControls, this.frameTemplate, 250);
                    this.frameContext = this.frameControls.addMemberFrame(Framework.FrameFinal('', 0.01))
                        .setMargins(0).setMinSize(Framework.dimY, 80).setAllowScrollBars(false, false);
                    this.frameList = this.frameControls.addMemberFrame(Framework.FrameFinal('', 0.8));
                };


                that.createPanels = function () {
                    //Left Panel
                    this.panelContext = Framework.Form(this.frameContext);
                    this.panelContext.setPadding(0);
                    var content = '';
                    content += that.tableInfo.createIcon({floatLeft: true});
                    if (that.tableInfo.settings.Description) {
                        content += '<span style="color:rgb(100,100,100)">' + that.tableInfo.settings.Description + '</span>';
                        content += '<p>';
                    }
                    that.introText = Controls.Html(null, content);
                    var topGroup = Controls.Wrapper(Controls.CompoundVert([
                        that.introText,
                    ]), 'ControlsSectionBody');
                    that.controlsGroup = Controls.CompoundVert([
                        topGroup,
                    ]).setMargin(0);
                    this.panelContext.addControl(that.controlsGroup);

                    this.panelList = FrameList(this.frameList);
                    this.panelList.setOnItemHighlighted(that.itemSelected);
                    this.panelList.setHasFilter();
                    this.panelList.render();

                    //Right Panel
                    this.panelTemplate = Framework.TemplateFrame(this.frameTemplate, that.template);
                    this.panelTemplate.render({Name:'BENNY'});

                    //Initialise the data fetcher that will download the data for the table
                    this.tableFetcher = DataFetchers.Table(
                        MetaData.serverUrl,
                        MetaData.database,
                            that.tableid + 'CMB_' + MetaData.workspaceid
                    );
                    this.tableFetcher.myDataConsumer = that;
                    this.tableFetcher.setReportIfError(true);
                    this.tableFetcher.setMaxRecordCount(that.tableInfo.settings.MaxCountQueryAggregated || 1000000);
                    this.tableFetcher.setTableName(that.tableid);
                    this.tableFetcher.positionField = 'ID';
                    this.tableFetcher.addFetchColumnActive('ID', MiscUtils.createEncoderId(tableid, 'ID'));
                    this.tableFetcher.addFetchColumnActive('Name', MiscUtils.createEncoderId(tableid, 'Name'));
                    this.tableFetcher.IsDataReady(-1,1000000);
                    that.panelsCreated = true;
                };


                that.postLoadAction = function () {
                };

                that.onBecomeVisible = function () {
                    if (!that.hasBecomeVisible) {
                        if (that.panelsCreated) {
                            if (that.viewIsLoaded) {
                            }
                        }
                        that.hasBecomeVisible = true;
                    }
                };

                that.itemSelected = function (item) {
                    that.render(item)
                };

                //This function is called by the datafetcher to inform the view that new data is ready. In reaction, we render the view
                that.notifyDataReady = function () {
                    that.renderList();
                };

                that.renderList = function() {
                    var items = [];
                    for (var i = 0; i < that.tableFetcher.totalRecordCount; i++) {
                        items.push({
                            id: that.tableFetcher.getColumnPoint(i, 'ID'),
                            content: that.tableFetcher.getColumnPoint(i, 'Name')
                        });
                    }
                    that.panelList.setItems(items, items[0].id);
                    that.panelList.render();
                    that.render(items[0].id);
                };

                that.render = function(item) {
                    that.tableFetcher.fetchFullRecordInfo(
                        SQL.WhereClause.CompareFixed('ID', '=', item),
                        function (data) {
                            that.panelTemplate.render(data);
                        },
                        function (msg) {
                            //TODO - find standard error path
                        }
                    );
                };

                return that;
            }
        };
        return TemplatedViewerModule;
    });