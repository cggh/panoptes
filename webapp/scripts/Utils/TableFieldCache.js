define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData", "Plots/GenericPlot"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData, GenericPlot) {

        var TableFieldCache = {};

        TableFieldCache.throttledBroadCast = DQX.debounce(Msg.broadcast,250);


        TableFieldCache.Create = function(tableInfo) {
            var that = {};
            that.tableInfo = tableInfo;
            that.cache = {};

            that.add = function(key) {
                if (!that.cache[key]) {
                    DataFetchers.fetchSingleRecord(
                        MetaData.serverUrl,
                        MetaData.database,
                        that.tableInfo.id,
                        that.tableInfo.primkey, key,
                        function(fields) {
                            that.cache[key] = fields;
                            TableFieldCache.throttledBroadCast({type:'TableFieldCacheModified', tableid:that.tableInfo.id} );
                        },
                        function(error,b) {
                        }
                    );
                }
            };

            that.getField = function(key, fieldid) {
                if (!that.cache[key])
                    return '';
                if (!that.cache[key][fieldid])
                    return '';
                return that.cache[key][fieldid];
            };

            return that;
        }



        return TableFieldCache;
    });


