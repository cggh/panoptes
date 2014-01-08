define(["require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/Map", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery",
    "MetaData",
    "Utils/QueryTool", "Plots/GenericPlot"],
    function (require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, Map, DataFetchers, EditQuery,
              MetaData,
              QueryTool, GenericPlot) {

        var GeoMapPoints = {};




        GenericPlot.registerPlotType('GeoMapPoints', GeoMapPoints);

        GeoMapPoints.Create = function(tableid) {
            var that = GenericPlot.Create(tableid,'GeoMapPoints', {title:'Map' });


            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid,{ type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid)
                    that.reDraw();
            } );


            that.createFrames = function() {
                that.frameRoot.makeGroupHor();
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setAllowScrollBars(false,true);
                that.framePlot = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(true,false);
            };

            that.createPanels = function() {
                that.panelButtons = Framework.Form(that.frameButtons).setPadding(5);

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

                that.colorLegend = Controls.Html(null,'');

                var controlsGroup = Controls.CompoundVert([
                    ctrl_Query,
                    Controls.VerticalSeparator(20),
                    that.ctrlCatProperty1,
                    Controls.VerticalSeparator(10),
                    that.colorLegend
                ]);
                that.addPlotSettingsControl('controls',controlsGroup);
                that.panelButtons.addControl(controlsGroup);

                that.theMap = Map.GMap(this.framePlot);
                that.pointSet = Map.PointSet('points', that.theMap, 0, "", { showLabels: false, showMarkers: true });
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
                fetcher.addColumn(that.tableInfo.propIdGeoCoordLongit, 'F3');
                fetcher.addColumn(that.tableInfo.propIdGeoCoordLattit, 'F3');
                that.pointSet.clearPoints();
                var requestID = DQX.getNextUniqueID();
                fetcher.getData(that.theQuery.get(), that.tableInfo.primkey,
                    function (data) { //success
                        var points = [];
                        for (var nr =0; nr<data.Longitude.length; nr++) {
                            var pt =
                            {
                                id: nr.toString(),
                                longit: data.Longitude[nr],
                                lattit: data.Lattitude[nr]
                            }
                            points.push(pt);
                        }
                        that.pointSet.setPoints(points);
                    },
                    function (data) { //error
                        that.fetchCount -= 1;
                    }

                );
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


