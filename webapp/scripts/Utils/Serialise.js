define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData", "Plots/GenericPlot"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData, GenericPlot) {

        var Serialise = {};





        Serialise.createLink = function() {
            var content =Serialise._store();
            var hostname=window.location.hostname;
            var pathname=window.location.pathname;
            var protocol=window.location.protocol;
            DQX.serverDataStore(MetaData.serverUrl,content,function(id) {
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','view_store',
                    { database: MetaData.database, workspaceid:MetaData.workspaceid, id: id },
                    function(resp) {
                        url='{protocol}//{hostname}{pathname}?dataset={ds}&workspace={ws}&view={id}{hash}'.DQXformat({
                            protocol:protocol,
                            hostname:hostname,
                            pathname:pathname,
                            ds:MetaData.database,
                            ws:MetaData.workspaceid,
                            id:id,
                            hash:window.location.hash
                        });
                        var str='';
                        var edt = Controls.Textarea('', { size:80, linecount:4, value: url}).setHasDefaultFocus();
                        str += 'Permanent url to this view:<p>';
                        str += edt.renderHtml();
                        str += '<p>Press Ctrl+C to copy the url to the clipboard';

                        var btOpen = Controls.Button(null, {  content: 'Open in browser' }).setOnChanged(function() {
                            window.open(url,'_blank');
                        });

                        str += btOpen.renderHtml()+'<p></p>';

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
            obj.plotData = GenericPlot.store();
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
            if (obj.plotData)
                GenericPlot.recall(obj.plotData);
        }


        return Serialise;
    });


