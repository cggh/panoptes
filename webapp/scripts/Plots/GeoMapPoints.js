define(["require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/Map", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "DQX/GMaps/PointSet",
    "MetaData",
    "Utils/QueryTool", "Plots/GenericPlot"],
    function (require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, Map, DataFetchers, EditQuery, PointSet,
              MetaData,
              QueryTool, GenericPlot) {

        var GeoMapPoints = {};




        GenericPlot.registerPlotType('GeoMapPoints', GeoMapPoints);

        Msg.listen('',{type:'CreateGeoMapPoint'}, function(scope, info) {
            GeoMapPoints.Create(
                info.tableid,
                {
                    zoomFit: true
                },
                info.startQuery);
        });


        GeoMapPoints.Create = function(tableid, settings, startQuery) {
            var that = GenericPlot.Create(tableid,'GeoMapPoints', {title:'Map' });


            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid,{ type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid)
                    that.updateSelection();
            } );


            that.createFrames = function() {
                that.frameRoot.makeGroupHor();
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setAllowScrollBars(false,true);
                that.framePlot = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(false,false);
            };

            that.createPanels = function() {
                that.panelButtons = Framework.Form(that.frameButtons).setPadding(5);

                if (startQuery)
                    that.theQuery.setStartQuery(startQuery);

                var ctrl_Query = that.theQuery.createControl();

                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Text') || (prop.datatype=='Boolean') ) )
                        propList.push({ id:prop.propid, name:prop.name });
                });
                that.ctrlCatProperty1 = Controls.Combo(null,{ label:'Point color:', states: propList }).setClassID('pointcolor');
                that.ctrlCatProperty1.setOnChanged(function() {
                    that.fetchData();
                });

                var cmdZoomToFit = Controls.Button(null, { content: 'Zoom to fit'}).setOnChanged(function () {
                    that.pointSet.zoomFit();
                });

                var onStopLassoSelection = function() {
                    cmdLassoSelection.changeContent('Lasso select Points');
                    that.theMap.stopLassoSelection();
                    cmdLassoSelection.busy = false;
                    that.fetchLassoSelection();
                };

                var cmdLassoSelection = Controls.Button(null, { content: 'Lasso select Points'}).setOnChanged(function () {
                    cmdLassoSelection.busy = !cmdLassoSelection.busy;
                    if (cmdLassoSelection.busy) {
                        cmdLassoSelection.changeContent('Complete lasso selection');
                        that.theMap.startLassoSelection(onStopLassoSelection);
                    }
                    else {
                        onStopLassoSelection();
                    }
                });


                that.ctrl_PointShape = Controls.Combo(null,{ label:'Point shape:', states: [{id: 'rectangle', 'name':'Rectangle'}, {id: 'circle', 'name':'Circle'}, {id: 'fuzzy', 'name':'Fuzzy'}], value:'rectangle' }).setClassID('pointShape')
                    .setOnChanged(function() {
                        that.reDraw();
                    });


                that.ctrl_PointSize = Controls.ValueSlider(null, {label: 'Point size', width: 200, minval:0.1, maxval:10, value:2, digits: 2}).setClassID('pointSize')
                    .setNotifyOnFinished()
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_Opacity = Controls.ValueSlider(null, {label: 'Point opacity', width: 200, minval:0, maxval:1, value:1, digits: 2}).setClassID('pointOpacity')
                    .setNotifyOnFinished()
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_AggrType = Controls.Combo(null,{ label:'Style:', states: [{id: 'piechart', 'name':'Pie chart'}, {id: 'cluster', 'name':'Cluster'}], value:'piechart' }).setClassID('aggrStyle')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_AggrSize = Controls.ValueSlider(null, {label: 'Size', width: 170, minval:10, maxval:100, value:20, digits: 0}).setClassID('aggrSize')
                    .setNotifyOnFinished()
                    .setOnChanged(function() {
                        that.reDraw();
                    });


                that.colorLegend = Controls.Html(null,'');

                var controlsGroup = Controls.CompoundVert([
                    ctrl_Query,
                    Controls.VerticalSeparator(20),
                    cmdZoomToFit,
                    cmdLassoSelection,
                    Controls.VerticalSeparator(10),
                    that.ctrlCatProperty1,
                    Controls.VerticalSeparator(10),
                    that.ctrl_PointShape,
                    that.ctrl_PointSize,
                    that.ctrl_Opacity,
                    Controls.CompoundVert([that.ctrl_AggrType, that.ctrl_AggrSize]).setLegend('Aggregated points'),
                    Controls.VerticalSeparator(10),
                    that.colorLegend
                ]);
                that.addPlotSettingsControl('controls',controlsGroup);
                that.panelButtons.addControl(controlsGroup);

                that.theMap = Map.GMap(this.framePlot);
                //that.pointSet = Map.PointSet('points', that.theMap, 0, "", { showLabels: false, showMarkers: true });
                that.pointSet = PointSet.Create(that.theMap, {});
                that.pointSet.setPointClickCallBack(function(itemid) {
                    Msg.send({ type: 'ItemPopup' }, { tableid: that.tableInfo.id, itemid: itemid } );
                });

                if (settings && settings.zoomFit)
                    that.startZoomFit = true;
                that.reloadAll();
            };

            that.reloadAll = function() {
                that.fetchData();
            }

            that.fetchData = function() {
                var fetcher = DataFetchers.RecordsetFetcher(MetaData.serverUrl, MetaData.database, that.tableInfo.id + 'CMB_' + MetaData.workspaceid);
                fetcher.setMaxResultCount(999999);
/*                var encoding='ST';
                if (propInfo.isFloat)
                    encoding = 'F3';
                if (propInfo.isBoolean)
                    encoding = 'GN';*/
                fetcher.addColumn(that.tableInfo.primkey, 'ST');
                fetcher.addColumn(that.tableInfo.propIdGeoCoordLongit, 'F4');
                fetcher.addColumn(that.tableInfo.propIdGeoCoordLattit, 'F4');

                that.catPropId = null;
                if (that.ctrlCatProperty1.getValue()) {
                    that.catPropId = that.ctrlCatProperty1.getValue();
                    fetcher.addColumn(that.catPropId, 'ST');
                }

                that.points_Keys = null;
                that.points_Longitude = null;
                that.points_Lattitude = null;
                that.points_CatProp = null;
                that.pointSet.clearPoints();
                that.points = null;
                var requestID = DQX.getNextUniqueID();
                that.requestID = requestID;
                var selectionInfo = that.tableInfo.currentSelection;
                fetcher.getData(that.theQuery.get(), that.tableInfo.primkey,
                    function (data) { //success
                        if (that.requestID == requestID) {
                            that.points_Keys = data[that.tableInfo.primkey];
                            that.points_Longitude = data.Longitude;
                            that.points_Lattitude = data.Lattitude;
                            if (that.catPropId)
                                that.points_CatProp = data[that.catPropId];
                            that.setPoints();
                            if (that.startZoomFit) {
                                that.pointSet.zoomFit(100);
                                that.startZoomFit = false;
                            }
                        }
                    },
                    function (data) { //error
                        that.fetchCount -= 1;
                    }

                );
            }

            that.setPoints = function() {
                var keys = that.points_Keys;
                var longitudes = that.points_Longitude;
                var lattitudes = that.points_Lattitude;
                var selectionInfo = that.tableInfo.currentSelection;

                if (that.catPropId) {
                    var catPropInfo = MetaData.findProperty(that.tableInfo.id, that.catPropId);
                    var catProps = that.points_CatProp;
                    var colormapper = MetaData.findProperty(that.tableInfo.id, that.catPropId).category2Color;

                    if (!catProps)
                        debugger;
                    for (var i=0; i<catProps.length; i++)
                        catProps[i] = catPropInfo.toDisplayString(catProps[i]);

                    var catMap = {};
                    var cats = []
                    for (var i=0; i<catProps.length; i++) {
                        if (!catMap[catProps[i]]) {
                            catMap[catProps[i]] = true;
                            cats.push(catProps[i]);
                        }
                    }

                    colormapper.map(cats);
                    var catData = [];
                    for (var i=0; i<catProps.length; i++) {
                        var idx = colormapper.get(catProps[i]);
                        if (idx<0)
                            idx = colormapper.itemCount-1;
                        catData.push(idx);
                    }

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
                    if (catProps)
                        pt.catNr = catData[nr];
                    else pt.catNr = 0;
                    that.points.push(pt);
                }
                that.pointSet.setPoints(that.points);
                that.reDraw();
            }

            that.updateSelection = function() {
                if (!that.points)  return;
                var points = that.points;
                var selectionInfo = that.tableInfo.currentSelection;
                for (var nr =0; nr<points.length; nr++)
                    points[nr].sel = !!(selectionInfo[points[nr].id]);
                that.reDraw();
            }

            that.fetchLassoSelection = function() {
                if (!that.points)  return;
                var points = that.points;
                var selectionInfo = that.tableInfo.currentSelection;
                var modified = false;
                for (var nr =0; nr<points.length; nr++) {
                    var sel = that.theMap.isCoordInsideLassoSelection(Map.Coord(points[nr].longit, points[nr].lattit));
                    if (sel!=!!(selectionInfo[points[nr].id])) {
                        modified = true;
                        that.tableInfo.selectItem(points[nr].id, sel);
                    }
                }
                if (modified)
                    Msg.broadcast({type:'SelectionUpdated'}, that.tableInfo.id);
            }


            that.reloadAll = function() {
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
            }


            that.updateQuery = function() {
                that.fetchData();
            }


            that.theQuery.notifyQueryUpdated = that.updateQuery;
            that.create();
            return that;
        }



        return GeoMapPoints;
    });


