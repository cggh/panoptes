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


                that.colorLegend = Controls.Html(null,'');

                var controlsGroup = Controls.CompoundVert([
                    ctrl_Query,
                    Controls.VerticalSeparator(20),
                    cmdZoomToFit,
                    cmdLassoSelection,
                    Controls.VerticalSeparator(10),
                    that.ctrlCatProperty1,
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
                fetcher.addColumn(that.tableInfo.propIdGeoCoordLongit, 'F3');
                fetcher.addColumn(that.tableInfo.propIdGeoCoordLattit, 'F3');
                that.points_Keys = null;
                that.points_Longitude = null;
                that.points_Lattitude = null;
                that.pointSet.clearPoints();
                that.points = null;
                var requestID = DQX.getNextUniqueID();
                var selectionInfo = that.tableInfo.currentSelection;
                fetcher.getData(that.theQuery.get(), that.tableInfo.primkey,
                    function (data) { //success
                        that.points_Keys = data[that.tableInfo.primkey];
                        that.points_Longitude = data.Longitude;
                        that.points_Lattitude = data.Lattitude;
                        that.setPoints();
                        if (that.startZoomFit) {
                            that.pointSet.zoomFit(100);
                            that.startZoomFit = false;

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
                    that.points.push(pt);
                }
                that.pointSet.setPoints(that.points);
            }

            that.updateSelection = function() {
                if (!that.points)  return;
                var points = that.points;
                var selectionInfo = that.tableInfo.currentSelection;
                for (var nr =0; nr<points.length; nr++) {
                    var cursel = !!(selectionInfo[points[nr].id]);
                    if (points[nr].sel != cursel) {
                        points[nr].sel = cursel;
                        that.pointSet.updateSelectionState(nr);
                    }
                }
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
                that.panelPlot.invalidate();
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


