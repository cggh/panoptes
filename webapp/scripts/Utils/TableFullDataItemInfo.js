// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData", "Plots/GenericPlot"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData, GenericPlot) {

        var TableFullDataItemInfo = {};

        TableFullDataItemInfo.throttledBroadCast = DQX.debounce(Msg.broadcast,250);


        TableFullDataItemInfo.create = function(tableInfo) {
            var that = {};
            that.tableInfo = tableInfo;
            that._items = null;
            that._fetching = false;
            that._callBackList = [];

            that._fetch = function() {
                that._fetching = true;
                var getter = DataFetchers.ServerDataGetter();
                that._properties = [];
                var propertyIdList = [];
                $.each(MetaData.customProperties, function(idx, propInfo) {
                    if (propInfo.tableid == tableInfo.id) {
                        that._properties.push(propInfo);
                        propertyIdList.push(propInfo.propid);
                    }
                });
                var tablename = tableInfo.getQueryTableName(false);
                getter.addTable(tablename,
                    propertyIdList,
                    tableInfo.primkey,
                    SQL.WhereClause.Trivial(), {}
                );
                getter.execute(MetaData.serverUrl,MetaData.database,
                    function() {
                        that._items = getter.getTableRecords(tablename);
                        that._fetching = false;
                        $.each(that._items, function(idx, item) {
                            $.each(that._properties, function(idx2, propInfo) {
                                if (propInfo.isFloat) {
                                    if (item[propInfo.propid]!=null) {
                                        if (item[propInfo.propid]==='')
                                            item[propInfo.propid] = 0
                                        else
                                            item[propInfo.propid] = parseFloat(item[propInfo.propid]);
                                    }
                                }
                            });
                        });
                        $.each(that._callBackList, function(idx, callback) {
                            callback(that._items);
                        });
                        that._callBackList = [];
                    }
                );
            };

            that.get = function(onCompleted) {
                if (that._items)
                    onCompleted(that._items)
                else {
                    that._callBackList.push(onCompleted);
                    if (!that._fetching)
                        that._fetch();
                }
            }

            return that;
        }



        return TableFullDataItemInfo;
    });


