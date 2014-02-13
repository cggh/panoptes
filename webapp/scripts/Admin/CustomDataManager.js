define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/base64",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame",
    "MetaData", "Utils/MiscUtils"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Base64,
              Wizard, Popup, PopupFrame,
              MetaData, MiscUtils
        ) {

        var CustomDataManager = {};


        CustomDataManager.upload = function(datasetid, workspaceid) {

            var content = 'Select a local TAB-delimited file containing information<br>that you would like to add to this dataset workspace:<p>';

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
                        datasetid: datasetid,
                        workspaceid: workspaceid,
                        sourceid: sourceid
                    });
                    CustomDataManager.editSettings(datasetid, workspaceid, tableid, sourceid);
                });
            });

            content += bt.renderHtml() + '<p>';

            var popupid = Popup.create('Upload custom data', content);
        };



        CustomDataManager.editSettings = function(datasetid, workspaceid, tableid, sourceid) {

            DQX.setProcessing();
            DQX.customRequest(MetaData.serverUrl,PnServerModule,'customdata_getsettings',{
                database: datasetid,
                workspaceid: workspaceid,
                tableid: tableid,
                sourceid:sourceid
            },function(resp) {
                DQX.stopProcessing();
                if ('Error' in resp) {
                    alert(resp.Error);
                    return;
                }
                var settingsStr = Base64.decode(resp.content);
                CustomDataManager._editSettings_2(datasetid, workspaceid, tableid, sourceid, settingsStr);
            });


        };

        CustomDataManager._editSettings_2 = function(datasetid, workspaceid, tableid, sourceid, settingsStr) {
            var content='';
            var edt = Controls.Textarea('', { size:60, linecount:25, value: settingsStr, fixedfont: true});
            content += edt.renderHtml();
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: '<b>Update settings</b>', width:140, height:35 }).setOnChanged(function() {
                settingsStr = edt.getValue();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'customdata_setsettings',{
                    database: datasetid,
                    workspaceid: workspaceid,
                    tableid: tableid,
                    sourceid:sourceid,
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
            content += '<p>' + bt.renderHtml() + '<p>' ;
            var popupid = Popup.create('Edit custom data settings', content);
        }


        return CustomDataManager;
    });



