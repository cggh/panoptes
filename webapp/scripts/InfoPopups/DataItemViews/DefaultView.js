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

        DefaultView.create = function(viewSettings, itemData) {
            var that = {};
            var tableInfo = MetaData.getTableInfo(itemData.tableid);

            that.createFrames = function(parent) {
                that.frameFields = Framework.FrameFinal('', 1).setAllowScrollBars(true,true)
                .setDisplayTitle(viewSettings.Name);
                parent.addMemberFrame(that.frameFields);
                return that.frameFields;
            };



            that.createPanels = function() {

                var content = '';
                var content = '<div style="padding:8px">';
                function addLevelToContent(levelInfo) {
                    var tableInfo = MetaData.mapTableCatalog[levelInfo.tableid];
                    content += "<table>";
                    $.each(MetaData.customProperties,function(idx, propInfo) {
                        if (propInfo.tableid == tableInfo.id) {
                            var fieldContent = levelInfo.fields[propInfo.propid];
                            content += '<tr>';
                            content += '<td style="padding-bottom:3px;padding-top:3px;white-space:nowrap" title="{hint}"><b>{name}</b></td>'.DQXformat({
                                hint: (propInfo.settings.Description)||'',
                                name: propInfo.name
                            });
                            content += '<td style="padding-left:5px;word-wrap:break-word;">' + propInfo.toDisplayString(fieldContent) + "</td>";
                            content += "</tr>";
                        }
                    });
                    content += "</table>";
                    $.each(levelInfo.parents, function(idx, parentInfo) {
                        var parentTableInfo = MetaData.mapTableCatalog[parentInfo.tableid];
                        content += '<div style="padding-left:30px">';
                        content += '<div style="color:rgb(128,0,0);background-color: rgb(240,230,220);padding:3px;padding-left:8px"><i>';
                        content += parentInfo.relation.forwardname+' '+parentTableInfo.tableNameSingle;
                        content += '</i>&nbsp;&nbsp;';
                        var lnk = Controls.Hyperlink(null,{ content: '<span class="fa fa-external-link-square" style="font-size: 120%"></span> Open'});
                        lnk.setOnChanged(function() {
                            Msg.send({type: 'ItemPopup'}, {tableid: parentInfo.tableid, itemid: parentInfo.fields[parentTableInfo.primkey]});
                        });
                        content += lnk.renderHtml();
                        content += '</div>';
                        addLevelToContent(parentInfo);
                        content += '</div>';
                    });
                }

                addLevelToContent(itemData);
                that.frameFields.setContentHtml(content);
                content += '</div>';

            };


            that.onClose = function() {
            }

            return that;
        }

        return DefaultView;
    });



