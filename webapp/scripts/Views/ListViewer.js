// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["handlebars", "require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/FrameList", "DQX/Msg", "DQX/DocEl", "DQX/Popup",
        "DQX/PopupFrame", "DQX/Utils", "DQX/SQL", "DQX/QueryTable", "DQX/QueryBuilder", "DQX/DataFetcher/DataFetchers",
        "MetaData", "Wizards/EditQuery", "Wizards/ManageStoredSubsets", "Utils/QueryTool", "Utils/MiscUtils", "Utils/GetFullDataItemInfo",
        "Views/ItemView"
    ],
    function (Handlebars, require, Application, Framework, Controls, FrameList, Msg, DocEl, Popup, PopupFrame, DQX, SQL, QueryTable,
              QueryBuilder, DataFetchers, MetaData, EditQuery, ManageStoredSubsets, QueryTool, MiscUtils, GetFullDataItemInfo,
        ItemView) {
        var ListViewerModule = {

            init: function (tableid) {
                // Instantiate the view object
                var that = Application.View(
                        'list_' + tableid,  // View ID
                    MetaData.getTableInfo(tableid).tableCapNamePlural
                );

                that.cache = {};

                that.setEarlyInitialisation();
                that.tableid = tableid;
                that.tableInfo = MetaData.getTableInfo(tableid);
                that.tableInfo.templatedViewer = that;
                that.titleTemplate = that.tableInfo.settings.ItemTitle || '{{'+that.tableInfo.primkey+'}}'
                that.compiledTitleTemplate = Handlebars.compile(that.titleTemplate);

                that.storeSettings = function () {
                    var obj = {};
                    obj.selectedItem = that.selectedItem;
                    return obj;
                };

                that.recallSettings = function (settObj) {
                    if (settObj.selectedItem)
                        if (that.list_loaded)
                            that.panelList.setActiveItem(settObj.selectedItem);
                        else
                            that.load_item = settObj.selectedItem;
                };


                that.createFrames = function (rootFrame) {
                    rootFrame.makeGroupHor();
                        that.frameControls = Framework.FrameGroupVert('', 0.2);
                        rootFrame.addMemberFrame(that.frameControls);

                        that.frameRight = Framework.FrameGroupVert('', 0.8)
                        .setMargins(0)
                        .setSeparatorSize(0);
                        rootFrame.addMemberFrame(that.frameRight);

                            that.frameTitle = Framework.FrameFinal('', 0.1)
                            .setFixedSize(Framework.dimY, 50)
                            .setAllowScrollBars(false,false)
                            that.frameRight.addMemberFrame(that.frameTitle);

                            that.frameTemplate = Framework.FrameDynamic('', 0.8);
                            that.frameRight.addMemberFrame(that.frameTemplate);


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

                    //Initialise the data fetcher that will download the data for the table
                    this.tableFetcher = DataFetchers.Table(
                        MetaData.serverUrl,
                        MetaData.database,
                            that.tableid + 'CMB_' + MetaData.workspaceid
                    );
                    this.tableFetcher.myDataConsumer = that;
                    this.tableFetcher.setReportIfError(true);
                    this.tableFetcher.setMaxRecordCount(that.tableInfo.settings.MaxCountQueryAggregated || 1000000);
                    this.tableFetcher.positionField = that.tableInfo.primkey;
                    this.tableFetcher.addFetchColumnActive(that.tableInfo.primkey, MiscUtils.createEncoderId(tableid, that.tableInfo.primkey));
                    that.titleFields = Handlebars.fields_used(that.titleTemplate, _.map(that.tableInfo.properties,DQX.attr('propid')));
                    _.forEach(that.titleFields, function(prop) {
                        that.tableFetcher.addFetchColumnActive(prop, MiscUtils.createEncoderId(tableid, prop));
                    });
                    this.tableFetcher.IsDataReady(-1,1000000);
                    that.panelsCreated = true;
                };


                that.postLoadAction = function () {
                };

                that.onBecomeVisible = function () {
                    ga('send', 'screenview', {screenName: that.tableid});
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
                    function make_title(index) {
                        var fields = {};
                        _.forEach(that.titleFields, function(field) {
                            fields[field] = that.tableFetcher.getColumnPoint(index, field)
                        });
                        return that.compiledTitleTemplate(fields)
                    }
                    for (var i = 0; i < that.tableFetcher.totalRecordCount; i++) {
                        items.push({
                            id: that.tableFetcher.getColumnPoint(i, that.tableInfo.primkey),
                            content: make_title(i)
                        });
                    }
                    that.panelList.setItems(items, items[0].id);
                    that.panelList.render();
                    that.render(items[0].id);
                };

                that.try_cache = function(item, callback) {
                    if (that.cache[item])
                        callback(that.cache[item]);
                    else {
                        DQX.setProcessing("Downloading...");
                        GetFullDataItemInfo.Get(that.tableid, item, function(data) {
                            DQX.stopProcessing();
                            that.cache[item] = data;
                            callback(data);
                        })
                    }
                };

                that.render = function(item) {
                    that.try_cache(item, function(data) {
                        that.frameTitle.setContentHtml('<div class="PnItemTitle">'+ that.compiledTitleTemplate(data.fields) +"</div>");
                        if (!that.itemView) {
                            that.itemView = ItemView(that.frameTemplate, {itemid:item, tableid:that.tableid}, data);
                            that.itemView.render()
                        } else {
                            that.itemView.update(data);
                        }

                    });
                };
                return that;
            }
        };
        return ListViewerModule;
    });