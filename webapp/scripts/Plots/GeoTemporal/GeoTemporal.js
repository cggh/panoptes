// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/Map", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "DQX/GMaps/PointSet",
    "MetaData",
    "Utils/QueryTool", "Utils/ButtonChoiceBox", "Plots/GenericPlot", "Utils/MiscUtils",
    "Plots/GeoTemporal/TimeLine"
],
    function (require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, Map, DataFetchers, EditQuery, PointSet,
              MetaData,
              QueryTool, ButtonChoiceBox, GenericPlot, MiscUtils,
              TimeLine
        ) {

        var GeoTemporal = {};

        GeoTemporal.typeID = 'GeoTemporal';
        GeoTemporal.name = 'Map';
        GeoTemporal.description= 'Takes a <b>geographic lattitude & longitude property pair</b>, and maps the {items} on a world map. Optionally, a date property can be used to add a time line.';
        GeoTemporal.isCompatible = function(tableInfo) {
            return tableInfo.hasGeoCoord;
        }

        GeoTemporal.plotAspects = [
//            { id:'longit', name:'Longitude', dataType:'GeoLongitude', requiredLevel: 2 },
//            { id:'lattit', name:'Latitude', dataType:'GeoLattitude', requiredLevel: 2 },
            { id:'dateprop', name:'Date', dataType:'Date', requiredLevel: 1 },
            { id:'pointcolor', name:'Color', dataType:'', requiredLevel: 0 }

        ];

        Msg.listen('',{type:'CreateGeoMapPoint'}, function(scope, info) {
            GeoTemporal.Create(
                info.tableid,
                info.startQuery,
                {},
                {
                    zoomFit: true,
                    showAsMarker: true
                }
                );
        });



        GeoTemporal.Create = function(tableid, startQuery, querySettings, plotSettings) {
            var tableInfo = MetaData.getTableInfo(tableid);
            var that = GenericPlot.Create(tableid, GeoTemporal.typeID, {
                title:tableInfo.tableCapNamePlural + ' (' + GeoTemporal.name + ')'
            }, startQuery, querySettings, plotSettings, plotSettings);

            that.pointData = {};//first index: property id, second index: point nr
            that.maxrecordcount = that.tableInfo.settings.MaxCountQueryRecords || 200000;

            that.hasTimeLine = false;
            $.each(MetaData.customProperties, function(idx, propInfo) {
                if ( (propInfo.tableid == that.tableInfo.id) && (propInfo.isDate) )
                    that.hasTimeLine = true;
            });

//            if (that.hasProvidedAspects()) {
//                if (!that.providedAspect2Property('dateprop'))
//                    that.hasTimeLine = false;
//                else
//                that.hasTimeLine = true;
//            }



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
                var controlsCollapsed = false;
                if (plotSettings && plotSettings.controlsCollapsed)
                    controlsCollapsed = true;
                that.frameButtons = Framework.FrameFinal('', 0.3)
                    .setAllowScrollBars(false,true).setFixedSize(Framework.dimX,240);
                var frameRight = Framework.FrameGroupVert('', 0.7)
                    .setMargins(0).setSeparatorSize(0);

                that.frameRoot.MakeControlsFrame(that.frameButtons, frameRight, 240, controlsCollapsed);

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

                var defaultShape = 'rectangle';
                var defaultSize = 2.5;
                if (plotSettings && plotSettings.showAsMarker) {
                    defaultShape = 'marker';
                    defaultSize = 6;
                }


                that.ctrl_PointShape = Controls.Combo(null,{ label:'Point shape:', states: [{id: 'rectangle', 'name':'Rectangle'}, {id: 'circle', 'name':'Circle'}, {id: 'fuzzy', 'name':'Fuzzy'}, {id: 'marker', 'name':'Marker'}], value:defaultShape}).setClassID('pointShape')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_PointSize = Controls.ValueSlider(null, {label: 'Point size', width: 170, minval:0.1, maxval:10, value:defaultSize, digits: 2}).setClassID('pointSize')
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

                that.ctrl_PieOffset = Controls.Check(null, {label: 'Use offset', value:true}).setClassID('pieOffset')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                var grp = Controls.CompoundVert([
                    that.ctrl_PointShape,
                    that.ctrl_PointSize,
                    that.ctrl_Opacity,
                    Controls.CompoundVert([that.ctrl_AggrType, that.ctrl_AggrSize, Controls.VerticalSeparator(5), that.ctrl_PieOffset]).setLegend('Aggregated points')
                    ]);
                return Controls.Section(grp, {
                    title: 'Map',
                    bodyStyleClass: 'ControlsSectionBody'
                });
            }

            that.createPanels = function() {

                this.panelWarning = Framework.Form(this.frameWarning);
                this.warningContent = Controls.Html('', '', '____');
                this.panelWarning.addControl(this.warningContent);
                this.panelWarning.render();

                that.panelButtons = Framework.Form(that.frameButtons).setPadding(0);

                var cmdPointSelection = Controls.Button(null, { icon: 'fa-crosshairs', content: 'Select points...', buttonClass: 'PnButtonGrid', width:80, height:30}).setOnChanged(function () {
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


                that.ctrl_PointCount = Controls.Html(null, '');


                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Text') || (prop.datatype=='Boolean') || (prop.datatype=='Value') || (prop.datatype=='Date') ) )
                        propList.push({ id:prop.propid, name:prop.name, group:prop.group.Name });
                });
                that.ctrlColorProperty = Controls.Combo(null,{ label:'Color:', states: propList, value:that.providedAspect2Property('pointcolor') }).setClassID('pointcolor');
                that.ctrlColorProperty.setOnChanged(function() {
                    that.fetchData();
                });

                that.colorLegend = Controls.Html(null,'');

                var controlsList = [
                    that.createIntroControls(),
                    Controls.AlignCenter(Controls.CompoundHor([
                        cmdPointSelection,
                        Controls.HorizontalSeparator(95)
                    ])),
                    Controls.VerticalSeparator(20),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrlColorProperty,
                        that.colorLegend
                    ]).setMargin(10), {
                        title: 'Color overlay',
                        bodyStyleClass: 'ControlsSectionBody'
                    })
                ];

                $.each(that.plotComponents, function(key, plotComp) {
                    controlsList.push(plotComp.createControls());
                });

                var groupMapControls = that.createControlsMap();

                controlsList.push(groupMapControls);





                var controlsGroup = Controls.CompoundVert(controlsList).setMargin(0);
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
                        qry = SQL.WhereClause.createRangeRestriction(qry, that.tableInfo.propIdGeoCoordLongit, pieChartInfo.longit0-range, pieChartInfo.longit0+range);
                        qry = SQL.WhereClause.createRangeRestriction(qry, that.tableInfo.propIdGeoCoordLattit, pieChartInfo.lattit0-range, pieChartInfo.lattit0+range);
                        Msg.send({type: 'DataItemTablePopup'}, {
                            tableid: that.tableInfo.id,
                            query: qry,
                            title: that.tableInfo.tableCapNamePlural + ' at ' + pieChartInfo.longit + ', ' + pieChartInfo.lattit
                        });
                    }
                );

                that.startZoomFit = true;
//                if (that.hasProvidedAspects())
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
                that.startZoomFit = false;
                that.theMap.recallSettings(sett.mapSettings);
                $.each(that.plotComponents, function(key, plotComp) {
                    if (sett[key])
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
                var qry = that.theQuery.getForFetching();

                var qryIsPresentGenerator = SQL.WhereClause.whcClassGenerator['ispresent'];
                qry = SQL.WhereClause.createRestriction(qry,qryIsPresentGenerator({ColName: that.tableInfo.propIdGeoCoordLongit}));
                qry = SQL.WhereClause.createRestriction(qry,qryIsPresentGenerator({ColName: that.tableInfo.propIdGeoCoordLattit}));
                fetcher.getData(qry, sortField,
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
                that.mappedColors = [DQX.Color(1.0,0,0)];

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
//                    that.numPropMin = 1.0e99;
//                    that.numPropMax = -1.0e99;
//                    $.each(numProps, function(idx, val) {
//                        that.numPropMax = Math.max(that.numPropMax, val);
//                        that.numPropMin = Math.min(that.numPropMin, val);
//                    });
                    that.numPropMin = numPropInfo.settings.minval;
                    that.numPropMax = numPropInfo.settings.maxval;
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
                    if (that.plotComponents.timeLine)
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

                var polygonGeoPoints = [];
                $.each(that.theMap.selectionPolygonLattLongPoints, function(idx, geopt) {
                    polygonGeoPoints.push({
                        x: geopt.longit,
                        y: geopt.lattit
                    });
                });

                var queryInfo = MiscUtils.createPolygonRestrictionQuery(that.theQuery.get(),that.tableInfo.propIdGeoCoordLongit, that.tableInfo.propIdGeoCoordLattit, polygonGeoPoints);


                var content = '';
                var queryData = null;
                if (queryInfo.query)
                    queryData = {
                        query: queryInfo.query,
                        subSamplingOptions: that.theQuery.getSubSamplingOptions()
                    };
                ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Geographic area', content, queryData, selectionCreationFunction);
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

                ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Geographic range', '', {
                    query: qry,
                    subSamplingOptions: that.theQuery.getSubSamplingOptions()
                }, selectionCreationFunction);
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
                    aggregateStyle: that.ctrl_AggrType.getValue(),
                    usePiechartOffset: that.ctrl_PieOffset.getValue()
                });
                that.pointSet.draw();

                $.each(that.plotComponents, function(key, plotComp) {
                    plotComp.draw();
                })

            }


            that.updateQuery = function() {
                that.reloadAll();
            }


            that.create();
            return that;
        }



        return GeoTemporal;
    });


