define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData) {

        var UploadProperties = {};

        UploadProperties.init = function() {
        }

        UploadProperties.execute = function(proceedFunction) {
            UploadProperties.proceedFunction = proceedFunction;

            var wiz=Wizard.Create('UploadProperties', {title:'Upload custom properties', sizeX:450, sizeY: 400});

            var ctrl_trackFile = Controls.FileUpload(null, { serverUrl: MetaData.serverUrl }).setOnChanged(function() {
                UploadProperties.getFileInfo(ctrl_trackFile.getValue());
            });

            UploadProperties.ctrl_table=Controls.RadioGroup('ctrl_table',{ label:'Upload to table', states: MetaData.tableCatalog, value:MetaData.tableCatalog[0].id})

            UploadProperties.ctrl_uploadresults = Controls.Html(null,"");

            var controls = Controls.CompoundVert([
                Controls.Static('Select a TAB delimited file from your local hard disk, containing the custom properties that you want to upload'),
                ctrl_trackFile,
                UploadProperties.ctrl_uploadresults
            ]);

            UploadProperties.propControls = Controls.CompoundVert([]);


            wiz.addPage({
                id: 'page0',
                form: UploadProperties.ctrl_table,
                reportValidationError: function() {
                }
            });


            wiz.addPage({
                id: 'page1',
                form: controls,
                onStart: function() {
                    UploadProperties.tableid = wiz.getResultValue(UploadProperties.ctrl_table.getID());
                    UploadProperties.primkey = MetaData.mapTableCatalog[UploadProperties.tableid].primkey;
                },
                reportValidationError: function() {
                    if (!ctrl_trackFile.getValue())
                        return "No file selected";
                    if (!UploadProperties.correctFileUploaded)
                        return "Invalid file";
                }
            });

            wiz.addPage({
                id: 'page2',
                form: UploadProperties.propControls,
                reportValidationError: function() {
                    var uploadingProperty = false;
                    $.each(UploadProperties.columns,function(idx,colname) {
                        if (colname!=UploadProperties.primkey) {
                            var propChoice=UploadProperties.propControls.findControl('propchoice_'+colname).getValue();
                            if (propChoice) uploadingProperty = true;
                        }
                    });
                    if (!uploadingProperty) return "No property is selected for upload";
                }
            });


            wiz.run(function() {
                var propChoiceString = '';
                $.each(UploadProperties.columns,function(idx,colname) {
                    if (colname!=UploadProperties.primkey) {
                        var propChoice=wiz.getResultValue('propchoice_'+colname);
                        if (propChoice) {
                            if (propChoiceString) propChoiceString += '~';
                            propChoiceString += colname+'~';
                            propChoiceString += propChoice;
                        }
                    }
                });
                var data = {};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.fileid = wiz.getResultValue(ctrl_trackFile.getID());
                data.props = propChoiceString;
                data.tableid = UploadProperties.tableid;
                asyncRequest('property_add', data, function(resp) {
                    Msg.send({ type: 'ReloadChannelInfo' });
                    UploadProperties.proceedFunction();
                });

            });
        }


        UploadProperties.getFileInfo = function(fileid) {
            UploadProperties.correctFileUploaded = false;
            DQX.setProcessing();
            DQX.customRequest(MetaData.serverUrl,'uploadtracks','gettabfileinfo',{ database: MetaData.database, fileid: fileid },function(resp) {
                DQX.stopProcessing();
                if ('Error' in resp) {
                    alert(resp.Error);
                    return;
                }
                UploadProperties.columns = resp['columns'].split(';');
                var hasPrimKey = false;
                UploadProperties.propControls.clear();
                $.each(UploadProperties.columns,function(idx,colname) {
                    if (colname==UploadProperties.primkey)
                        hasPrimKey = true;
                    else {
                        var choice  = Controls.Combo('propchoice_'+colname,{label:'', states:[{id:'', name:'Ignore'}, {id:'Text', name:'Upload (text)'}, {id:'Value', name:'Upload (value)'}, {id:'Boolean', name:'Upload (boolean)'}], val:['']});
                        var fieldStatus = 'New field';
                        var isPresent = false;
                        $.each(MetaData.customProperties, function(idx, prop) {
                            if ((colname==prop.propid) && (UploadProperties.tableid==prop.tableid))
                                isPresent = true;
                        });
                        if (isPresent)
                            var fieldStatus = '<span style="color:red">Present in workspace</span>';
                        UploadProperties.propControls.addControl(Controls.CompoundHor([
                            Controls.Static(colname),
                            Controls.HorizontalSeparator(15),
                            choice,
                            Controls.HorizontalSeparator(15),
                            Controls.Static(fieldStatus),
                        ]));
                        UploadProperties.propControls.addControl(Controls.VerticalSeparator(7));
                    }
                });
                if (!hasPrimKey) {
                    alert('File does not have the required column "{primkey}"'.DQXformat({primkey: UploadProperties.primkey}));
                    return;
                }
                UploadProperties.correctFileUploaded = true;
                //alert(JSON.stringify(resp));
                UploadProperties.ctrl_uploadresults.modifyValue('<b><br/>Click "Next" to proceed.</b>');
            });
        }


        return UploadProperties;
    });



