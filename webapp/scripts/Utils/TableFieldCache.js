// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData", "Plots/GenericPlot"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData, GenericPlot) {

        var TableFieldCache = {};

        TableFieldCache.throttledBroadCast = DQX.debounce(Msg.broadcast,250);


        TableFieldCache.Create = function(tableInfo) {
            var that = {};
            that.tableInfo = tableInfo;
            that.cache = {};
            that._fieldStatus = {};

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

            that.requestAll = function(fieldid, notifyReady) {
                var isNumericalPrimKey = !!(MetaData.findProperty(tableInfo.id, tableInfo.primkey).isFloat);
                if (!that._fieldStatus[fieldid]) {//not yet fetched - initiate now
                    that._fieldStatus[fieldid] = {
                        fetched: false,
                        notifyList: [notifyReady]
                    }
                    var fetcher = DataFetchers.RecordsetFetcher(
                        MetaData.serverUrl,
                        MetaData.database,
                        that.tableInfo.getQueryTableName(false)
                    );
                    //fetcher.setMaxResultCount(that.maxrecordcount);
                    fetcher.addColumn(that.tableInfo.primkey, isNumericalPrimKey?'IN':'ST');
                    fetcher.addColumn(fieldid, 'ST');
                    fetcher.getData(SQL.WhereClause.Trivial(), that.tableInfo.primkey,
                        function (data) { //success
                            var keys = data[that.tableInfo.primkey];
                            var fieldvalues = data[fieldid];
                            $.each(keys, function(idx, key) {
                                if (!that.cache[key])
                                    that.cache[key] = {}
                                that.cache[key][fieldid] = fieldvalues[idx];
                            });
                            that._fieldStatus[fieldid].fetched = true;
                            $.each(that._fieldStatus[fieldid].notifyList, function(idx, fnc) {
                                fnc();
                            });
                        },
                        function (data) { //error
                            that._fieldStatus[fieldid] = null;
                        }

                    );

                } else {
                    if (that._fieldStatus[fieldid].fetched)
                        return true;
                    else {
                        return false;
                        that._fieldStatus[fieldid].notifyList.push(notifyReady);
                    }
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


