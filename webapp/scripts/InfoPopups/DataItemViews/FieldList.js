define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map", "DQX/SVG",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map, SVG,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils
        ) {

        var FieldList = {};

        FieldList.create = function(viewSettings, tableInfo, itemData) {
            var that = {};

            that.createFrames = function() {
                that.frameFields = Framework.FrameFinal('', 1).setAllowScrollBars(true,true);
                return that.frameFields;
            };



            that.createPanels = function() {

                var parentFieldsMap = {};
                if (itemData.parents)
                    $.each(itemData.parents, function(idx, parentInfo) {
                        parentFieldsMap[parentInfo.tableid] = parentInfo.fields;
                    });

                var content = '<div style="padding:8px">';
                if (viewSettings.Introduction)
                    content += viewSettings.Introduction+'<p>';
                content += "<table>";
                var fieldContent = '';
                $.each(viewSettings.Fields, function(idx, propid) {
                    if (propid.indexOf('@')<0) {//property from this table
                        var propInfo = MetaData.findProperty(tableInfo.id, propid);
                        fieldContent = itemData.fields[propid];
                    }
                    else {//property from a parent table
                        var parenttableid = propid.split('@')[1];
                        propid = propid.split('@')[0];
                        var propInfo = MetaData.findProperty(parenttableid, propid);
                        if (!parentFieldsMap[parenttableid])
                            DQX.reportError('Missing parent item data for '+parenttableid);
                        fieldContent = parentFieldsMap[parenttableid][propid];
                    }
                    content += '<tr>';
                    content += '<td style="padding-bottom:3px;padding-top:3px;white-space:nowrap" title="{hint}"><b>{name}</b></td>'.DQXformat({
                        hint: (propInfo.settings.Description)||'',
                        name: propInfo.name
                    });
                    content += '<td style="padding-left:5px;word-wrap:break-word;">' + propInfo.toDisplayString(fieldContent) + "</td>";
                    content += "</tr>";
                });
                content += "</table>";
                content += "</div>";



                that.frameFields.setContentHtml(content);

            };


            that.onClose = function() {
            }

            return that;
        }

        return FieldList;
    });



