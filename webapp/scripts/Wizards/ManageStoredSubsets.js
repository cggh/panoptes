// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/FrameList", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, base64, Application, Framework, FrameList, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

        var ManageStoredSubsets = {};





        ManageStoredSubsets.manage = function(tableid) {
            var tableInfo = MetaData.mapTableCatalog[tableid];
            var that = PopupFrame.PopupFrame('ManageSubsets_'+tableid, {title:tableInfo.tableCapNameSingle+' subsets', blocking:true, sizeX:400, sizeY:350 });
            that.tableInfo = tableInfo;

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                that.frameList = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(true,true);
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 70).setFrameClassClient('DQXGrayClient');
            };

            that.createPanels = function() {

                that.panelList = FrameList(that.frameList);

                var bt_add = Controls.Button(null, { buttonClass: 'DQXWizardButton', content: 'Create from selection...', bitmap: DQX.BMP('morelines.png'), width:100, height:28 }).setOnChanged(that.onAdd);
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

                that.loadList();

            };

            that.loadList = function(selId) {
                var items = [];
                $.each(that.tableInfo.storedSubsets, function(idx, subset) {
                    items.push({id:subset.id, content:subset.name});
                });
                that.panelList.setItems(items, selId);
                that.panelList.render();
            }


            that.onDel = function() {
                var id = that.panelList.getActiveItem();
                if (id) {
                    var mapIdx = 1;
                    $.each(that.tableInfo.storedSubsets, function(idx, subset) {
                        if (subset.id == id)
                            mapIdx = idx;
                    });
                    if (mapIdx>=0) {
                        if (window.confirm('Remove subset "{name}"?'.DQXformat({name: that.tableInfo.storedSubsets[mapIdx].name}))) {
                            that.tableInfo.storedSubsets.splice(mapIdx, 1);
                            that.loadList();
                            DQX.customRequest(MetaData.serverUrl, PnServerModule, 'subset_delete',
                                {
                                    database: MetaData.database,
                                    tableid: that.tableInfo.id,
                                    workspaceid: MetaData.workspaceid,
                                    id: id
                                }
                                , function() {
                                });
                        }
                    }
                }
            };


            that.onAdd = function() {
                var name = prompt("Please enter a name for the new subset");

                if (name != null) {
                    DQX.customRequest(MetaData.serverUrl, PnServerModule, 'subset_create',
                        {
                            database: MetaData.database,
                            tableid: that.tableInfo.id,
                            workspaceid: MetaData.workspaceid,
                            name: name
                        }
                        , function(resp) {
                            var id = resp['id'];
                            that.tableInfo.storedSubsets.push({id: id, name: name});
                            that.loadList(id);
                            that.storeSelection(id, 'replace')
                        });
                }
            }


            that.storeSelection =function (subsetid, method) {
                var maxSelCount = 50000;
                var datastring = '';
                var keylist = tableInfo.getSelectedList();
                if (keylist.length > maxSelCount)
                    alert('Selection list will be limited to ' + maxSelCount);
                $.each(keylist, function(idx, key) {
                    if(idx <= maxSelCount) {
                        if (idx > 0)
                            datastring+='\t';
                        datastring += key;
                    }
                });
                DQX.setProcessing();
                DQX.serverDataStoreLong(MetaData.serverUrl,datastring,function(id) {
                    DQX.stopProcessing();
                    ServerIO.customAsyncRequest(MetaData.serverUrl,PnServerModule,'subset_store',
                        {
                            database: MetaData.database,
                            workspaceid:MetaData.workspaceid,
                            tableid: that.tableInfo.id,
                            subsetid: subsetid,
                            dataid: id,
                            method: method
                        },
                        function(resp) {
                        }
                    );

                    //debugger;
//                DQX.serverDataFetch(MetaData.serverUrl,id,function(content) {
//                    alert('content length: '+content.length);
//                });
                });
            }


            that.create();

            return that;
        }



        return ManageStoredSubsets;
    });


