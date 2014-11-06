// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL",
    "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas",
    "DQX/DataFetcher/DataFetchers", "DQX/HistoryManager",  "Wizards/EditQuery", "MetaData", "Plots/GenericPlot"
],
    function (
        require, Base64, Application, Framework, Controls, Msg, SQL,
        DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas,
        DataFetchers, HistoryManager, EditQuery, MetaData, GenericPlot
        ) {

        var Serialise = {};


        Serialise.createStoredURL = function(callback) {
          var content = Serialise._store();
          var hostname = window.location.hostname;
          var pathname = window.location.pathname;
          var protocol = window.location.protocol;
          var portToken = '';
          if (window.location.port)
            if (window.location.port != 80)
              portToken = ':' + window.location.port;
          DQX.serverDataStore(MetaData.serverUrl, content, function (id) {
            DQX.customRequest(MetaData.serverUrl, PnServerModule, 'view_store',
              { database: MetaData.database, workspaceid: MetaData.workspaceid, id: id },
              function (resp) {
                var url = '{protocol}//{hostname}{port}{pathname}?dataset={ds}&workspace={ws}&view={id}'.DQXformat({
                  protocol: protocol,
                  hostname: hostname,
                  port: portToken,
                  pathname: pathname,
                  ds: MetaData.database,
                  ws: MetaData.workspaceid,
                  id: id
                });
                var theState = null;
                $.each(Application.getViewList(), function (idx, view) {
                  if (view.isActive())
                    theState = view.getStateID()
                });
                if (theState) {
                  url += '&state=' + theState;
                }
                callback(url, theState);
              });
          });
        };


        Serialise.createLink = function() {
            Serialise.createStoredURL(function(url, theState) {
              var str = '';
              var edt = Controls.Textarea('', { size: 80, linecount: 4, value: url}).setHasDefaultFocus();
              str += 'Permanent url to this view:<p>';
              str += edt.renderHtml();
              str += '<p>Press Ctrl+C to copy the url to the clipboard';

              var btOpen = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon:'fa-external-link-square', width:120, height:45, content: 'Open in browser' }).setOnChanged(function () {
                window.open(url, '_blank');
              });
              str += btOpen.renderHtml();

                if (MetaData.isManager) {
                    var btCreateIntroView = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon:'fa-plus-square', width:130, height:45, content: 'Add to start page <b>(full app state)</b>' }).setOnChanged(function () {
                        require("Utils/IntroViews").createIntroView(Base64.encode(url), id, theState, 'Add view to start page');
                    });
                    str += btCreateIntroView.renderHtml();
                    var btCreateIntroView = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon:'fa-plus-square', width:130, height:45, content: 'Add to start page <b>(current view)</b>' }).setOnChanged(function () {
                        Serialise.createCurrentViewIntroView();
                    });
                    str += btCreateIntroView.renderHtml();
                    var btCreateIntroView = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon:'fa-plus-square', width:130, height:45, content: 'Add to start page <b>(predefined action)</b>' }).setOnChanged(function () {
                        Serialise.createPredefinedIntroView();
                    });
                    str += btCreateIntroView.renderHtml();
                }

              str += '<p></p>';

              Popup.create('Permanent link to view', str);
            });
        };

        Serialise.createCurrentViewIntroView = function() {

            var theView = null;
            $.each(Application.getViewList(), function (idx, view) {
                if (view.isActive())
                    theView = view;
            });
            if (!theView || !theView.storeSettings) {
                alert('No view to store');
                return;
            }

            var obj = {};
            obj.tableData = {};
            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                obj.tableData[tableInfo.id] = tableInfo.storeSettings();
            });
            obj.viewData = {};
            obj.viewData[theView.getStateID()] = theView.storeSettings();
            obj.activeView = theView.getStateID();


            var content = Base64.encode(JSON.stringify(obj));
            DQX.serverDataStore(MetaData.serverUrl, content, function (id) {
                DQX.customRequest(MetaData.serverUrl, PnServerModule, 'view_store',
                    { database: MetaData.database, workspaceid: MetaData.workspaceid, id: id },
                    function (resp) {
                        require("Utils/IntroViews").createIntroView('view', id, theView.getStateID(), 'Add to start page');
                    });
            });

            //require("Utils/IntroViews").createIntroView(Base64.encode(url), id, theState, 'Add view to start page');
        };


        Serialise.createPredefinedIntroView = function() {
            var options = [];
            options.push({id:'find:_gene_', name:'Find gene'});
            options.push({id:'find:_genomicregion_', name:'Find genomic region'});
            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                options.push({id:'find:'+tableInfo.id, name:'Find '+tableInfo.tableNameSingle});
            });
            var content = '';
            $.each(options, function(idx, option) {
                var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', width:300, height:20, content: option.name }).setOnChanged(function () {
                    Popup.closeIfNeeded(popupid);
                    require("Utils/IntroViews").createIntroView(option.id, '-', '-', 'Add to start page');
                });
                content += bt.renderHtml()+'<br>';
            });
            var popupid = Popup.create('Create predefined view button', content);
        }



        Serialise.checkLoadView = function(proceedFunction) {
            var viewid  = DQX.getUrlSearchString('view');
            var link_load = false;
            if (viewid) {
                ga('send', 'screenview', {screenName: 'stored_view'});
                link_load = true;
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'view_get',
                    { id: viewid },
                    function(resp) {
                        if (DQX.getUrlSearchString('state')) {
                            HistoryManager.__preventSetFragment = true;
                            Application.activateView(DQX.getUrlSearchString('state'));
                            HistoryManager.__preventSetFragment = false;
                        }
                        Serialise._recall(resp.settings);
                        proceedFunction();
                    });
                return;
            }

            var tableid  = DQX.getUrlSearchString('tableid');
            var itemid  = DQX.getUrlSearchString('itemid');
            if (tableid && itemid) {
                ga('send', 'screenview', {screenName: 'item_url'});
                link_load = true;
                HistoryManager.__preventSetFragment = true;
                Application.activateView('table_' + tableid);
                HistoryManager.__preventSetFragment = false;
                Msg.send({ type: 'ItemPopup' }, { tableid: tableid, itemid: itemid } );
            }
            
            if (!link_load)
                ga('send', 'screenview', {screenName: 'start'});


            proceedFunction();
        };


        Serialise._store = function() {
            var obj = {};
            obj.tableData = {};
            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                obj.tableData[tableInfo.id] = tableInfo.storeSettings();
            });
            obj.viewData = {};
            $.each(Application.getViewList(), function(idx,view) {
                if (view.storeSettings)
                    obj.viewData[view.getStateID()] = view.storeSettings();
            });
            obj.plotData = GenericPlot.store();
            obj.itemPopupData = require("InfoPopups/ItemPopup").store();
            var st = JSON.stringify(obj);
            return Base64.encode(st);

        }

        Serialise._recall = function(settingsStr) {
            var st = Base64.decode(settingsStr);
            var obj = JSON.parse(st);

            if (obj.tableData) {
                $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                    if (obj.tableData[tableInfo.id])
                        tableInfo.recallSettings(obj.tableData[tableInfo.id]);
                });
            }

            $.each(Application.getViewList(), function(idx,view) {
                if ( (view.recallSettings) && (obj.viewData[view.getStateID()]) )
                    view.recallSettings(obj.viewData[view.getStateID()]);
            });
            if (obj.plotData)
                GenericPlot.recall(obj.plotData);

            if (obj.itemPopupData)
                require("InfoPopups/ItemPopup").recall(obj.itemPopupData);

        }

        Msg.listen('',{ type: 'LoadStoredView' }, function(scope, storeid) {
            DQX.serverDataFetch(MetaData.serverUrl, storeid, function(content) {
                var obj = JSON.parse(Base64.decode(content));
                Application.activateView(obj.activeView);
                if (obj.tableData) {
                    $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                        if (obj.tableData[tableInfo.id])
                            tableInfo.recallSettings(obj.tableData[tableInfo.id]);
                    });
                }
                $.each(Application.getViewList(), function(idx,view) {
                    if ( (view.recallSettings) && (obj.viewData[view.getStateID()]) )
                        view.recallSettings(obj.viewData[view.getStateID()]);
                });
            });
        });


        return Serialise;
    });


