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

            that.selectItem = function(id, newstate) {
                if (that.mem[id]!=newstate) {
                    that.mem[id]=newstate;
                    if (newstate)
                        that.fieldCache.add(id);
                    if (that.onChangedHandler)
                        that.onChangedHandler(id);
                }
            };

            that.clearAll = function() {
                $.each(that.getSelectedList(), function(idx, key) {
                    that.selectItem(key,false);
                });
            }

            that.getSelectedList = function() {
                var activeList = [];
                $.each(that.mem, function(key, val) {
                    if (val)
                        activeList.push(key);
                });
                return activeList;
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


