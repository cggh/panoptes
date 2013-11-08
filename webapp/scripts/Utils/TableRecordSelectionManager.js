define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData", "Plots/GenericPlot"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData, GenericPlot) {

        var TableRecordSelectionManager = {};





        TableRecordSelectionManager.Create = function(id, tableInfo) {
            var that = {};
            that.id = id;
            that.tableInfo = tableInfo;

            that.mem = {};

            that.isItemSelected = function(id) {
                return (that.mem[id]==true);
            };

            that.selectItem = function(id, newstate) {
                that.mem[id]=newstate;
            };


            return that;
        };



        return TableRecordSelectionManager;
    });


