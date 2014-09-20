// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/FrameList", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers",
    "Wizards/EditQuery", "MetaData", "DQX/ServerIO"
],
    function (
        require, base64, Application, Framework, FrameList, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers,
              EditQuery, MetaData, ServerIO
        ) {

        var ManageStoredSubsets = {};





        ManageStoredSubsets.manage = function(tableid) {
            var tableInfo = MetaData.mapTableCatalog[tableid];
            var that = PopupFrame.PopupFrame('ManageSubsets_'+tableid, {title:tableInfo.tableCapNameSingle+' subsets', blocking:true, sizeX:500, sizeY:350 });
            that.tableInfo = tableInfo;

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                var frameGroupTop = that.frameRoot.addMemberFrame(Framework.FrameGroupVert('', 0.7)).setSeparatorSize(2);
                that.frameInfo = frameGroupTop.addMemberFrame(Framework.FrameFinal('', 0.01)).setFrameClassClient('InfoBox')
                .setMargins(8).setAutoSize().setAllowScrollBars(false, false);
                that.frameList = frameGroupTop.addMemberFrame(Framework.FrameFinal('', 0.99))
                    .setAllowScrollBars(false,false);
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 47).setFrameClassClient('DQXGrayClient')
                    .setAllowScrollBars(false,false);
            };

            that.createPanels = function() {

                var panelInfo = Framework.Form(this.frameInfo);
                panelInfo.addHtml("A subset is a named collection of {names} that is saved on the server, and can be shared with other users.".DQXformat({names: that.tableInfo.tableNamePlural}));
                panelInfo.render();

                that.panelList = FrameList(that.frameList);
                that.panelList.setOnOpen(that.handleOpenSubset);

                var buttonH = 35;
                var bt_open = Controls.Button(null, { buttonClass: 'PnButtonGrid', content: 'Open', bitmap: 'Bitmaps/actionbuttons/open.png', width:90, height:buttonH }).setOnChanged(that.handleOpenSubset);
                var bt_add = Controls.Button(null, { buttonClass: 'PnButtonGrid', content: 'Create new...', bitmap: 'Bitmaps/actionbuttons/new.png', width:90, height:buttonH }).setOnChanged(that.onAdd);
                var bt_edit = Controls.Button(null, { buttonClass: 'PnButtonGrid', content: 'Edit content...', bitmap: 'Bitmaps/actionbuttons/edit.png', width:90, height:buttonH }).setOnChanged(that.onEdit);
                var bt_del = Controls.Button(null, { buttonClass: 'PnButtonGrid', content: 'Delete...', bitmap: 'Bitmaps/actionbuttons/delete.png', width:90, height:buttonH }).setOnChanged(that.onDel);

                that.panelButtons = Framework.Form(that.frameButtons);

                that.panelButtons.addControl(Controls.CompoundHor([
                    bt_open,
                    bt_add,
                    bt_edit,
                    bt_del
                ]));

                that.loadList();

            };

            that.loadList = function(selId) {
                var items = [];
                $.each(that.tableInfo.storedSubsets, function(idx, subset) {
                    var content = '<div style="display:inline;margin-top:2px">'+subset.name+'</div>';
                    if (subset.membercount!==null) {
                        countstring = subset.membercount;
                        if (subset.membercount>MetaData.subset_membercount_maxcount)
                            countstring = '>'+ MetaData.subset_membercount_maxcount;
                        content += '<div style="margin-left:40px;margin-top:3px;color:rgb(120,120,120)">{count} {names}</div>'.DQXformat({count: countstring, names: that.tableInfo.tableNamePlural});
                    }
                    items.push({
                        id:subset.id,
                        content:content,
                        icon:'Bitmaps/list.png'
                    });
                });
                that.panelList.setItems(items, selId);
                that.panelList.render();
            }


            that.checkSubsetHighlighted = function() {
                if (!that.panelList.getActiveItem()) {
                    Popup.create('Error', '<p>There is currently no {name} subset defined.<p>'.DQXformat({name:that.tableInfo.tableNamePlural}));
                    return false;
                }
                else
                    return true;
            };

            that.onDel = function() {
                if (!that.checkSubsetHighlighted())
                    return;
                var id = that.panelList.getActiveItem();
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

            that.handleOpenSubset = function() {
                if (!that.checkSubsetHighlighted())
                    return;
                var id = that.panelList.getActiveItem();
                var query = that.tableInfo.createSubsetWhereclause(id);
                Msg.send({type: 'DataItemTablePopup'}, {
                    tableid: that.tableInfo.id,
                    query: query,
                    subSamplingOptions: null,
                    title: tableInfo.tableCapNamePlural + ' subset'
                });
                that.close();
            }


            that.onEdit = function() {
                if (!that.checkSubsetHighlighted())
                    return;
                var id = that.panelList.getActiveItem();
                var mapIdx = 1;
                $.each(that.tableInfo.storedSubsets, function(idx, subset) {
                    if (subset.id == id)
                        mapIdx = idx;
                });
                var content = '';

                var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: 'Clear subset', bitmap:'Bitmaps/circle_red_small.png', width:140, height:50 }).setOnChanged(function() {
                    Popup.closeIfNeeded(popupid);
                    that.clearSubset(id);
                });
                content += '<p>';
                content += bt.renderHtml();
                content += '<p><p>';

                var keylist = tableInfo.getSelectedList();
                if (keylist.length == 0) {
                    content += '<div style="max-width:500px"><p><i>There are currently no {names} selected in the session. You can manipulate a subset by first creating a selection set (e.g. click on the box to the left of a {name} in a table)</i></p></div>'.DQXformat({name: that.tableInfo.tableNameSingle, names: that.tableInfo.tableNamePlural});
                }
                else {
                    content += '<div style="max-width:500px"><p><i>There are currently {count} {names} selected</i></p></div>'.DQXformat({count: keylist.length, names: that.tableInfo.tableNamePlural});
                    var choices = [];
                    choices.push( { content:'Replace<br>by selection', bitmap:'Bitmaps/venn2.png', bitmapHeight:15, handler:function() {
                        that.storeSelection(id, 'replace');
                    }
                    });

                    choices.push( { content:'Add<br>selection', bitmap:'Bitmaps/venn3.png', bitmapHeight:15, handler:function() {
                        that.storeSelection(id, 'add');
                    }
                    });

                    choices.push( { content:'Remove<br>selection', bitmap:'Bitmaps/venn4.png', bitmapHeight:15, handler:function() {
                        that.storeSelection(id, 'remove');
                    }
                    });
                    $.each(choices, function(idx, button) {
                        var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: button.content, bitmap:button.bitmap, bitmapHeight:button.bitmapHeight, width:140, height:50 }).setOnChanged(function() {
                            button.handler();
                            Popup.closeIfNeeded(popupid);
                        });
                        content += bt.renderHtml();
                    })
                }

                var popupid = Popup.create('Edit subset "'+that.tableInfo.storedSubsets[mapIdx].name+'"', content);
            };


            that.clearSubset =function (subsetid) {

                var isnumericalkey = !!(MetaData.findProperty(that.tableInfo.id, that.tableInfo.primkey).isFloat);

                DQX.setProcessing();
                DQX.serverDataStoreLong(MetaData.serverUrl,'',function(id) {
                    DQX.stopProcessing();
                    ServerIO.customAsyncRequest(MetaData.serverUrl,PnServerModule,'subset_store',
                        {
                            database: MetaData.database,
                            workspaceid:MetaData.workspaceid,
                            tableid: that.tableInfo.id,
                            keyid: that.tableInfo.primkey,
                            subsetid: subsetid,
                            dataid: id,
                            method: 'replace',
                            isnumericalkey: isnumericalkey?1:0
                        },
                        function(resp) {
                        }
                    );
                });
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

                var isnumericalkey = !!(MetaData.findProperty(that.tableInfo.id, that.tableInfo.primkey).isFloat);

                DQX.setProcessing();
                DQX.serverDataStoreLong(MetaData.serverUrl,datastring,function(id) {
                    DQX.stopProcessing();
                    ServerIO.customAsyncRequest(MetaData.serverUrl,PnServerModule,'subset_store',
                        {
                            database: MetaData.database,
                            workspaceid:MetaData.workspaceid,
                            tableid: that.tableInfo.id,
                            keyid: that.tableInfo.primkey,
                            subsetid: subsetid,
                            dataid: id,
                            method: method,
                            isnumericalkey: isnumericalkey?1:0
                        },
                        function(resp) {
                            DQX.customRequest(MetaData.serverUrl,PnServerModule,'subset_fetchmembercount',
                                {
                                    database: MetaData.database,
                                    workspaceid: MetaData.workspaceid,
                                    tableid: that.tableInfo.id,
                                    subsetid: subsetid
                                }, function(resp) {
                                    $.each(that.tableInfo.storedSubsets, function(idx, subset) {
                                        if (subset.id == subsetid)
                                            subset.membercount = resp.membercount;
                                    });
                                    that.loadList();
                                });
                        }
                    );
                });
            }


            that.create();

            return that;
        }



        return ManageStoredSubsets;
    });


