// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/FrameList", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, base64, Application, Framework, FrameList, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

        var ManageStoredEntities = {};





        ManageStoredEntities.manage = function(tablename, tableid, nameSingle, namePlural, newValue) {
            var that = PopupFrame.PopupFrame('ManageEntity_'+tablename, {title:'Manage '+namePlural, blocking:true, sizeX:400, sizeY:350 });
            that.tablename = tablename;
            that.tableid = tableid;

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                var frameGroupTop = that.frameRoot.addMemberFrame(Framework.FrameGroupVert('', 0.7)).setSeparatorSize(2);
                that.frameInfo = frameGroupTop.addMemberFrame(Framework.FrameFinal('', 0.01)).setFrameClassClient('InfoBox')
                    .setMargins(8).setAutoSize().setAllowScrollBars(false, false);


                that.frameList = frameGroupTop.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(true,true);
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 47).setFrameClassClient('DQXGrayClient');
            };

            that.createPanels = function() {
                var panelInfo = Framework.Form(this.frameInfo);
                panelInfo.addHtml("Stored queries are permanently maintained on the server, and can be recalled during later sessions or shared with other users.");
                panelInfo.render();

                that.panelList = FrameList(that.frameList);

                that.reload();

                var bt_add = Controls.Button(null, { buttonClass: 'PnButtonGrid', content: 'Add current', bitmap: 'Bitmaps/actionbuttons/new.png', width:100, height:35 }).setOnChanged(that.onAdd);
                var bt_del = Controls.Button(null, { buttonClass: 'PnButtonGrid', content: 'Delete selected', bitmap: 'Bitmaps/actionbuttons/delete.png', width:100, height:35 }).setOnChanged(that.onDel);
                var bt_default = Controls.Button(null, { buttonClass: 'PnButtonGrid', content: 'Set selected as default', bitmap: 'Bitmaps/actionbuttons/import.png', width:120, height:35 }).setOnChanged(that.onDefault);

                that.panelButtons = Framework.Form(that.frameButtons);

                that.panelButtons.addControl(Controls.CompoundHor([
                    bt_add,
                    bt_del,
                    bt_default
                ]));

            };


            that.reload = function() {
                var getter = DataFetchers.ServerDataGetter();
                getter.addTable(
                    tablename,
                    ['id','name', 'content'],
                    'name',
                    SQL.WhereClause.AND([
                        SQL.WhereClause.CompareFixed('workspaceid','=',MetaData.workspaceid),
                        SQL.WhereClause.CompareFixed('tableid','=',that.tableid)
                    ])
                );
                getter.execute(MetaData.serverUrl, MetaData.database, function() {
                    var data = getter.getTableRecords(tablename);
                    that.itemsByID = {};
                    var items = [];
                    $.each(data, function(idx, record) {
                        items.push({id:record.id, content:record.name, query:record.content});
                        that.itemsByID[record.id] = {id:record.id, content:record.name, query:record.content};
                    });
                    that.panelList.setItems(items);
                    that.panelList.render();
                });
            };


            that.onDel = function() {
                var id = that.panelList.getActiveItem();
                if (id) {
                    if (window.confirm("Remove "+nameSingle+'?')) {
                        DQX.customRequest(MetaData.serverUrl, PnServerModule, 'delstoredentity',
                            {
                                database: MetaData.database,
                                tablename: tablename,
                                id: id
                            }
                            , function() {
                                that.reload();
                                Msg.broadcast({ type: 'StoredQueriesModified'}, { tableid: that.tableid});
                            });
                    }
                }
            };


            that.onAdd = function() {
                var name = prompt("Please enter a name for the "+nameSingle,"");

                if (name != null) {
                    DQX.customRequest(MetaData.serverUrl, PnServerModule, 'addstoredentity',
                        {
                            database: MetaData.database,
                            tablename: tablename,
                            tableid: that.tableid,
                            workspaceid: MetaData.workspaceid,
                            name: name,
                            content: newValue
                        }
                        , function(resp) {
                            that.reload();
                            Msg.broadcast({ type: 'StoredQueriesModified'}, { tableid: that.tableid});
                    });
                }
            }

            that.onDefault = function() {
                var id = that.panelList.getActiveItem();
                if (id) {
                    var query = that.itemsByID[id].query;
                    DQX.customRequest(MetaData.serverUrl, PnServerModule, 'update_default_query',
                      {
                          database: MetaData.database,
                          id: that.tableid,
                          defaultQuery: query
                      }, function() {
                          alert('Default set');
                      });
                }
            };


            that.create();

            return that;
        }



        return ManageStoredEntities;
    });


