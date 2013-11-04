define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

        var Serialise = {};





        Serialise.createLink = function() {
            var content =Serialise._store();
            DQX.serverDataStore(MetaData.serverUrl,content,function(id) {
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','view_store',
                    { database: MetaData.database, workspaceid:MetaData.workspaceid, id: id },
                    function(resp) {
                        url='file:///Users/pvaut/Documents/SourceCode/WebApps/panoptes/webapp/main.html?dataset={ds}&workspace={ws}&view={id}'.DQXformat({ds:MetaData.database, ws:MetaData.workspaceid, id:id});
                        alert(url);
                    });
            });
        };


        Serialise.checkLoadView = function() {
            var viewid  = DQX.getUrlSearchString('view');
            if (viewid) {
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','view_get',
                    { id: viewid },
                    function(resp) {
                        Serialise._recall(resp.settings);
                    });
            }
        };


        Serialise._store = function() {

        }

        Serialise._recall = function() {

        }


        return Serialise;
    });


