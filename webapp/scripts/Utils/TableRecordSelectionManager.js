// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData", "Plots/GenericPlot"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData, GenericPlot) {

        var TableRecordSelectionManager = {};



        TableRecordSelectionManager.Create = function(id, tableInfo, onChangedHandler) {
            var that = {};
            that.id = id;
            that.tableInfo = tableInfo;
            that.onChangedHandler = onChangedHandler;

            that.mem = {};
            that.fieldCache = tableInfo.fieldCache;


            that.isItemSelected = function(id) {
                return (that.mem[id]);
            };

            that.selectItem = function(id, newstate, preventNotify) {
                if (that.mem[id]!=newstate) {
                    that.mem[id]=newstate;
                    if (newstate)
                        that.fieldCache.add(id);
                    if ((that.onChangedHandler)&&(!preventNotify))
                            that.onChangedHandler(id);
                }
            };

            that.notifyChanged = function() {
                if (that.onChangedHandler)
                    that.onChangedHandler(id);
            }

            that.clearAll = function() {
                that.mem = {};
                that.notifyChanged();
            }

            that.getSelectedList = function() {
                var activeList = [];
                $.each(that.mem, function(key, val) {
                    if (val)
                        activeList.push(key);
                });
                return activeList;
            }

            that.getSelectedCount = function() {
                var cnt = 0;
                $.each(that.mem, function(key, val) {
                    if (val)
                        cnt += 1;
                });
                return cnt;
            }

            that.storeSettings = function() {
                return JSON.stringify(that.getSelectedList());
            };

            that.recallSettings = function(settObj) {
                var activeList = JSON.parse(settObj);
                that.mem = {};
                $.each(activeList, function(idx, key) {
                    that.mem[key] = true;
                    that.fieldCache.add(key);
                });
            };

            return that;
        };




        return TableRecordSelectionManager;
    });


