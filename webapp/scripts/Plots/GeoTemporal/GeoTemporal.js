define(["require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/Map", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "DQX/GMaps/PointSet",
    "MetaData",
    "Utils/QueryTool", "Utils/ButtonChoiceBox", "Plots/GenericPlot",
    "Plots/GeoTemporal/TimeLine"
],
    function (require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, Map, DataFetchers, EditQuery, PointSet,
              MetaData,
              QueryTool, ButtonChoiceBox, GenericPlot,
              TimeLine
        ) {

        var GeoTemporal = {};

        GeoTemporal.typeID = 'GeoTemporal';
        GeoTemporal.name = 'Geographic map';
        GeoTemporal.description= 'Takes a <b>geographic lattitude & longitude property pair</b>, and maps the {items} on a world map. Optionally, a date property can be used to add a time line.';
        GeoTemporal.isCompatible = function(tableInfo) {
            return tableInfo.hasGeoCoord;
        }



        GenericPlot.registerPlotType(GeoTemporal);








        GeoTemporal.Create = function(tableid, startQuery) {
            var that = GenericPlot.Create(tableid, GeoTemporal.typeID, {title:GeoTemporal.name }, startQuery);

            that.pointData = {};//first index: property id, second index: point nr
            that.maxrecordcount = that.tableInfo.settings.MaxCountQueryRecords || 200000;

            that.hasTimeLine = false;
            $.each(MetaData.customProperties, function(idx, propInfo) {
                if ( (propInfo.tableid == that.tableInfo.id) && (propInfo.isDate) )
                    that.hasTimeLine = true;
            });


            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid,{ type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid)
                    that.updateSelection();
            } );


            that.plotComponents = {};

            if (that.hasTimeLine) {
                that.plotComponents.timeLine = TimeLine.Create(that);
            }

            that.createFrames = function() {
                that.frameRoot.makeGroupHor();
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setAllowScrollBars(false,true).setMinSize(Framework.dimX,240);

                var frameRight = that.frameRoot.addMemberFrame(Framework.FrameGroupVert('', 0.7))
                    .setMargins(0).setSeparatorSize(0);

                that.frameWarning = frameRight.addMemberFrame(Framework.FrameFinal('', 0.01))
                    .setMargins(0).setAutoSize().setAllowScrollBars(false, false);

                var frameRight2 = frameRight.addMemberFrame(Framework.FrameGroupVert('', 0.99));

                if (that.hasTimeLine) {
                    that.plotComponents.timeLine.frame = frameRight2.addMemberFrame(Framework.FrameFinal('', 0.3))
                        .setAllowScrollBars(false,false);
                }

                that.frameGeoMap = frameRight2.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(false,false);
            };





            that.createControlsMap = function() {

                var cmdLassoSelection = Controls.Button(null, { content: 'Select points', buttonClass: 'PnButtonSmall'}).setOnChanged(function () {
                    var actions = [];

                    actions.push( { content:'Rectangular latt-long area', handler:function() {
                        that.theMap.startRectSelection(that.fetchRectSelection);
                    }
                    });

                    actions.push( { content:'Lasso tool', handler:function() {
                        that.theMap.startLassoSelection(that.fetchLassoSelection);
                    }
                    });

                    ButtonChoiceBox.create('Select points','', [actions]);
                });

                that.ctrl_PointShape = Controls.Combo(null,{ label:'Point shape:', states: [{id: 'rectangle', 'name':'Rectangle'}, {id: 'circle', 'name':'Circle'}, {id: 'fuzzy', 'name':'Fuzzy'}], value:'rectangle' }).setClassID('pointShape')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_PointSize = Controls.ValueSlider(null, {label: 'Point size', width: 170, minval:0.1, maxval:10, value:3, digits: 2}).setClassID('pointSize')
                    .setNotifyOnFinished()
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_Opacity = Controls.ValueSlider(null, {label: 'Point opacity', width: 170, minval:0, maxval:1, value:0.8, digits: 2}).setClassID('pointOpacity')
                    .setNotifyOnFinished()
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_AggrType = Controls.Combo(null,{ label:'Style:', states: [{id: 'piechart', 'name':'Pie chart'}, {id: 'cluster', 'name':'Cluster'}], value:'piechart' }).setClassID('aggrStyle')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_AggrSize = Controls.ValueSlider(null, {label: 'Size', width: 150, minval:10, maxval:100, value:20, digits: 0}).setClassID('aggrSize')
                    .setNotifyOnFinished()
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                var grp = Controls.CompoundVert([
//                    cmdZoomToFit,
                    cmdLassoSelection,
                    Controls.VerticalSeparator(10),
                    that.ctrl_PointShape,
                    that.ctrl_PointSize,
                    that.ctrl_Opacity,
                    Controls.CompoundVert([that.ctrl_AggrType, that.ctrl_AggrSize]).setLegend('Aggregated points')
                    ]);
                grp.setLegend('<h4>Map</h4>');
                return grp;
            }

            that.createPanels = function() {

                this.panelWarning = Framework.Form(this.frameWarning);
                this.warningContent = Controls.Html('', '', '____');
                this.panelWarning.addControl(this.warningContent);
                this.panelWarning.render();

                that.panelButtons = Framework.Form(that.frameButtons).setPadding(5);

                var ctrl_Query = that.theQuery.createControl();

                that.ctrl_PointCount = Controls.Html(null, '');

                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Text') || (prop.datatype=='Boolean') || (prop.datatype=='Value') || (prop.datatype=='Date') ) )
                        propList.push({ id:prop.propid, name:prop.name });
                });
                that.ctrlColorProperty = Controls.Combo(null,{ label:'Color:', states: propList }).setClassID('pointcolor');
                that.ctrlColorProperty.setOnChanged(function() {
                    that.fetchData();
                });

                that.colorLegend = Controls.Html(null,'');

                var controlsList = [ctrl_Query,
                    Controls.VerticalSeparator(5),
                    that.ctrl_PointCount,
                    Controls.VerticalSeparator(5),
                    Controls.CompoundVert([that.ctrlColorProperty, that.colorLegend]).setLegend('<h4>Overlay</h4>')];

                $.each(that.plotComponents, function(key, plotComp) {
                    controlsList.push(Controls.VerticalSeparator(2));
                    controlsList.push(plotComp.createControls());
                });

                var groupMapControls = that.createControlsMap();

                controlsList.push(Controls.VerticalSeparator(2));
                controlsList.push(groupMapControls);





                var controlsGroup = Controls.CompoundVert(controlsList);
                that.addPlotSettingsControl('controls',controlsGroup);
                that.panelButtons.addControl(controlsGroup);


                $.each(that.plotComponents, function(key, plotComp) {
                    plotComp.createView();
                });

                that.theMap = Map.GMap(this.frameGeoMap);




                // Create points overlay on map
                that.pointSet = PointSet.Create(that.theMap, {});
                that.pointSet.setPointClickCallBack(
                    function(itemid) { // single point click handler
                        Msg.send({ type: 'ItemPopup' }, { tableid: that.tableInfo.id, itemid: itemid } );
                    },
                    function(pieChartInfo) { // pie chart click handler
                        var qry = that.theQuery.get();
                        var range = 0.0001;
                        qry = SQL.WhereClause.createRangeRestriction(qry, that.tableInfo.propIdGeoCoordLongit, pieChartInfo.longit-range, pieChartInfo.longit+range);
                        qry = SQL.WhereClause.createRangeRestriction(qry, that.tableInfo.propIdGeoCoordLattit, pieChartInfo.lattit-range, pieChartInfo.lattit+range);
                        Msg.send({type: 'DataItemTablePopup'}, {
                            tableid: that.tableInfo.id,
                            query: qry,
                            title: that.tableInfo.tableCapNamePlural + ' at ' + pieChartInfo.longit + ', ' + pieChartInfo.lattit
                        });
                    }
                );

                that.startZoomFit = true;
                that.reloadAll();
            };

            that.setWarning = function(warning) {
                if (warning)
                    that.warningContent.modifyValue('<div style="color:red;padding:2px;background-color:yellow;border-bottom: 1px solid black">' + warning + '</div>');
                else
                    that.warningContent.modifyValue('');
                that.panelWarning.render();
            };



            that.storeCustomSettings = function() {
                var sett = {};
                sett.mapSettings = that.theMap.storeSettings();

                $.each(that.plotComponents, function(key, plotComp) {
                    sett[key] = plotComp.storeSettings();
                })

                return sett;
            };

            that.recallCustomSettings = function(sett) {
                that.theMap.recallSettings(sett.mapSettings);
                $.each(that.plotComponents, function(key, plotComp) {
                    plotComp.recallSettings(sett[key]);
                })
            };

            that.reloadAll = function() {
                that.fetchData();
            };

            that.fetchData = function() {
                var fetcher = DataFetchers.RecordsetFetcher(
                    MetaData.serverUrl,
                    MetaData.database,
                    that.tableInfo.getQueryTableName(that.theQuery.isSubSampling())
                );
                fetcher.setMaxResultCount(that.maxrecordcount);
                that.ctrl_PointCount.modifyValue('--- data points');

                that.pointSet.clearPoints();

                $.each(that.plotComponents, function(idx, comp) {
                    comp.clearPoints();
                })

                that.points = null;
                that.colorLegend.modifyValue('');

                var sortField = that.tableInfo.primkey;

                $.each(that.plotComponents, function(key, plotComp) {
                    plotComp.addFetchProperties(fetcher);
                });
                //sortField = that.datePropId;

                if (!that.pointData[that.tableInfo.primkey])
                    fetcher.addColumn(that.tableInfo.primkey, 'ST');
                if (!that.pointData[that.tableInfo.propIdGeoCoordLongit])
                    fetcher.addColumn(that.tableInfo.propIdGeoCoordLongit, 'F4');
                if (!that.pointData[that.tableInfo.propIdGeoCoordLattit])
                    fetcher.addColumn(that.tableInfo.propIdGeoCoordLattit, 'F4');
                that.catPropId = null;
                that.numPropId = null;
                if (that.ctrlColorProperty.getValue()) {
                    var propInfo = MetaData.findProperty(that.tableInfo.id, that.ctrlColorProperty.getValue());
                    if ( (propInfo.datatype=='Text') || (propInfo.datatype=='Boolean') ) {
                        that.catPropId = that.ctrlColorProperty.getValue();
                        if (!that.pointData[that.catPropId])
                            fetcher.addColumn(that.catPropId, 'ST');
                    }
                    if (propInfo.isFloat) {
                        that.numPropId = that.ctrlColorProperty.getValue();
                        if (!that.pointData[that.numPropId])
                            fetcher.addColumn(that.numPropId, 'ST');
                    }
                }

                if (fetcher.getColumnIDs().length <= 0) {
                    that.setPoints();
                    return;
                }

                var requestID = DQX.getNextUniqueID();
                that.requestID = requestID;
                var selectionInfo = that.tableInfo.currentSelection;
                DQX.setProcessing();
                fetcher.getData(that.theQuery.getForFetching(), sortField,
                    function (data) { //success
                        DQX.stopProcessing();
                        if (that.requestID == requestID) {
                            var resultpointcount = 0;
                            $.each(data, function(id, values) {
                                that.pointData[id] = values;
                                resultpointcount = values.length;
                            });
                            that.ctrl_PointCount.modifyValue(resultpointcount + ' data points');
                            that.setPoints();
                            if (that.startZoomFit) {
                                that.pointSet.zoomFit(100);
                                that.startZoomFit = false;
                            }
                            if (resultpointcount >= that.maxrecordcount)
                                that.setWarning('Number of points truncated to ' + that.maxrecordcount);
                            else
                                that.setWarning('');
                        }
                    },
                    function (data) { //error
                        DQX.stopProcessing();
                        that.fetchCount -= 1;
                    }

                );
            }

            that.setPoints = function() {
                var keys = that.pointData[that.tableInfo.primkey];
                var longitudes = that.pointData[that.tableInfo.propIdGeoCoordLongit];
                var lattitudes = that.pointData[that.tableInfo.propIdGeoCoordLattit];
                var selectionInfo = that.tableInfo.currentSelection;

                that.mappedColors = DQX.standardColors;

                if (that.catPropId) {
                    var catPropInfo = MetaData.findProperty(that.tableInfo.id, that.catPropId);
                    var catProps = that.pointData[that.catPropId];
//                    var colormapper = MetaData.findProperty(that.tableInfo.id, that.catPropId).category2Color;

                    for (var i=0; i<catProps.length; i++)
                        catProps[i] = catPropInfo.toDisplayString(catProps[i]);


                    var maprs = catPropInfo.mapColors(catProps);
                    var catData = maprs.indices;
                    that.mappedColors = maprs.colors;
                    var legendStr = '';
                    $.each(maprs.legend,function(idx, legendItem) {
                        legendStr+='<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}<br>'.DQXformat({cl:legendItem.color.toString(), name:legendItem.state});
                    });
                    that.colorLegend.modifyValue(legendStr);
                }

                if (that.numPropId) {
                    var numPropInfo = MetaData.findProperty(that.tableInfo.id, that.numPropId);
                    var numProps = that.pointData[that.numPropId];
                    that.numPropMin = 1.0e99;
                    that.numPropMax = -1.0e99;
                    $.each(numProps, function(idx, val) {
                        that.numPropMax = Math.max(that.numPropMax, val);
                        that.numPropMin = Math.min(that.numPropMin, val);
                    });
                    that.numPropRange = that.numPropMax - that.numPropMin;
                    if (that.numPropRange <= 0)
                        that.numPropRange = 1;
                }


                that.points = [];
                for (var nr =0; nr<keys.length; nr++) {
                    var itemid = keys[nr];
                    var pt =
                    {
                        id: itemid,
                        longit: longitudes[nr],
                        lattit: lattitudes[nr],
                        sel: !!(selectionInfo[itemid])
                    }
                    if (catProps) {
                        pt.catName = catProps[nr];
                        pt.catNr = catData[nr];
                    }
                    else pt.catNr = 0;
                    if (numProps) {
                        pt.numProp = numProps[nr];
                        pt.numPropFrac = (numProps[nr]-that.numPropMin)/that.numPropRange;
                    }
                    that.points.push(pt);
                }

                $.each(that.plotComponents, function(key, plotComp) {
                    plotComp.processFetchedPoints(that.pointData, that.points);
                });

                that.updateMapPoints();

                $.each(that.plotComponents, function(idx, plotComp) {
                    plotComp.setPoints(that.points, {
                        catData: !!that.catPropId,
                        numData: !!that.numPropId
                    });
                });

                that.reDraw();
            }

            that.updateMapPoints = function() {
                if (that.points) {
                    that.pointSet.setPoints(that.points, {
                        catData: !!that.catPropId,
                        numData: !!that.numPropId
                    });
                    that.pointSet.setColorMap(that.mappedColors);
                    that.plotComponents.timeLine.setColorMap(that.mappedColors);
                }
            }


            that.updateSelection = function() {
                if (!that.points)  return;
                var points = that.points;
                var selectionInfo = that.tableInfo.currentSelection;
                for (var nr =0; nr<points.length; nr++)
                    points[nr].sel = !!(selectionInfo[points[nr].id]);
                that.pointSet.updateSelection();

                $.each(that.plotComponents, function(key, plotComp) {
                    plotComp.updateSelection();
                });
            }

            that.fetchLassoSelection = function() {
                if (!that.points)  return;

                var selectionCreationFunction = function() {
                    var selList = [];
                    $.each(that.points,function(idx, point) {
                        if (!that.pointSet.isPointFiltered(point)) {
                            if (that.theMap.isCoordInsideLassoSelection(Map.Coord(point.longit, point.lattit)))
                                selList.push(point.id);
                        }
                    });
                    return selList;
                };

                var content = '';
                ButtonChoiceBox.createPlotItemSelectionOptions(that.thePlot, that.tableInfo, 'Geographic area', content, null, selectionCreationFunction);
            }


            that.fetchRectSelection = function(coord1, coord2) {
                var longitMin = Math.min(coord1.longit, coord2.longit);
                var longitMax = Math.max(coord1.longit, coord2.longit);
                var lattitMin = Math.min(coord1.lattit, coord2.lattit);
                var lattitMax = Math.max(coord1.lattit, coord2.lattit);
                var qry = that.theQuery.get();
                qry = SQL.WhereClause.createRangeRestriction(qry, that.tableInfo.propIdGeoCoordLongit,
                    longitMin, longitMax);
                qry = SQL.WhereClause.createRangeRestriction(qry, that.tableInfo.propIdGeoCoordLattit,
                    lattitMin, lattitMax);

                selectionCreationFunction = function() {
                    var selList = [];
                    $.each(that.points, function(idx, point) {
                        if (!that.pointSet.isPointFiltered(point)) {
                            var sel = (point.longit>=longitMin) && (point.longit<=longitMax) && (point.lattit>=lattitMin) && (point.lattit<=lattitMax);
                            if (sel)
                                selList.push(point.id);
                        }
                    });
                    return selList;
                };

                ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Geographic range', '', qry, selectionCreationFunction);
            }



            that.notifyPropertyContentChanged = function(propid) {
                if (that.pointData[propid]) {
                    that.pointData[propid] = null;
                    that.fetchData()
                }
            }

            that.reloadAll = function() {
                that.pointData = {}; // remove all stored data
                that.fetchData();
            }

            that.reDraw = function() {
                that.pointSet.setPointStyle({
                    opacity: Math.pow(that.ctrl_Opacity.getValue(),1.5),
                    pointSize: that.ctrl_PointSize.getValue(),
                    pointShape: that.ctrl_PointShape.getValue(),
                    aggrSize: that.ctrl_AggrSize.getValue(),
                    aggregateStyle: that.ctrl_AggrType.getValue()
                });
                that.pointSet.draw();

                $.each(that.plotComponents, function(key, plotComp) {
                    plotComp.draw();
                })

            }


            that.updateQuery = function() {
                that.reloadAll();
            }


            that.theQuery.notifyQueryUpdated = that.updateQuery;
            that.create();
            return that;
        }



        return GeoTemporal;
    });


