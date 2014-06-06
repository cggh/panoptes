// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
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

        var PropertyGroup = {};

        PropertyGroup.create = function(viewSettings, tableInfo, itemData) {
            var that = {};

            that.createFrames = function() {
                that.frameFields = Framework.FrameFinal('', 1).setAllowScrollBars(true,true);
                return that.frameFields;
            };

            that.createPanels = function() {

                var content = '<div style="padding:8px">';
                content += "<table>";
                var groupInfo = tableInfo.propertyGroupMap[viewSettings.GroupId];
                if (groupInfo) {
                    $.each(groupInfo.properties, function(idx, propInfo) {
                    content += '<tr>';
                    content += '<td style="padding-bottom:3px;padding-top:3px;white-space:nowrap" title="{hint}"><b>{name}</b></td>'.DQXformat({
                        hint: (propInfo.settings.Description)||'',
                        name: propInfo.name
                    });
                    var fieldContent = itemData.fields[propInfo.propid];
                    content += '<td style="padding-left:5px;word-wrap:break-word;">' + propInfo.toDisplayString(fieldContent) + "</td>";
                    content += "</tr>";
                    });
                }
                content += "</table>";
                content += "</div>";

                that.frameFields.setContentHtml(content);
            };


            that.onClose = function() {
            }

            return that;
        }

        return PropertyGroup;
    });



