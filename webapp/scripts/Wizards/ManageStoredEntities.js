define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/FrameList", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, base64, Application, Framework, FrameList, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

        var ManageStoredEntities = {};





        ManageStoredEntities.manage = function(tablename, tableid, nameSingle, namePlural, newValue) {
            var that = PopupFrame.PopupFrame('ManageEntity_'+tablename, {title:'Manage '+namePlural, blocking:true, sizeX:400, sizeY:350 });
            that.tablename = tablename;
            that.tableid = tableid;

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                that.frameList = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(true,true);
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 70).setFrameClassClient('DQXGrayClient');
            };

            that.createPanels = function() {

                that.panelList = FrameList(that.frameList);

                that.reload();

                var bt_add = Controls.Button(null, { buttonClass: 'DQXWizardButton', content: 'Add current...', bitmap: DQX.BMP('morelines.png'), width:100, height:28 }).setOnChanged(that.onAdd);
                var bt_del = Controls.Button(null, { buttonClass: 'DQXWizardButton', content: 'Delete selected...', bitmap: DQX.BMP('lesslines.png'), width:100, height:28 }).setOnChanged(that.onDel);

                that.panelButtons = Framework.Form(that.frameButtons);

                var bt_close = Controls.Button(null, { buttonClass: 'DQXWizardButton', content: 'Close', /*width:80,*/ height:25 }).setOnChanged(function() {
                    that.close();
                });

                that.panelButtons.addControl(Controls.CompoundHor([
                    Controls.HorizontalSeparator(7),
                    bt_add,
                    bt_del
                ]));
                that.panelButtons.addControl(Controls.AlignRight(Controls.CompoundHor([
                    bt_close,
                    Controls.HorizontalSeparator(7)
                ])));

            };


            that.reload = function() {
                var getter = DataFetchers.ServerDataGetter();
                getter.addTable(
                    tablename,
                    ['id','name'],
                    'name',
                    SQL.WhereClause.AND([
                        SQL.WhereClause.CompareFixed('workspaceid','=',MetaData.workspaceid),
                        SQL.WhereClause.CompareFixed('tableid','=',that.tableid)
                    ])
                );
                getter.execute(MetaData.serverUrl, MetaData.database, function() {
                    var data = getter.getTableRecords(tablename);
                    var items = [];
                    $.each(data, function(idx, record) {
                        items.push({id:record.id, content:record.name});
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

            that.create();

            return that;
        }



        return ManageStoredEntities;
    });


