define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map", "DQX/SVG",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map, SVG,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils
        ) {

        var PieChartMap = {};

        PieChartMap.create = function(visualisationSettings, itemData) {
            var that = {};

            that.createFrames = function() {
                that.frameMap = Framework.FrameFinal('', 1).setInitialiseFunction(that.initialise);
                return that.frameMap;
            };

            that.initialise = function() {
                that.theMap = Map.GMap(that.frameMap);


                setTimeout(function() {
                    var initialMapCenter = Map.Coord(0,0);
                    var initialMapZoom = 2;
                    if (visualisationSettings.MapCenter)
                        initialMapCenter = Map.Coord(visualisationSettings.MapCenter.Longitude, visualisationSettings.MapCenter.Lattitude);
                    if (visualisationSettings.MapZoom)
                        initialMapZoom = visualisationSettings.MapZoom;
                    that.theMap.setCenter(initialMapCenter, initialMapZoom)
                }, 50);

                if (visualisationSettings.LocationDataTable) {
                    that.locationTable = MetaData.mapTableCatalog[visualisationSettings.LocationDataTable];
                    if (!that.locationTable)
                        DQX.reportError('Unable to find pie chart locations table: '+visualisationSettings.LocationDataTable);
                    if (!that.locationTable.hasGeoCoord)
                        DQX.reportError('Locations table does not have coordinates: '+visualisationSettings.LocationDataTable);
                    that.locationTable.loadFullDataItemInfo(that._buildPieChartsFromLocationTable);
                };

            };

            that._buildPieChartsFromLocationTable = function(locationData) {

                if (!visualisationSettings.pieCharts) {
                    //Initialise pie chart data
                    visualisationSettings.pieCharts = [];
                    $.each(locationData, function(idx, locInfo) {
                        var name = locInfo[that.locationTable.primkey];
                        if (visualisationSettings.LocationNameProperty)
                            name = locInfo[visualisationSettings.LocationNameProperty];
                        var sizeFac = 1;
                        if (visualisationSettings.LocationSizeProperty)
                            sizeFac = 10*Math.sqrt(locInfo[visualisationSettings.LocationSizeProperty]);
                        visualisationSettings.pieCharts.push({
                            name: name,
                            locid: locInfo[that.locationTable.primkey],
                            longit: locInfo[that.locationTable.propIdGeoCoordLongit],
                            lattit: locInfo[that.locationTable.propIdGeoCoordLattit],
                            sizeFac: sizeFac
                        });
                    });

                    //Normalise size factors
                    var pieChartSize = 500;
                    if (visualisationSettings.PieChartSize)
                        pieChartSize = visualisationSettings.PieChartSize;
                    var maxSizeFac = 1.0e-9;
                    $.each(visualisationSettings.pieCharts, function(idx, pieChart) {
                        maxSizeFac= Math.max(maxSizeFac, pieChart.sizeFac);
                    });
                    $.each(visualisationSettings.pieCharts, function(idx, pieChart) {
                        pieChart.sizeFac *= (pieChartSize/maxSizeFac);
                    });

                    if (visualisationSettings.PositionOffsetFraction) {
                        var layouter = Map.MapItemLayouter(that.theMap, '', visualisationSettings.PositionOffsetFraction);
                        $.each(visualisationSettings.pieCharts, function(idx, pieChart) {
                            layouter.addItem(pieChart.longit, pieChart.lattit, pieChart.sizeFac);
                        });
                        layouter.calculatePositions();
                        $.each(visualisationSettings.pieCharts, function(idx, pieChart) {
                            pieChart.longit0 = pieChart.longit;
                            pieChart.lattit0 = pieChart.lattit;
                            pieChart.longit = layouter.items[idx].longit2;
                            pieChart.lattit = layouter.items[idx].lattit2;
                        });
                    }

                }




                $.each(visualisationSettings.pieCharts, function(idx, pieChartInfo) {

                    var chart = SVG.PieChart();

                    if (visualisationSettings.ComponentColumns) {
                        // Data are taken from columns in the datatable
                        var totFrac = 0;
                        $.each(visualisationSettings.ComponentColumns, function(idx, componentInfo) {
                            var propid = componentInfo.Pattern.DQXformat({locid: pieChartInfo.locid});
                            if (!(propid in itemData.fields))
                                DQX.reportError('Missing map pie chart column: '+propid);
                            var fracStr = itemData.fields[propid];
                            if (fracStr) {
                                var frac = parseFloat(fracStr);
                                chart.addPart(
                                    frac,
                                    componentInfo.Color,
                                    propid,
                                    pieChartInfo.name + '\n' + componentInfo.Name+': '+fracStr
                                );
                                totFrac += frac;
                            }
                        });
                        if (totFrac<0.99999)
                            var residualName = 'Other';
                            if (visualisationSettings.ResidualFractionName)
                                residualName = visualisationSettings.ResidualFractionName;
                            chart.addPart(
                                1-totFrac,
                                DQX.Color(0.75,0.75,0.75),
                                pieChartInfo.locid + '_rem_',
                                pieChartInfo.name + '\n' +residualName +': ' + (1.0-totFrac).toFixed(3)
                            );
                    }

                    var pie = Map.Overlay.PieChart(
                        that.theMap,
                        '1',
                        Map.Coord(pieChartInfo.longit, pieChartInfo.lattit),
                        pieChartInfo.sizeFac,
                        chart);
                    if (visualisationSettings.PositionOffsetFraction)
                        pie.setOrigCoord(Map.Coord(pieChartInfo.longit0, pieChartInfo.lattit0));
                    pie.onClick = function(chart, pieNr) {
                        if (that.locationTable) {
                            Msg.send({ type: 'ItemPopup' }, {
                                tableid: that.locationTable.id,
                                itemid: pieChartInfo.locid
                            } );
                        }
                    };
                });
            }

            that.createPanels = function() {
            };

            return that;
        }

        return PieChartMap;
    });



