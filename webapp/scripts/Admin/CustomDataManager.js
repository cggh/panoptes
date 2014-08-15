// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
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

            if (sourceFileInfo.datasetid)
                addRow('Dataset ID', sourceFileInfo.datasetid);
            if (sourceFileInfo.workspaceid)
                addRow('Workspace ID', sourceFileInfo.workspaceid);
            if (sourceFileInfo.tableid)
                addRow('Datatable ID', sourceFileInfo.tableid);
            if (sourceFileInfo.sourceid)
                addRow('Custom data ID', sourceFileInfo.sourceid);
            content += '</table>'
            return content;
        };


        CustomDataManager.uploadDataTable = function(datasetid, workspaceid) {

            var content = CustomDataManager.getSourceFileDescription({datasetid: datasetid, workspaceid: workspaceid});

            content += '<p>Select a local TAB-delimited file containing information<br>that you would like to add as a datatable:<p>';

            var ctrl_uploadFile = Controls.FileUpload(null, { serverUrl: MetaData.serverUrl }).setOnChanged(function() {
            });
            content += ctrl_uploadFile.renderHtml() + '<p>';


            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: '<b>Upload data file</b>', width:140, height:35 }).setOnChanged(function() {
                var fileid = ctrl_uploadFile.getValue();
                var filename = ctrl_uploadFile.getFileName();
                if (!fileid) {
                    alert('Please select a file to upload.');
                    return;
                }
                Popup.closeIfNeeded(popupid);
                DQX.setProcessing();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_upload_datatable',{
                    database: datasetid,
                    fileid: fileid,
                    tableid:filename
                },function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        Msg.send({type: 'RenderSourceDataInfo'}, {});
                        alert(resp.Error);
                        return;
                    }
                    tableid = resp.tableid;
                    Msg.send({type: 'RenderSourceDataInfo'}, {
                        proceedFunction: function() {
                            CustomDataManager.editSettings({ tpe:'datatable', datasetid:datasetid, tableid:tableid });
                        }
                    });
                });
            });

            content += bt.renderHtml() + '<p>';

            var popupid = Popup.create('Upload Datatable', content);
        };



        CustomDataManager.uploadCustomData = function(datasetid, workspaceid) {

            var content = CustomDataManager.getSourceFileDescription({datasetid: datasetid, workspaceid: workspaceid});

            content += '<p>Select a local TAB-delimited file containing information<br>that you would like to add to this dataset workspace:<p>';

            var ctrl_uploadFile = Controls.FileUpload(null, { serverUrl: MetaData.serverUrl }).setOnChanged(function() {
            });
            content += ctrl_uploadFile.renderHtml() + '<p>';

            states = [{id:'', name:'[Select]'}];
            $.each(MetaData.sourceFileInfo[datasetid].datatables, function(tableid, tableInfo) {
                states.push({id: tableid, name: tableid });
            });
            ctrl_dataSetChoice = Controls.Combo(null,{label:'Upload to target datatable:', states: states});
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
                    alert('Please select a target datatable to upload to.');
                    return;
                }
                Popup.closeIfNeeded(popupid);
                DQX.setProcessing();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_upload_customdata',{
                    database: datasetid,
                    workspaceid: workspaceid,
                    tableid: tableid,
                    fileid: fileid,
                    sourceid:filename
                },function(resp) {
                    DQX.stopProcessing();
                    Msg.send({type: 'RenderSourceDataInfo'}, {});
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    sourceid = resp.sourceid;
                    Msg.send({type: 'RenderSourceDataInfo'}, {
                        proceedFunction: function() {
                            CustomDataManager.editSettings({ tpe:'customdata', datasetid:datasetid, workspaceid:workspaceid, tableid:tableid, sourceid:sourceid });
                        }
                    });
                });
            });

            content += bt.renderHtml() + '<p>';

            var popupid = Popup.create('Upload custom data', content);
        };


        CustomDataManager.viewData = function(sourceInfo) {
            if (['datatable', 'customdata'].indexOf(sourceInfo.tpe)<0) {
                alert('Please select a datatable or a custom data source');
                return;
            }
            DQX.setProcessing();
            DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_gettopdata',{
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
                var topdata = Base64.decode(resp.content);
                var content = CustomDataManager.getSourceFileDescription({datasetid: sourceInfo.datasetid, workspaceid: sourceInfo.workspaceid, tableid:sourceInfo.tableid, sourceid: sourceInfo.sourceid});
                content += '<div style="overflow-x: scroll; overflow-y: scroll; height:400px;resize:both;background-color: white"><table style="border-spacing: 0px;border-collapse:collapse;background-color: white">';
                $.each(topdata.split('\n'), function(idx, line) {
                    if (line.indexOf('\t')>0) {
                        content += '<tr>';
                        $.each(line.split('\t'), function(idx2, cell) {
                            if (idx==0)
                                content += '<th style="white-space: nowrap;border:2px solid black;padding:5px">'+cell+'</th>';
                            else
                                content += '<td style="white-space: nowrap;border:1px solid rgb(150,150,150);padding:5px">'+cell+'</td>';
                        });
                        content += '</tr>';
                    }
                });
                content += '</table></div>'
                //var edt = Controls.Textarea('', { size:65, linecount:20, value: topdata, fixedfont: true, noWrap: true});
                //content += edt.renderHtml();
                var popupid = Popup.create('Data content (top rows)', content);
            });
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
            var edt = Controls.Textarea('', { size:65, linecount:20, value: settingsStr, fixedfont: true, noWrap: true});
            content += edt.renderHtml();
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: '<b>Update settings</b>', width:140, height:35 }).setOnChanged(function() {
                settingsStr = edt.getValue();

                DQX.serverDataStoreLong(MetaData.serverUrl,Base64.encode(settingsStr),function(id) {
                    DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_setsettings',{
                        sourcetype: sourceInfo.tpe,
                        database: sourceInfo.datasetid,
                        workspaceid: sourceInfo.workspaceid,
                        tableid: sourceInfo.tableid,
                        sourceid: sourceInfo.sourceid,
                        contentid: id
                    },function(resp) {
                        DQX.stopProcessing();
                        if ('Error' in resp) {
                            alert(resp.Error);
                            return;
                        }
                        Popup.closeIfNeeded(popupid);
                        Msg.send({type: 'RenderSourceDataInfo'}, {});
                    });
                });

            });
            content += '<p><div style="padding:3px;border:1px solid black;background-color:rgb(255,164,0)"><b>WARNING:<br>Changing these settings may cause the data source not to load correctly!</b></div></p>';
            content += '<p>' + bt.renderHtml() + '<p>' ;
            var popupid = Popup.create('Edit data settings', content);
        }


        CustomDataManager.delData = function(sourceInfo) {
            var content = CustomDataManager.getSourceFileDescription(sourceInfo);
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: '<b><span style="color:red">Delete</span></b>', width:140, height:35 }).setOnChanged(function() {
                DQX.setProcessing();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_del',{
                    sourcetype: sourceInfo.tpe,
                    database: sourceInfo.datasetid,
                    workspaceid: sourceInfo.workspaceid,
                    tableid: sourceInfo.tableid,
                    sourceid: sourceInfo.sourceid
                },function(resp) {
                    DQX.stopProcessing();
                    Popup.closeIfNeeded(popupid);
                    Msg.send({type: 'RenderSourceDataInfo'}, {});
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    if (sourceInfo.workspaceid)
                        alert('NOTE: please re-import the data source to reflect deleted custom data in the server database!');
                });
            });
            content += '<p><div style="padding:3px;border:1px solid black;background-color:rgb(255,164,0)"><b>WARNING:<br>This will permanently remove these data on the server!</b></div></p>';
            content += '<p>' + bt.renderHtml() + '<p>' ;
            var popupid = Popup.create('Delete data', content);
        };

        CustomDataManager.createDataSet = function() {
            var datasetid = prompt('Enter dataset identifier', 'dataset');
            if (datasetid) {
                DQX.setProcessing();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_create_dataset',{
                    database: datasetid
                },function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        Msg.send({type: 'RenderSourceDataInfo'}, {});
                        alert(resp.Error);
                        return;
                    }
                    datasetid = resp.database;
                    Msg.send({type: 'RenderSourceDataInfo'}, {
                        activeDataset: datasetid,
//                        proceedFunction: function() {
//                            Msg.send({type: 'ExecLoadDataFull'}, { datasetid: datasetid});
//                        }
                    });
                });
            }
        };

        CustomDataManager.createWorkspace = function(sourceInfo) {
            var workspaceid = prompt('Enter workspace identifier', 'workspace');
            if (workspaceid) {
                DQX.setProcessing();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_create_workspace',{
                    database: sourceInfo.datasetid,
                    workspaceid: workspaceid
                },function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        Msg.send({type: 'RenderSourceDataInfo'}, {});
                        alert(resp.Error);
                        return;
                    }
                    workspaceid = resp.workspaceid;
                    Msg.send({type: 'RenderSourceDataInfo'}, {
                        proceedFunction: function() {
                            Msg.send({type: 'ExecLoadDataFull'}, { datasetid: sourceInfo.datasetid, workspaceid: workspaceid});
                        }
                    });
                });
            }
        };


        return CustomDataManager;
    });



