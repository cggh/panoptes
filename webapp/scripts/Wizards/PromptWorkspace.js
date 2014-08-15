// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/ServerIO", "DQX/Wizard", "DQX/Popup", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, ServerIO, Wizard, Popup, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData) {

        var PromptWorkspace = {};

        PromptWorkspace.init = function() {
        }

        PromptWorkspace.execute = function(proceedFunction) {
            PromptWorkspace.proceedFunction = proceedFunction;
            var getter = DataFetchers.ServerDataGetter();//Instantiate the fetcher object
            getter.addTable('workspaces',['id','name'],'name');
            getter.execute(
                MetaData.serverUrl,
                MetaData.database,
                function() {
                    PromptWorkspace.workspaces = getter.getTableRecords('workspaces');
                    MetaData.workspaceid = '';
                    if (DQX.getUrlSearchString('workspace'))
                        MetaData.workspaceid = DQX.getUrlSearchString('workspace');
                    if (PromptWorkspace.workspaces.length == 0)
                        alert('ERROR: this dataset does not contain any workspace');
                    if (PromptWorkspace.workspaces.length == 1)
                        MetaData.workspaceid = PromptWorkspace.workspaces[0].id;
                    if (MetaData.workspaceid)
                        Application.getChannelInfo(proceedFunction);
                    else
                        PromptWorkspace.execute2();
                }
            );

        }

        PromptWorkspace.execute2 = function() {
            var wiz=Wizard.Create('SelectWorkSpace', {title:'Panoptes - Select workspace', sizeX:450, sizeY: 400, canCancel: false, noBackground: true});

            PromptWorkspace.ctrl_workspacelist = Controls.List(null,{width:400, height:250 })
            var items=[];
            $.each(PromptWorkspace.workspaces,function(id,workspace) {
                items.push({id: workspace.id, content:workspace.name});
            });
            PromptWorkspace.ctrl_workspacelist.setItems(items, (items.length>0)?(items[0].id):(null));
            PromptWorkspace.ctrl_workspacelist.setOnDoubleClick(function() {
                wiz.performFinish();
            });


            var controls = Controls.CompoundVert([
                PromptWorkspace.ctrl_workspacelist
            ]);

            wiz.addPage({
                id: 'page1',
                form: controls,
                reportValidationError: function() {
                    if (!PromptWorkspace.ctrl_workspacelist.getValue())
                        return 'Please select a workspace';
                }
            });

            wiz.run(function() {
                MetaData.workspaceid = wiz.getResultValue(PromptWorkspace.ctrl_workspacelist.getID());
                Application.getChannelInfo(PromptWorkspace.proceedFunction);
            });
        }

        PromptWorkspace.reload = function(selid) {
            var getter = DataFetchers.ServerDataGetter();//Instantiate the fetcher object
            getter.addTable('workspaces',['id','name'],'name');
            getter.execute(MetaData.serverUrl,MetaData.database,
                function() {
                    PromptWorkspace.workspaces = getter.getTableRecords('workspaces');
                    var items=[];
                    $.each(PromptWorkspace.workspaces,function(id,workspace) {
                        items.push({id: workspace.id, content:workspace.name});
                    });
                    var selectedid = selid;
                    if (!selectedid)
                        selectedid = (items.length>0)?(items[0].id):(null);
                    PromptWorkspace.ctrl_workspacelist.setItems(items,selectedid);
                }
            );
        }




        return PromptWorkspace;
    });



