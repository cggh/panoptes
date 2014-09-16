// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "MetaData"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, MetaData) {

        var FullDataItemInfo = {};


        FullDataItemInfo.Get = function(tableid, itemid, onCompleteFunction) {
            var resultData = {}
            var sched = DQX.Scheduler();
            sched.setOnFullyCompleted(function() {
                onCompleteFunction(resultData);
            });

            function fetchItemDataLevel(curtableid, curitemid) {
                var resultLevel = {};
                // schedule function to take data
                sched.add([], function() {
                    var myurl = DQX.Url(MetaData.serverUrl);
                    myurl.addUrlQueryItem("datatype", 'recordinfo');
                    var primkey = MetaData.getTableInfo(curtableid).primkey;
                    myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(SQL.WhereClause.CompareFixed(primkey, '=', curitemid)));
                    myurl.addUrlQueryItem("database", MetaData.database);
                    myurl.addUrlQueryItem("tbname", curtableid + 'CMB_' + MetaData.workspaceid);
                    $.ajax({
                        url: myurl.toString(),
                        success: function (resp) {
                            sched.setCompleted(curtableid);
                            var keylist = DQX.parseResponse(resp);
                            resultLevel.tableid = curtableid;
                            if ("Error" in keylist) {
                                alert('Unable to fetch {tableid}, {itemid}: \n{error}'.DQXformat({tableid: curtableid,itemid:curitemid, error:keylist.Error}));
                                resultLevel.fields = {};
                                return;
                            }
                            resultLevel.fields = keylist.Data;
                        },
                        error: function() {
                            sched.setCompleted(curtableid);
                        }
                    });

                   // Schedule function that, when data fetching is completed, will initiate fetching of parent data if necessary
                   sched.add([curtableid], function() {
                       var tableInfo = MetaData.mapTableCatalog[curtableid];
                       //debugger;
                       resultLevel.parents = [];
                       $.each(tableInfo.relationsChildOf, function(idx, relationInfo) {
                           var parentValue = resultLevel.fields[relationInfo.childpropid];
                           if (parentValue) {
                               var parentInfo = fetchItemDataLevel(relationInfo.parenttableid, parentValue);
                               parentInfo.relation = relationInfo;
                               resultLevel.parents.push(parentInfo);
                           }
                       });


                   })
                });

                return resultLevel;
            }

            resultData = fetchItemDataLevel(tableid, itemid);

            sched.execute();
        }



        return FullDataItemInfo;
    });


