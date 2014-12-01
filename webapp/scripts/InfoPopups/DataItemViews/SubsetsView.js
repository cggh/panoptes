// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map", "DQX/SVG",
        "DQX/Wizard", "DQX/Popup", "DQX/MessageBox", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
        "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils"
    ],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map, SVG,
              Wizard, Popup, MessageBox, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils
        ) {

        var DefaultView = {};

        DefaultView.create = function(initialItemData) {
            var that = {};
            that.tableInfo = MetaData.getTableInfo(initialItemData.tableid);

            that.createFrames = function(parent) {
                that.frameGroup = Framework.FrameGroupVert('', 0.7)
                    .setDisplayTitle('Notes').setMargins(0);
                parent.addMemberFrame(that.frameGroup);
                if (!that.tableInfo.settings.DisableNotes) {
                    that.frameNotesGroup = Framework.FrameGroupVert('', 0.7).setMargins(0).setSeparatorSize(0);
                    that.frameGroup.addMemberFrame(that.frameNotesGroup);
                    that.frameNotesButtons = Framework.FrameFinal('', 0.7).setFixedSize(Framework.dimY, 55).setAllowScrollBars(false, false);
                    that.frameNotesGroup.addMemberFrame(that.frameNotesButtons);
                    that.frameNotes = Framework.FrameFinal('', 0.7)
                        .setMargins(0);
                    that.frameNotesGroup.addMemberFrame(that.frameNotes);
                }
                if (!that.tableInfo.settings.DisableSubsets) {
                    that.frameSubsets = Framework.FrameFinal('', 0.7)
                        .setMargins(0).setFixedSize(Framework.dimY, 50);
                    that.frameGroup.addMemberFrame(that.frameSubsets);
                }
                return that.frameGroup;
            };

            that.createPanels = function() {
                that.itemid = initialItemData.fields[that.tableInfo.primkey];

                if (!that.tableInfo.settings.DisableSubsets) {
                    that.panelSubsets = Framework.Form(that.frameSubsets).setPadding(7);
                    that.setContentSubsets(initialItemData);
                }

                if (!that.tableInfo.settings.DisableNotes) {
                    that.setContentNotes();
                }


                if (!that.tableInfo.settings.DisableNotes) {
                    //that.panelNotes = Framework.Form(that.frameNotes).setPadding(7);

                    that.panelNotesButtons = Framework.Form(that.frameNotesButtons);
                    that.panelNotesButtons.setPadding(7);
                    var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon: 'fa-comment', content: 'Add note', width:160, height:30 }).setOnChanged(function() {
                        that.addNote();
                    });
                    that.panelNotesButtons.addControl(bt);

                }

            };

            that.setContentSubsets = function(itemData) {
                if (!that.tableInfo.settings.DisableSubsets) {
                    var subsetCheckList = [];
                    var subsetCheckMap = {};
                    $.each(that.tableInfo.storedSubsets, function (idx, subset) {
                        var chk = Controls.Check(null, {label: subset.name});
                        subsetCheckList.push(chk);
                        subsetCheckMap[subset.id] = chk;
                        chk.modifyEnabled(false);
                        chk.setOnChanged(function () {
                            DQX.customRequest(MetaData.serverUrl, PnServerModule, 'subset_setitemselection',
                                {
                                    database: MetaData.database,
                                    tableid: that.tableInfo.id,
                                    workspaceid: MetaData.workspaceid,
                                    itemid: itemData.fields[that.tableInfo.primkey],
                                    isnumericalkey: isnumericalkey ? 1 : 0,
                                    primkey: that.tableInfo.primkey,
                                    subsetid: subset.id,
                                    ismember: chk.getValue() ? 1 : 0
                                }
                                , function (resp) {
                                    subset.membercount += resp.diff;
                                });
                        });
                    });
                    if (subsetCheckList.length == 0) {
                        that.panelSubsets.addControl(Controls.Static('<span class="SupportingText">There are currently no {name} subsets defined</span>'.DQXformat({name: that.tableInfo.tableNameSingle})));
                    }
                    else {
                        var ctrls = [];
                        ctrls.push(Controls.Static('Member of the following subsets:<p>'));
                        $.each(subsetCheckList, function(idx, subset) {
                            ctrls.push(Controls.HorizontalSeparator(12));
                            ctrls.push(subset);
                        });
                        that.panelSubsets.addControl(Controls.CompoundHor(ctrls));
                    }

                    var isnumericalkey = !!(MetaData.findProperty(that.tableInfo.id, that.tableInfo.primkey).isFloat);
                    DQX.customRequest(MetaData.serverUrl, PnServerModule, 'subset_getitemselection',
                        {
                            database: MetaData.database,
                            tableid: that.tableInfo.id,
                            workspaceid: MetaData.workspaceid,
                            itemid: itemData.fields[that.tableInfo.primkey],
                            isnumericalkey: isnumericalkey ? 1 : 0,
                            primkey: that.tableInfo.primkey
                        }
                        , function (resp) {
                            $.each(subsetCheckList, function (idx, chk) {
                                chk.modifyEnabled(true);
                            })
                            $.each(resp.subsetmemberlist, function (idx, activesubset) {
                                if (subsetCheckMap[activesubset])
                                    subsetCheckMap[activesubset].modifyValue(true, true);
                            });
                        });
                }

            };

            that.setContentNotes = function() {
                if (that.tableInfo.settings.DisableNotes)
                    return;

                that.frameNotes.setContentHtml("<i>Downloading...</i>");
                DQX.customRequest(MetaData.serverUrl, PnServerModule, 'note_getitemlist',
                    {
                        database: MetaData.database,
                        workspaceid: MetaData.workspaceid,
                        tableid: that.tableInfo.id,
                        itemid: that.itemid
                    },
                    function (resp) {
                        var str = "";
                        that.canEditNotes = resp.canedit;
                        for (var notenr = 0; notenr<resp.notes_id.length; notenr++) {
                            str += '<div class="PnItemNote" id="{id}">'.DQXformat({id: 'note__'+resp.notes_id[notenr]});
                            str += '<div class="PnItemHeaderText">' + resp.notes_timestamp[notenr]+' ';
                            str += resp.notes_userid[notenr]+'</div>';
                            str += '<img class="PnItemNoteDelete" SRC="{bmp}"/>'.DQXformat({bmp:'Bitmaps/actionbuttons/delete.png'});
                            var notecontent =resp.notes_content[notenr];
                            notecontent = notecontent.replace(/(?:\r\n|\r|\n)/g, '<br />');
                            str += notecontent;
                            str += '</div>';
                        }
                        that.frameNotes.setContentHtml(str);

                        var contentdiv = $('#' + that.frameNotes.getClientDivID());

                        contentdiv.find('.PnItemNoteDelete').click(function(ev) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            var noteid = $(this).parent().attr('id').split('__')[1];
                            MessageBox.confirmationBox('Are you sure you want to delete this note?', function() {
                                DQX.setProcessing();
                                DQX.customRequest(MetaData.serverUrl, PnServerModule, 'note_del',
                                    {
                                        database: MetaData.database,
                                        workspaceid: MetaData.workspaceid,
                                        tableid: that.tableInfo.id,
                                        itemid: that.itemid,
                                        noteid: noteid
                                    },
                                    function (resp) {
                                        DQX.stopProcessing();
                                        if (resp.error) {
                                            MessageBox.errorBox('Unable to remove note', resp.error);
                                            return;
                                        }
                                        that.setContentNotes();
                                    });
                            });
                        });

                        contentdiv.stop().animate({
                            scrollTop: contentdiv[0].scrollHeight
                        }, 800);
                    });

            };


            that.update = function(newItemData) {
                that.itemid = newItemData.fields[that.tableInfo.primkey];

                if (!that.tableInfo.settings.DisableSubsets) {
                    that.panelSubsets.clear();
                    that.setContentSubsets(newItemData);
                    that.panelSubsets.render();
                }

                if (!that.tableInfo.settings.DisableNotes) {
                    that.setContentNotes();
                }
            }

            that.addNote_submit = function(content) {
                DQX.setProcessing();
                DQX.serverDataStoreLong(MetaData.serverUrl, content, function (id) {
                    DQX.customRequest(MetaData.serverUrl, PnServerModule, 'note_add',
                        {
                            database: MetaData.database,
                            workspaceid: MetaData.workspaceid,
                            tableid: that.tableInfo.id,
                            itemid: that.itemid,
                            noteid: id
                        },
                        function (resp) {
                            DQX.stopProcessing();
                            if (resp.error) {
                                MessageBox.errorBox('Error', resp.error);
                                return;
                            }
                            that.setContentNotes();
                        });
                });
            }

            that.addNote = function() {
                if (!that.canEditNotes) {
                    MessageBox.errorBox('Error', 'You do not have the right privilege to add notes');
                    return;
                }
                var str = '';
                var str = '';
                var edt = Controls.Textarea('', { size: 80, linecount: 12, value: ''}).setHasDefaultFocus();
                str += 'Text:<p>';
                str += edt.renderHtml();
                str += '<p>';

                var btAdd = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon:'fa-comment', width:130, height:45, content: 'Add note' }).setOnChanged(function () {
                    var content = edt.getValue();
                    that.addNote_submit(content);
                    Popup.closeIfNeeded(popupid);
                });
                str += btAdd.renderHtml();


                var popupid = Popup.create('Add note', str);
            }



            that.onClose = function() {
            }

            return that;
        }

        return DefaultView;
    });



