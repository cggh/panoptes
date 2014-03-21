define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils",
    "Plots/GenericPlot"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils,
              GenericPlot
        ) {

        var DataItemPlotPopup = {};

        DataItemPlotPopup.init = function() {
            Msg.listen('', {type:'CreateDataItemPlot'}, function(scope, info) {
                DataItemPlotPopup.create(info);
            });
        }

        DataItemPlotPopup.create = function(info) {
            var tableInfo = MetaData.mapTableCatalog[info.tableid];

            var content = "";

            content += '<table class="PlotTypeTable" style="max-width: 500px" cellspacing="0" cellpadding="0">';
//            content += '<div style="max-width: 500px">';
            $.each(GenericPlot.getCompatiblePlotTypes(tableInfo), function(idx, plottype) {
                var id = 'PlotTypeChoice_'+plottype.typeID;
                content += '<tr id="{id}">'.DQXformat({id:id});
                content += '<td class="DQXLarge"><div style="padding:10px">' + plottype.name + '</div></td>';
                content += '<td><div style="padding:10px">' + plottype.description.DQXformat({item: tableInfo.tableNameSingle, items: tableInfo.tableNamePlural}) + "</div></td>";
                content += "</tr>";
//
//                content += '<div style="clear: both;padding:15px">';
//                content += '<div class="DQXLarge" style="float:left;margin-right:10px;margin-bottom:7px">' + plottype.name + '</div>';
//                content += plottype.description.DQXformat({item: tableInfo.tableNameSingle, items: tableInfo.tableNamePlural});
//                content += '</div>';
            });
            content += '</div>';
            content += '</table>';


//            content += '<div style="max-width: 500px">';
//            $.each(GenericPlot.getCompatiblePlotTypes(tableInfo), function(idx, plottype) {
//                content += '<div style="clear: both;padding:15px">';
//                content += '<div class="DQXLarge" style="float:left;margin-right:10px;margin-bottom:7px">' + plottype.name + '</div>';
//                content += plottype.description.DQXformat({item: tableInfo.tableNameSingle, items: tableInfo.tableNamePlural});
//                content += '</div>';
//            });
//            content += '</div>';



//            content += '<div style="max-width: 500px">';
//            $.each(plots, function(idx, plot) {
//                var button = Controls.Button(null, { content: plot.title, buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
//                button.setOnChanged(function() {
//                    plot.plotter.Create(tableInfo.id, info.query);
//                    Popup.closeIfNeeded(popupID);
//                });
//                content += button.renderHtml();
//            });
//            content += '</div>';

            var popupID = Popup.create(tableInfo.tableCapNamePlural + ' plots', content);

            $.each(GenericPlot.getCompatiblePlotTypes(tableInfo), function(idx, plottype) {
                var id = 'PlotTypeChoice_'+plottype.typeID;
                $('#'+id).click(function() {
                    plottype.Create(tableInfo.id, info.query);
                    Popup.closeIfNeeded(popupID);
                });
            });


        }

        return DataItemPlotPopup;
    });



