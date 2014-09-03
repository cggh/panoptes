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
                that.frameSubsets = Framework.FrameFinal('', 0.7)
                    .setDisplayTitle('Subsets').setMargins(10);
                parent.addMemberFrame(that.frameSubsets);
                return that.frameSubsets;
            };

            that.createPanels = function() {
                if (!that.tableInfo.settings.DisableSubsets) {
                    that.panelSubsets = Framework.Form(that.frameSubsets);
                    that.setContent(initialItemData);
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
                        that.panelSubsets.addControl(Controls.Static('There are currently no {name} subsets defined'.DQXformat({name: that.tableInfo.tableNameSingle})));
                    }
                    else {
                        that.panelSubsets.addControl(Controls.CompoundVert([
                            Controls.Static('This {name} is member of the following subsets:<p>'.DQXformat({name: that.tableInfo.tableNameSingle})),
                            Controls.CompoundVert(subsetCheckList)
                        ]));
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



