// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "DQX/ServerIO", "Wizards/EditQuery", "MetaData"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, ServerIO, EditQuery, MetaData) {

        var SelectionTools = {};


        SelectionTools.cmdStore = function(tableInfo) {
            var fieldList = [];
            $.each(MetaData.customProperties, function(idx, propInfo) {
                if ((propInfo.tableid==tableInfo.id) && (propInfo.datatype=='Boolean') && (propInfo.settings.CanUpdate))
                    fieldList.push({ id: propInfo.propid, name:propInfo.name });
             });

            var content = '<div style="padding:10px">';
            var fieldPicker = Controls.Combo(null,{ label:'Store in property: ', states: fieldList, value:'StoredSelection' });
            content += fieldPicker.renderHtml();
            content += '<br>';

            var buttonStore = Controls.Button(null, { content: '<b>Store</b>'/*, buttonClass: 'DQXToolButton2'*/, width:50, height:20 });
            buttonStore.setOnChanged(function() {
                Popup.closeIfNeeded(popupID);
                SelectionTools.executeStore(tableInfo, fieldPicker.getValue());
            });
            content += buttonStore.renderHtml();
            content += '</div>';
            var popupID = Popup.create('Store selection', content);
        }

        SelectionTools.executeStore =function (tableInfo, propid) {
            var maxSelCount = 50000;
            var datastring = '';
            var keylist = tableInfo.getSelectedList();
            if (keylist.length > maxSelCount)
                alert('Selection list will be limited to ' + maxSelCount);
            $.each(keylist, function(idx, key) {
                if(idx <= maxSelCount) {
                    if (idx > 0)
                        datastring+='\t';
                    datastring += key;
                }
            });
            DQX.setProcessing();
            DQX.serverDataStoreLong(MetaData.serverUrl,datastring,function(id) {
                DQX.stopProcessing();
                var propInfo = MetaData.findProperty(tableInfo.id, propid);

                ServerIO.customAsyncRequest(MetaData.serverUrl,PnServerModule,'selectionstore',
                    {
                        database: MetaData.database,
                        workspaceid:MetaData.workspaceid,
                        tableid: tableInfo.id,
                        keyid: tableInfo.primkey,
                        propid: propid,
                        dataid: id,
                        iscustom: propInfo.isCustom?1:0,
                        hassubsampling: tableInfo.settings.AllowSubSampling?1:0,
                        cachedworkspace: tableInfo.settings.CacheWorkspaceData?1:0
                    },
                    function(resp) {
                        Msg.broadcast({ type: 'PropertyContentChanged'}, {
                            tableid: tableInfo.id,
                            propid: propid
                        });
                        Msg.send({type: 'DataItemTablePopup'}, {
                            tableid: tableInfo.id,
                            query: SQL.WhereClause.CompareFixed(propid, '=', 1),
                            title: 'Stored ' + tableInfo.tableNamePlural + ' selection'
                        });
                    }
                );

                //debugger;
//                DQX.serverDataFetch(MetaData.serverUrl,id,function(content) {
//                    alert('content length: '+content.length);
//                });
            });
        }


        return SelectionTools;
    });


