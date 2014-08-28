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

        var RefGenomeManager = {};

        RefGenomeManager.uploadData = function(datasetid) {
            var content = '';
            content += '<p><i>Upload reference genome data</i></p>';
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', bitmap:'Bitmaps/actionbuttons/import.png', content: '<b>Annotation</b><br>(GFF file)', width:180, height:35 }).setOnChanged(function() {
                Popup.closeIfNeeded(popupid);
                RefGenomeManager.uploadAnnotation(datasetid);
            });
            content += bt.renderHtml() + '<br>';
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', bitmap:'Bitmaps/actionbuttons/import.png', content: '<b>Reference genome</b><br>(FASTA file)', width:180, height:35 }).setOnChanged(function() {
                Popup.closeIfNeeded(popupid);
                RefGenomeManager.uploadRefGenome(datasetid);
            });
            content += bt.renderHtml() + '<br>';
            var popupid = Popup.create('Upload data', content);
        };

        RefGenomeManager.uploadAnnotation = function(datasetid) {
            var content = '';
            content += '<p>Select a local GFF file containing<br>the reference genome annotation:<p>';

            var ctrl_uploadFile = Controls.FileUpload(null, { serverUrl: MetaData.serverUrl }).setOnChanged(function() {
            });
            content += ctrl_uploadFile.renderHtml() + '<p>';

            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon: 'fa-plus', content: '<b>Create annotation</b>', width:140, height:35 }).setOnChanged(function() {
                var fileid = ctrl_uploadFile.getValue();
                var filename = ctrl_uploadFile.getFileName();
                if (!fileid) {
                    alert('Please select a file to upload.');
                    return;
                }
                Popup.closeIfNeeded(popupid);
                DQX.setProcessing();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_upload_rgannotation',{
                    database: datasetid,
                    fileid: fileid,
                },function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    tableid = resp.tableid;
                    Msg.send({type: 'RenderSourceDataInfo'}, {
                        proceedFunction: function() {
                            RefGenomeManager.editChromosomes(datasetid);
                        }
                    });
                });
            });

            content += bt.renderHtml() + '&nbsp;&nbsp;' + MiscUtils.createDocButton('importdata/addannotation').renderHtml() + '<p>';

            var popupid = Popup.create('Upload reference genome annotation', content);
        };


        RefGenomeManager.uploadRefGenome = function(datasetid) {
            var content = '';
            content += '<p>Select a local FASTA file containing<br>the reference genome sequence:<p>';

            var ctrl_uploadFile = Controls.FileUpload(null, { serverUrl: MetaData.serverUrl }).setOnChanged(function() {
            });
            content += ctrl_uploadFile.renderHtml() + '<p>';

            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon: 'fa-plus', content: '<b>Create reference genome</b>', width:140, height:35 }).setOnChanged(function() {
                var fileid = ctrl_uploadFile.getValue();
                var filename = ctrl_uploadFile.getFileName();
                if (!fileid) {
                    alert('Please select a file to upload.');
                    return;
                }
                Popup.closeIfNeeded(popupid);
                DQX.setProcessing();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_upload_rgsequence',{
                    database: datasetid,
                    fileid: fileid,
                },function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    tableid = resp.tableid;
                    Msg.send({type: 'RenderSourceDataInfo'}, {
                        proceedFunction: function() {
                            RefGenomeManager.editChromosomes(datasetid);
                        }
                    });
                });
            });

            content += bt.renderHtml() + '&nbsp;&nbsp;' + MiscUtils.createDocButton('importdata/addrefgenome').renderHtml() + '<p>';

            var popupid = Popup.create('Upload reference genome sequence', content);
        };



        RefGenomeManager.editData = function(datasetid) {
            var content = '';
            content += '<p></p>';
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: 'Edit <b>Chromosome definitions</b>', width:180, height:35 }).setOnChanged(function() {
                Popup.closeIfNeeded(popupid);
                RefGenomeManager.editChromosomes(datasetid);
            });
            content += bt.renderHtml() + '<br>';
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: 'Edit <b>Settings</b>', width:180, height:35 }).setOnChanged(function() {
                Popup.closeIfNeeded(popupid);
                RefGenomeManager.editSettings(datasetid);
            });
            content += bt.renderHtml() + '<br>';
            var popupid = Popup.create('Edit reference genome definition', content);
        };


        RefGenomeManager.editChromosomes = function(datasetid) {
            DQX.setProcessing();
            DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_rggetchromosomes',{
                database: datasetid
            },function(resp) {
                DQX.stopProcessing();
                if ('Error' in resp) {
                    alert(resp.Error);
                    return;
                }
                var settingsStr = Base64.decode(resp.content);
                RefGenomeManager._editChromosomes_2(datasetid, settingsStr);
            });
        };

        RefGenomeManager._editChromosomes_2 = function(datasetid, settingsStr) {
            var content = '<p><i>Please enter the chromosome information as a TAB-delimited file<br>with 2 columns: "chrom" and "length".<br>Lengths are in megabases</i></p>';
            var edt = Controls.Textarea('', { size:65, linecount:20, value: settingsStr, fixedfont: true, noWrap: true, accepttabs: true});
            content += edt.renderHtml();
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: '<b>Update chromosome definition</b>', width:140, height:35 }).setOnChanged(function() {
                settingsStr = edt.getValue();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_rgsetchromosomes',{
                    database: datasetid,
                    content: Base64.encode(settingsStr)
                },function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    Popup.closeIfNeeded(popupid);
                    Msg.send({type: 'RenderSourceDataInfo'}, {});
//                    RefGenomeManager.importData(datasetid);
                });
            });
            content += '<p><div style="padding:3px;border:1px solid black;background-color:rgb(255,164,0)"><b>WARNING:<br>Changing these settings may cause the data source not to load correctly!</b></div></p>';
            content += '<p>' + bt.renderHtml() + '<p>' ;
            var popupid = Popup.create('Edit chromosome definition', content);
        }



        RefGenomeManager.editSettings = function(datasetid) {
            DQX.setProcessing();
            DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_rggetsettings',{
                database: datasetid
            },function(resp) {
                DQX.stopProcessing();
                if ('Error' in resp) {
                    alert(resp.Error);
                    return;
                }
                var settingsStr = Base64.decode(resp.content);
                RefGenomeManager._editSettings_2(datasetid, settingsStr);
            });
        };

        RefGenomeManager._editSettings_2 = function(datasetid, settingsStr) {
            var content = '<p><i>Reference genome processing settings</i></p>';
            var edt = Controls.Textarea('', { size:65, linecount:20, value: settingsStr, fixedfont: true, noWrap: true });
            content += edt.renderHtml();
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon:'fa-refresh', content: '<b>Update reference genome settings</b>', width:170, height:35 }).setOnChanged(function() {
                settingsStr = edt.getValue();

                var enc = Base64.encode(settingsStr);
                var dec= Base64.decode(enc);

                DQX.customRequest(MetaData.serverUrl,PnServerModule,'filesource_rgsetsettings',{
                    database: datasetid,
                    content: Base64.encode(settingsStr)
                },function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    Popup.closeIfNeeded(popupid);
                    Msg.send({type: 'RenderSourceDataInfo'}, {});
//                    RefGenomeManager.importData(datasetid);
                });
            });


            var bt_help = MiscUtils.createDocButton('importdata/importsettings/refgenome');

            content += '<p><div style="padding:3px;border:1px solid black;background-color:rgb(255,164,0)"><b>WARNING:<br>Changing these settings may cause the data source not to load correctly!</b></div></p>';
            content += '<p>' + bt.renderHtml() + '&nbsp;&nbsp;' + bt_help.renderHtml() + '<p>' ;
            var popupid = Popup.create('Edit reference genome settings', content);
        }



        RefGenomeManager.importData = function(datasetid) {
            alert('Please re-import the dataset to the server to reflect the changes performed.');
        };


        return RefGenomeManager;
    });



