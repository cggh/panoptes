// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map", "DQX/SVG",
        "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
        "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils"
    ],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map, SVG,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
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
                    that.frameNotesButtons = Framework.FrameFinal('', 0.7).setFixedSize(Framework.dimY, 45).setAllowScrollBars(false, false);
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
                if (!that.tableInfo.settings.DisableSubsets) {
                    that.panelSubsets = Framework.Form(that.frameSubsets).setPadding(7);
                    that.setContent(initialItemData);
                }

                if (!that.tableInfo.settings.DisableNotes) {
                    //that.panelNotes = Framework.Form(that.frameNotes).setPadding(7);
                    that.frameNotes.setContentHtml('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sed tempor nisi. Nulla cursus nibh ipsum, nec lacinia urna iaculis ut. Nam eleifend purus metus. Etiam ante neque, porttitor eget ullamcorper vel, tincidunt ut eros. Cras tempus eros vel condimentum congue. Pellentesque id gravida sapien. Cras ultrices sed quam in vehicula. Praesent nec quam aliquam, lobortis dolor nec, ullamcorper elit. Praesent lacus nulla, dignissim non egestas nec, tincidunt vitae nisl. Donec sed mauris rutrum, bibendum sapien nec, ornare nisi. Duis nec ligula nisi. Cras pellentesque, sem id porttitor varius, metus erat cursus urna, vel ultrices leo quam et massa. Curabitur ut rhoncus sem. Nullam tincidunt nulla non mauris vulputate tristique. Vestibulum faucibus tellus vitae sem eleifend, vitae condimentum arcu mattis. Praesent ultricies eros eu posuere porttitor. Quisque sed rutrum dui. Curabitur cursus sapien vulputate massa volutpat, eget condimentum tellus bibendum. ');

                    that.panelNotesButtons = Framework.Form(that.frameNotesButtons);
                    var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon: 'fa-comment', content: 'Add note', width:160, height:30 }).setOnChanged(function() {
                        Popup.closeIfNeeded(popupid);
                        Start_Part1();
                    });
                    that.panelNotesButtons.addControl(bt);

                }

            };

            that.setContent = function(itemData) {
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

            that.update = function(newItemData) {
                if (!that.tableInfo.settings.DisableSubsets) {
                    that.panelSubsets.clear();
                    that.setContent(newItemData);
                    that.panelSubsets.render();
                }
            }


            that.onClose = function() {
            }

            return that;
        }

        return DefaultView;
    });



