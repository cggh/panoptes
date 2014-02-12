define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame",
    "MetaData", "Utils/MiscUtils"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX,
              Wizard, Popup, PopupFrame,
              MetaData, MiscUtils
        ) {

        var CustomDataManager = {};


        CustomDataManager.upload = function(datasetid, workspaceid) {

            var content = 'Select a local TAB-delimited file containing information<br>that you would like to add to this dataset workspace:<p>';

            var ctrl_uploadFile = Controls.FileUpload(null, { serverUrl: MetaData.serverUrl }).setOnChanged(function() {
                UploadProperties.getFileInfo(ctrl_trackFile.getValue());
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
                });
            });

            content += bt.renderHtml() + '<p>';

            var popupid = Popup.create('Upload custom data', content);
        }


        return CustomDataManager;
    });



