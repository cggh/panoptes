// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Views/ItemView"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, ItemView
        ) {

        var ItemPopup = {};
        ItemPopup.activeList = [];

        ItemPopup.init = function() {
            Msg.listen('',{type:'ItemPopup'}, function(scope, info) {
                ItemPopup.show(info);
            });
        }

        ItemPopup.show = function(itemInfo) {
            DQX.setProcessing("Downloading...");
            GetFullDataItemInfo.Get(itemInfo.tableid, itemInfo.itemid, function(resp) {
                DQX.stopProcessing();
                ItemPopup.show_sub1(itemInfo, resp);
            })
        }


        ItemPopup.show_sub1 = function(itemInfo, data) {


            var tableInfo = MetaData.getTableInfo(itemInfo.tableid);
            var popup = PopupFrame.PopupFrame('ItemPopup'+itemInfo.tableid,
                {
                    title:tableInfo.tableCapNameSingle + ' "'+itemInfo.itemid+'"',
                    icon:tableInfo.settings.Icon,
                    blocking:false,
                    sizeX:700, sizeY:500
                }
            );

            var itemView = ItemView(popup.frameRoot, itemInfo, data);
            popup.createFrames = itemView.createFrames;
            popup.createPanels = itemView.createPanels;


            if (MetaData.isManager)
                popup.addTool('fa-link', function() { popup.handleCreateLink(); });

            if (itemInfo.frameSettings) {
                // Popupframe settings were stored; recall & set as new history, so that settings will be picked up during creation
                PopupFrame.setFrameSettingsHistory(popup.typeID, itemInfo.frameSettings);
            }

            popup.onClose = function() {
                var activeIndex = -1;
                $.each(ItemPopup.activeList, function(idx,i_popup) {
                    if (i_popup===popup)
                        activeIndex = idx;
                });
                if (activeIndex>=0) {
                    ItemPopup.activeList.splice(activeIndex,1);
                }
                else
                    DQX.reportError('Plot not found!');
                itemView.destroy();
            };

            popup.store = function() {
                var obj = {};
                obj.itemid = itemView.itemid;
                obj.tableid = itemView.tableInfo.id;
                obj.frameSettings = popup.frameRoot.settingsStreamOut();
                return obj;
            };

            popup.handleCreateLink = function() {
                var content = base64.encode(JSON.stringify(popup.store()));
                DQX.serverDataStore(MetaData.serverUrl, content, function (id) {
                    DQX.customRequest(MetaData.serverUrl, PnServerModule, 'view_store',
                        { database: MetaData.database, workspaceid: MetaData.workspaceid, id: id },
                        function (resp) {
                            require("Utils/IntroViews").createIntroView('dataitem', id, '-', 'Add to start page');
                        });
                });
            }

            ItemPopup.activeList.push(popup);
            popup.create();
        }



        ItemPopup.store = function() {
            var obj = [];
            $.each(ItemPopup.activeList, function(idx,popup) {
                obj.push(popup.store());
            });
            return obj;
        }

        ItemPopup.recall = function(settObj) {
            $.each(settObj, function(idx,popupSettObj) {
                ItemPopup.show(popupSettObj);
            });
        }

        ItemPopup.loadStoredItem = function(tpe, storeid) {
            DQX.serverDataFetch(MetaData.serverUrl, storeid, function(content) {
                var obj = JSON.parse(base64.decode(content));
                ItemPopup.recall([obj]);
            });
        };


        Msg.listen('', { type: 'LoadStoredDataItem'}, ItemPopup.loadStoredItem);

        return ItemPopup;
    });



