// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/FrameList", "DQX/Msg", "DQX/DocEl", "DQX/Popup",
        "DQX/PopupFrame", "DQX/Utils", "DQX/SQL", "DQX/QueryTable", "DQX/QueryBuilder", "DQX/DataFetcher/DataFetchers",
        "MetaData", "Wizards/EditQuery", "Wizards/ManageStoredSubsets", "Utils/QueryTool", "Utils/MiscUtils", "Utils/GetFullDataItemInfo",
        "Views/ItemView"
    ],
    function (require, Application, Framework, Controls, FrameList, Msg, DocEl, Popup, PopupFrame, DQX, SQL, QueryTable,
              QueryBuilder, DataFetchers, MetaData, EditQuery, ManageStoredSubsets, QueryTool, MiscUtils, GetFullDataItemInfo,
        ItemView) {
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

                that.storeSettings = function () {
                    var obj = {};
                    obj.selected_item = that.selectedItem;
                    return obj;
                };

                that.recallSettings = function (settObj) {
                    if (that.list_loaded)
                        that.panelList.setActiveItem(settObj.selected_item);
                    else
                        that.load_item = settObj.selected_item;
                };


                that.createFrames = function (rootFrame) {
                    this.frameControls = Framework.FrameGroupVert('', 0.2);
                    this.frameTemplate = Framework.FrameDynamic('', 0.8);
                    rootFrame.makeGroupHor();
                    rootFrame.addMemberFrame(that.frameControls);
                    rootFrame.addMemberFrame(that.frameTemplate);
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
                    this.panelList.setTemplate('<span class="fa '+that.tableInfo.settings.Icon +' buttonicon" style="color:rgb(130,130,130);padding-right: 5px"></span><span>{title_field}</span>');
                    this.panelList.render();

                    //Right Panel
                    //this.panelTemplate = Framework.TemplateFrame(this.frameTemplate, that.template);
                    //this.panelTemplate.render();

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
                    this.tableFetcher.positionField = that.tableInfo.primkey;
                    this.tableFetcher.addFetchColumnActive(that.tableInfo.primkey, MiscUtils.createEncoderId(tableid, that.tableInfo.primkey));
                    this.tableFetcher.addFetchColumnActive(that.tableInfo.settings.TemplatedView.TitleField, MiscUtils.createEncoderId(tableid, that.tableInfo.settings.TemplatedView.TitleField));
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
                    that.selectedItem = item;
                    that.render(item);
                };

                //This function is called by the datafetcher to inform the view that new data is ready. In reaction, we render the view
                that.notifyDataReady = function () {
                    that.list_loaded = true;
                    that.renderList();
                    if (that.load_item)
                        that.panelList.setActiveItem(that.load_item);

                };

                that.renderList = function() {
                    var items = [];
                    for (var i = 0; i < that.tableFetcher.totalRecordCount; i++) {
                        items.push({
                            id: that.tableFetcher.getColumnPoint(i, that.tableInfo.primkey),
                            content: {title_field:that.tableFetcher.getColumnPoint(i, that.tableInfo.settings.TemplatedView.TitleField)}
                        });
                    }
                    that.panelList.setItems(items, items[0].id);
                    that.panelList.render();
                    that.render(items[0].id);
                };

                that.render = function(item) {
                    DQX.setProcessing("Downloading...");
                    GetFullDataItemInfo.Get(that.tableid, item, function(resp) {
                        DQX.stopProcessing();
                        if (!that.itemView) {
                            that.itemView = ItemView(that.frameTemplate, {itemid:item, tableid:that.tableid}, resp);
                            that.itemView.createFrames(that.frameTemplate);
                            that.itemView.render();
                            that.itemView.createPanels();
                            that.frameTemplate.applyOnPanels(function(panel) {
                                if (panel._panelfirstRendered==false)
                                    panel.render();
                            })

                        }
                    })

                };

                return that;
            }
        };
        return TemplatedViewerModule;
    });