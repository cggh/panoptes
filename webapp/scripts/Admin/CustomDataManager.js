define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/base64",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame",
    "MetaData", "Utils/MiscUtils"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Base64,
              Wizard, Popup, PopupFrame,
              MetaData, MiscUtils
        ) {

        var CustomDataManager = {};


        CustomDataManager.getSourceFileDescription = function(sourceFileInfo) {
            var content = '<table>';

            var addRow = function(id, value) {
                content += "<tr>";
                content += "<td><b>" + id + ":</b></td>";
                content += '<td style="padding-left:5px;max-width:300px;word-wrap:break-word;">' + value + "</td>";
                content += "</tr>";
            }

            addRow('Dataset ID', sourceFileInfo.datasetid);
            if (sourceFileInfo.workspaceid)
                addRow('Workspace ID', sourceFileInfo.workspaceid);
            if (sourceFileInfo.sourceid) {
                addRow('Data table ID', sourceFileInfo.tableid);
                addRow('Custom data ID', sourceFileInfo.sourceid);
            }
            content += '</table>'
            return content;
        };


        CustomDataManager.upload = function(datasetid, workspaceid) {

            var content = CustomDataManager.getSourceFileDescription({datasetid: datasetid, workspaceid: workspaceid});

            content += '<p>Select a local TAB-delimited file containing information<br>that you would like to add to this dataset workspace:<p>';

            var ctrl_uploadFile = Controls.FileUpload(null, { serverUrl: MetaData.serverUrl }).setOnChanged(function() {
            });
            content += ctrl_uploadFile.renderHtml() + '<p>';

            states = [{id:'', name:'[Select]'}];
            $.each(MetaData.sourceFileInfo[datasetid].datatables, function(tableid, tableInfo) {
                states.push({id: tableid, name: tableid });
            });
            ctrl_dataSetChoice = Controls.Combo(null,{label:'Upload to target dataset:', states: states});
            content += ctrl_dataSetChoice.renderHtml() + '<p>';

            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: '<b>Upload custom data file</b>', width:140, height:35 }).setOnChanged(function() {
                var fileid = ctrl_uploadFile.getValue();
                var filename = ctrl_uploadFile.getFileName();
                var tableid = ctrl_dataSetChoice.getValue();
                if (!fileid) {
                    alert('Please select a file to upload.');
                    return;
                }
                if (!tableid) {
                    alert('Please select a target dataset to upload to.');
                    return;
                }
                Popup.closeIfNeeded(popupid);
                DQX.setProcessing();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'customdata_upload',{
                    database: datasetid,
                    workspaceid: workspaceid,
                    tableid: tableid,
                    fileid: fileid,
                    sourceid:filename
                },function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    sourceid = resp.sourceid;
                    Msg.send({type: 'RenderSourceDataInfo'}, {
                        selectPath: {datasetid: datasetid, workspaceid:workspaceid, tableid:tableid, sourceid:sourceid},
                        proceedFunction: function() {
                            CustomDataManager.editSettings(datasetid, workspaceid, tableid, sourceid);
                        }
                    });
                });
            });

            content += bt.renderHtml() + '<p>';

            var popupid = Popup.create('Upload custom data', content);
        };



        CustomDataManager.editSettings = function(sourceInfo) {

            DQX.setProcessing();
            DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_getsettings',{
                sourcetype: sourceInfo.tpe,
                database: sourceInfo.datasetid,
                workspaceid: sourceInfo.workspaceid,
                tableid: sourceInfo.tableid,
                sourceid: sourceInfo.sourceid
            },function(resp) {
                DQX.stopProcessing();
                if ('Error' in resp) {
                    alert(resp.Error);
                    return;
                }
                var settingsStr = Base64.decode(resp.content);
                CustomDataManager._editSettings_2(sourceInfo, settingsStr);
            });


        };

        CustomDataManager._editSettings_2 = function(sourceInfo, settingsStr) {
            var content = CustomDataManager.getSourceFileDescription({datasetid: sourceInfo.datasetid, workspaceid: sourceInfo.workspaceid, tableid:sourceInfo.tableid, sourceid: sourceInfo.sourceid});
            var edt = Controls.Textarea('', { size:65, linecount:20, value: settingsStr, fixedfont: true});
            content += edt.renderHtml();
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: '<b>Update settings</b>', width:140, height:35 }).setOnChanged(function() {
                settingsStr = edt.getValue();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_setsettings',{
                    sourcetype: sourceInfo.tpe,
                    database: sourceInfo.datasetid,
                    workspaceid: sourceInfo.workspaceid,
                    tableid: sourceInfo.tableid,
                    sourceid: sourceInfo.sourceid,
                    content: Base64.encode(settingsStr)
                },function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    Popup.closeIfNeeded(popupid);
                    Msg.send({type: 'PromptLoadData'});

                });
            });
            content += '<p><div style="padding:3px;border:1px solid black;background-color:rgb(255,164,0)"><b>WARNING:<br>Changing these settings may cause the data source not to load correctly!</b></div></p>';
            content += '<p>' + bt.renderHtml() + '<p>' ;
            var popupid = Popup.create('Edit data settings', content);
        }


        CustomDataManager.delCustomData = function(datasetid, workspaceid, tableid, sourceid) {
            var content = CustomDataManager.getSourceFileDescription({datasetid: datasetid, workspaceid: workspaceid, tableid:tableid, sourceid: sourceid});
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: '<b><span style="color:red">Delete</span></b>', width:140, height:35 }).setOnChanged(function() {
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'customdata_del',{
                    database: datasetid,
                    workspaceid: workspaceid,
                    tableid: tableid,
                    sourceid:sourceid
                },function(resp) {
                    DQX.stopProcessing();
                    Popup.closeIfNeeded(popupid);
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    alert('NOTE: please re-import the workspace to reflect the deleted custom data in the server database!');
                    Msg.send({type: 'RenderSourceDataInfo'}, {
                        selectPath: {
                            datasetid: datasetid,
                            workspaceid: workspaceid
                        }
                    });
                });
            });
            content += '<p><div style="padding:3px;border:1px solid black;background-color:rgb(255,164,0)"><b>WARNING:<br>This will permanently remove these data on the server!</b></div></p>';
            content += '<p>' + bt.renderHtml() + '<p>' ;
            var popupid = Popup.create('Delete custom data', content);
        }



        return CustomDataManager;
    });



