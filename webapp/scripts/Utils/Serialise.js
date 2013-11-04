define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

        var Serialise = {};





        Serialise.createLink = function() {
            var content =Serialise._store();
            DQX.serverDataStore(MetaData.serverUrl,content,function(id) {
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','view_store',
                    { database: MetaData.database, workspaceid:MetaData.workspaceid, id: id },
                    function(resp) {
                        url='file:///Users/pvaut/Documents/SourceCode/WebApps/panoptes/webapp/main.html?dataset={ds}&workspace={ws}&view={id}{hash}'.DQXformat({
                            ds:MetaData.database,
                            ws:MetaData.workspaceid,
                            id:id,
                            hash:window.location.hash
                        });
                        var str='';
                        var edt = Controls.Edit('', { size:80, value: url}).setHasDefaultFocus();
                        str += 'Permanent url to this view:<p>';
                        str += edt.renderHtml();
                        str += '<p>Press Ctrl+C to copy the url to the clipboard';
                        Popup.create('Permanent link to view',str);
                        //alert(url);
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
            var obj = {};
            obj.viewData = {};
            $.each(Application.getViewList(), function(idx,view) {
                if (view.storeSettings)
                    obj.viewData[view.getStateID()] = view.storeSettings();
            });
            var st = JSON.stringify(obj);
            return Base64.encode(st);

        }

        Serialise._recall = function(settingsStr) {
            var st = Base64.decode(settingsStr);
            var obj = JSON.parse(st);

            $.each(Application.getViewList(), function(idx,view) {
                if ( (view.recallSettings) && (obj.viewData[view.getStateID()]) )
                    view.recallSettings(obj.viewData[view.getStateID()]);
            });
        }


        return Serialise;
    });


