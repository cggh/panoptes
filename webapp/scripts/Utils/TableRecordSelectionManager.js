define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData", "Plots/GenericPlot"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData, GenericPlot) {

        var TableRecordSelectionManager = {};





        TableRecordSelectionManager.Create = function(id, tableInfo, onChangedHandler) {
            var that = {};
            that.id = id;
            that.tableInfo = tableInfo;
            that.onChangedHandler = onChangedHandler;

            that.mem = {};

            that.isItemSelected = function(id) {
                return (that.mem[id]==true);
            };

            that.selectItem = function(id, newstate) {
                that.mem[id]=newstate;
                if (that.onChangedHandler)
                    that.onChangedHandler(id);
            };


            return that;
        };



        return TableRecordSelectionManager;
    });


