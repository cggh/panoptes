define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils",
    "Plots/ItemScatterPlot", "Plots/BarGraph", "Plots/Histogram", "Plots/Histogram2D", "Plots/GeoTemporal/GeoTemporal"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils,
              ItemScatterPlot, BarGraph, Histogram, Histogram2D, GeoTemporal
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

            var buttonsPlots = [];

            var plots = [];

            if (tableInfo.hasGeoCoord) {
                plots.push({
                    title: 'Geographic map',
                    plotter: GeoTemporal,
                    settings: { zoomFit: true }
                })
            }

            plots.push({
                title: 'Histogram',
                plotter: Histogram,
                settings: { }
            });

            plots.push({
                title: 'Bar graph',
                plotter: BarGraph,
                settings: { }
            });

            plots.push({
                title: '2D Histogram',
                plotter: Histogram2D,
                settings: { }
            });

            plots.push({
                title: 'Scatter plot',
                plotter: ItemScatterPlot,
                settings: { }
            });

            content += '<div style="max-width: 500px">';
            $.each(plots, function(idx, plot) {
                var button = Controls.Button(null, { content: plot.title, buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: 'Bitmaps/circle_red_small.png' });
                button.setOnChanged(function() {
                    plot.plotter.Create(tableInfo.id, plot.settings, info.query);
                    Popup.closeIfNeeded(popupID);
                });
                content += button.renderHtml();
            });
            content += '</div>';

            var popupID = Popup.create(tableInfo.tableCapNamePlural + ' plots', content);


        }

        return DataItemPlotPopup;
    });



