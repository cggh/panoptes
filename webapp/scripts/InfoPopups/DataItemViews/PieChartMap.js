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

        var PieChartMap = {};

        PieChartMap.create = function(viewSettings, initialItemData) {
            var that = {};
            var tableInfo = MetaData.getTableInfo(initialItemData.tableid);
            that.itemData = initialItemData;
            that.pies = [];
            that.initialised = false;


            that.createFrames = function(parent) {
                that.frameMap = Framework.FrameFinal('', 1).setAllowScrollBars(false,false).setInitialiseFunction(that.initialise)
                    .setDisplayTitle(viewSettings.Name);
                parent.addMemberFrame(that.frameMap);
                return that.frameMap;
            };

            that.initialise = function() {
                that.theMap = Map.GMap(that.frameMap);


                setTimeout(function() {
                    var initialMapCenter = Map.Coord(0,0);
                    var initialMapZoom = 2;
                    if (viewSettings.MapCenter)
                        initialMapCenter = Map.Coord(viewSettings.MapCenter.Longitude, viewSettings.MapCenter.Lattitude);
                    if (viewSettings.MapZoom)
                        initialMapZoom = viewSettings.MapZoom;
                    that.theMap.setCenter(initialMapCenter, initialMapZoom)
                }, 50);

                if (viewSettings.LocationDataTable) {
                    that.locationTable = MetaData.mapTableCatalog[viewSettings.LocationDataTable];
                    if (!that.locationTable)
                        DQX.reportError('Unable to find pie chart locations table: '+viewSettings.LocationDataTable);
                    if (!that.locationTable.hasGeoCoord)
                        DQX.reportError('Locations table does not have coordinates: '+viewSettings.LocationDataTable);
                    that.locationTable.loadFullDataItemInfo(that._buildPieChartsFromLocationTable);
                };
                that.initialised = true;

            };

            that._buildPieChartsFromLocationTable = function(locationData) {

                if (!viewSettings.pieCharts) {
                    //Initialise pie chart data
                    viewSettings.pieCharts = [];
                    $.each(locationData, function (idx, locInfo) {
                        var name = locInfo[that.locationTable.primkey];
                        if (viewSettings.LocationNameProperty)
                            name = locInfo[viewSettings.LocationNameProperty];
                        var sizeFac = 1;
                        if (viewSettings.LocationSizeProperty)
                            sizeFac = 10 * Math.sqrt(locInfo[viewSettings.LocationSizeProperty]);
                        viewSettings.pieCharts.push({
                            name: name,
                            locid: locInfo[that.locationTable.primkey],
                            longit: locInfo[that.locationTable.propIdGeoCoordLongit],
                            lattit: locInfo[that.locationTable.propIdGeoCoordLattit],
                            sizeFac: sizeFac
                        });
                    });

                    //Normalise size factors
                    var pieChartSize = 500;
                    if (viewSettings.PieChartSize)
                        pieChartSize = viewSettings.PieChartSize;
                    var maxSizeFac = 1.0e-9;
                    $.each(viewSettings.pieCharts, function (idx, pieChart) {
                        maxSizeFac = Math.max(maxSizeFac, pieChart.sizeFac);
                    });
                    $.each(viewSettings.pieCharts, function (idx, pieChart) {
                        pieChart.sizeFac *= (pieChartSize / maxSizeFac);
                    });

                    if (viewSettings.PositionOffsetFraction) {
                        var layouter = Map.MapItemLayouter(that.theMap, '', viewSettings.PositionOffsetFraction);
                        $.each(viewSettings.pieCharts, function (idx, pieChart) {
                            layouter.addItem(pieChart.longit, pieChart.lattit, pieChart.sizeFac);
                        });
                        layouter.calculatePositions();
                        $.each(viewSettings.pieCharts, function (idx, pieChart) {
                            pieChart.longit0 = pieChart.longit;
                            pieChart.lattit0 = pieChart.lattit;
                            pieChart.longit = layouter.items[idx].longit2;
                            pieChart.lattit = layouter.items[idx].lattit2;
                        });
                    }
                }
                that._drawPies(initialItemData);
            }


            that._drawPies = function(itemData) {
                $.each(that.pies, function(idx, pie) {
                    //FIXME - Poss memeory leak due to DQX.ObjectMapper in overlay._base
                    that.theMap.removeOverlay(pie.myID);
                });
                that.pies = [];

                $.each(viewSettings.pieCharts, function(idx, pieChartInfo) {

                    var chart = SVG.PieChart();

                    if (viewSettings.ComponentColumns) {
                        // Data are taken from columns in the datatable
                        var totFrac = 0;
                        $.each(viewSettings.ComponentColumns, function(idx, componentInfo) {
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
                            if (viewSettings.ResidualFractionName)
                                residualName = viewSettings.ResidualFractionName;
                            chart.addPart(
                                1-totFrac,
                                DQX.Color(0.75,0.75,0.75),
                                pieChartInfo.locid + '_rem_',
                                pieChartInfo.name + '\n' +residualName +': ' + (1.0-totFrac).toFixed(3)
                            );
                    }

                    var pie = Map.Overlay.PieChart(
                        that.theMap,
                        DQX.getNextUniqueID(),
                        Map.Coord(pieChartInfo.longit, pieChartInfo.lattit),
                        pieChartInfo.sizeFac,
                        chart);
                    if (viewSettings.PositionOffsetFraction)
                        pie.setOrigCoord(Map.Coord(pieChartInfo.longit0, pieChartInfo.lattit0));
                    pie.onClick = function(chart, pieNr) {
                        if (that.locationTable) {
                            Msg.send({ type: 'ItemPopup' }, {
                                tableid: that.locationTable.id,
                                itemid: pieChartInfo.locid
                            } );
                        }
                    };
                    that.pies.push(pie);
                });
            };

            that.update = function(newItemData) {
                if (viewSettings.pieCharts && that.initialised)
                    that._drawPies(newItemData);
            }

            that.createPanels = function() {
            };


            that.onClose = function() {
                if (that.theMap)
                    that.theMap.tearDown();
            }

            return that;
        }

        return PieChartMap;
    });



