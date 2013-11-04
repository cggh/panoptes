define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

        var Serialise = {};





        Serialise.createLink = function() {
            var content ='xxxxx'
            DQX.serverDataStore(MetaData.serverUrl,content,function(id) {
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','view_store',
                    { database: MetaData.database, workspaceid:MetaData.workspaceid, id: id },
                    function(resp) {
                        alert('done');
                    });
            });
        }



        return Serialise;
    });


