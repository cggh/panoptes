define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData) {

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
                    if (MetaData.quickLoad) {// Quick and dirty pick first, for development
                        MetaData.workspaceid  = PromptWorkspace.workspaces[0].id;
                        Application.getChannelInfo(proceedFunction);
                    }
                    else
                        PromptWorkspace.execute2();
                }
            );

        }

        PromptWorkspace.execute2 = function() {
            var wiz=Wizard.Create('SelectWorkSpace', {title:'Select workspace', sizeX:450, sizeY: 400, canCancel: false});

            PromptWorkspace.ctrl_workspacelist = Controls.List(null,{width:400, height:210 })
            var items=[];
            $.each(PromptWorkspace.workspaces,function(id,workspace) {
                items.push({id: workspace.id, content:workspace.name});
            });
            PromptWorkspace.ctrl_workspacelist.setItems(items, (items.length>0)?(items[0].id):(null));
            PromptWorkspace.ctrl_workspacelist.setOnDoubleClick(function() {
                wiz.performFinish();
            });

            var ctrl_add = Controls.Button(null, { content: "Create new..." } )
            ctrl_add.setOnChanged(function() {
                //var id = Popup.create('a','gfkjgfj gg jkgkj gkjgfkj gf jkfgjkg j gg f')
                //setTimeout(function() {
                //    DQX.ClosePopup(id);
                //},2000);
                //return;
                var name = prompt('Enter a name for the workspace');
                if (name!==null) {
                    if (!name)
                        alert('Please provide a name for the workspace');
                    else
                        PromptWorkspace.createNew(name);
                }
            });
            var ctrl_del = Controls.Button(null, { content: "Delete selected..." } );
            ctrl_del.setOnChanged(function() {
                if (!PromptWorkspace.ctrl_workspacelist.getValue()) {
                    alert('There is no workspace selected');
                    return;
                }
                if (confirm('Are you sure you want to permanently delete this workspace?\nNOTE: all associated data will be removed!')) {
                    PromptWorkspace.deleteWorkspace(PromptWorkspace.ctrl_workspacelist.getValue());
                }
            })

            var controls = Controls.CompoundVert([
                PromptWorkspace.ctrl_workspacelist,
                Controls.CompoundHor([ctrl_add,ctrl_del])
            ]);

            wiz.addPage({
                id: 'page1',
                form: controls,
                reportValidationError: function() {
                    if (!PromptWorkspace.ctrl_workspacelist.getValue())
                        return 'Please select a workspace or create a new one';
                }
            });

            wiz.run(function() {
                MetaData.workspaceid = wiz.getResultValue(PromptWorkspace.ctrl_workspacelist.getID());
                Application.getChannelInfo(PromptWorkspace.proceedFunction);
            });
        }

        PromptWorkspace.createNew = function(name) {
            data={};
            data.database = MetaData.database;
            data.name = name;
            asyncRequest('workspace_create', data, function(resp) {
                PromptWorkspace.reload(resp.id);
            });
        }

        PromptWorkspace.deleteWorkspace = function(id) {
            data={};
            data.database = MetaData.database;
            data.id = id;
            DQX.setProcessing();
            DQX.customRequest(MetaData.serverUrl,'uploadtracks','workspace_del',data,function(resp) {
                DQX.stopProcessing();
                if ('Error' in resp) {
                    alert(resp.Error);
                    return;
                }
                PromptWorkspace.reload();
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



