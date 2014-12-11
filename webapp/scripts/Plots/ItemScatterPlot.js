// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvasXYPlot", "DQX/DataFetcher/DataFetchers", "DQX/MessageBox",
    "Wizards/EditQuery", "MetaData", "Utils/QueryTool", "Plots/GenericPlot", "Plots/StandardLayoutPlot", "Utils/ButtonChoiceBox", "Utils/MiscUtils"
],
    function (
        require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvasXYPlot, DataFetchers, MessageBox,
        EditQuery, MetaData, QueryTool, GenericPlot, StandardLayoutPlot, ButtonChoiceBox, MiscUtils
        ) {

        var ItemScatterPlot = {};

        ItemScatterPlot.typeID = 'scatterplot';
        ItemScatterPlot.name = 'Scatter plot';
        ItemScatterPlot.description= 'Takes <b>two numerical properties</b> and plot the {items} as points on a X-Y chart. Optionally, the colour and size of the points can be controlled by other properties.';
        ItemScatterPlot.isCompatible = function(tableInfo) {
            return true;
        }

        ItemScatterPlot.plotAspects = [
            { id:'xaxis', name:'X value', dataType:'Value', requiredLevel: 2 },
            { id:'yaxis', name:'Y value', dataType:'Value', requiredLevel: 2 },
            { id:'color', name:'Point color', dataType:'', requiredLevel: 0 },
            { id:'size', name:'Point size', dataType:'Value', requiredLevel: 0 },
            { id:'style', name:'Point style', dataType:'Text', requiredLevel: 0 },
            { id:'label', name:'Hover label', dataType:'', requiredLevel: 0 }
        ];

        ItemScatterPlot.PointStyles = [
            {
                id:'circle', name: 'Circle', drawer: function(ctx, x, y, sz) {
                    ctx.beginPath();
                    ctx.arc(x, y, sz, 0, 2 * Math.PI, false);
                    ctx.closePath();
            }
            },
            {
                id:'triangle', name: 'Triangle', drawer: function(ctx, x, y, sz) {
                sz *= 1.25;
                ctx.beginPath();
                ctx.moveTo(x-0.866*sz, y+0.5*sz);
                ctx.lineTo(x, y-sz);
                ctx.lineTo(x+0.866*sz, y+0.5*sz);
                ctx.closePath();
            }
            },
            {
                id:'rectangle', name: 'Rectangle', drawer: function(ctx, x, y, sz) {
                sz *= 0.85;
                ctx.beginPath();
                ctx.moveTo(x-sz, y-sz);
                ctx.lineTo(x-sz, y+sz);
                ctx.lineTo(x+sz, y+sz);
                ctx.lineTo(x+sz, y-sz);
                ctx.closePath();
            }
            },
            {
                id:'diamond', name: 'Diamond', drawer: function(ctx, x, y, sz) {
                sz *= 1.1;
                ctx.beginPath();
                ctx.moveTo(x, y-sz);
                ctx.lineTo(x+sz, y);
                ctx.lineTo(x, y+sz);
                ctx.lineTo(x-sz, y);
                ctx.closePath();
            }
            },
            {// Last style, used as overflow
                id:'', name: '', drawer: function(ctx, x, y, sz) {
                ctx.beginPath();
                ctx.arc(x, y, 0.3*sz, 0, 2 * Math.PI, false);
                ctx.closePath();
            }
            }
            ];


        ItemScatterPlot.Create = function(tableid, startQuery, querySettings, plotSettings) {
            var that = StandardLayoutPlot.Create(tableid, ItemScatterPlot.typeID, {title: ItemScatterPlot.name }, startQuery, querySettings, plotSettings);
            that.fetchCount = 0;
            that.propDataMap = {};
            that.maxrecordcount = that.tableInfo.settings.MaxCountQueryRecords || 200000;



            that.plotAspects = [
                { id: 'id', name: 'ID', datatype: 'Text', propid: that.tableInfo.primkey, data: null, visible:false, required:true },
                { id: 'xaxis', name: 'X axis', datatype: 'Value', propid: null, data: null, visible:true, required:true },
                { id: 'yaxis', name: 'Y axis', datatype: 'Value', propid: null, data: null, visible:true, required:true },
                { id: 'color', name: 'Point color', datatype: '', propid: null, visible:true, data: null },
                { id: 'size', name: 'Point size', datatype: 'Value', propid: null, visible:true, data: null },
                { id: 'style', name: 'Point style', datatype: 'Category', propid: null, visible:true, data: null },
                { id: 'label', name: 'Hover label', datatype: '', propid: null, visible:true, data: null },
            ];

            that.mapPlotAspects = {};
            $.each(that.plotAspects, function(idx, aspect) {
                that.mapPlotAspects[aspect.id] = aspect;
            });


            that.createPanelPlot = function() {
                that.panelPlot = FrameCanvasXYPlot(that.framePlot);
                that.panelPlot.drawXScale = that.drawXScale;
                that.panelPlot.drawYScale = that.drawYScale;
                that.panelPlot.drawCenter = that.drawCenter;
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
            }


            var checkSelectingMode = function() {
                if (that.pointSelectingMode) {
                    MessageBox.errorBox('Error', 'Points are already being selected');
                    return false;
                }
                return true;
            }

            that.createPanelButtons = function() {

                var cmdPointSelection = Controls.Button(null, { icon: 'fa-crosshairs', content: 'Select points...', buttonClass: 'PnButtonGrid', width:80, height:30}).setOnChanged(function () {

                    if (!checkSelectingMode())
                        return;

                    var actions = [];

                    actions.push( { content:'Rectangle selection', bitmap:'Bitmaps/circle_red_small.png', handler:function() {
                        if (!checkSelectingMode())
                            return;
                        that.pointSelectingMode = true;
                        that.setAssistText('Click two times on the plot to define the selection bounding box');
                        that.panelPlot.startRectangleSelection(function(pt1, pt2) {
                            that.pointSelectingMode = false;
                            that.setAssistText('');
                            var rangeXMin = (Math.min(pt1.x,pt2.x)-that.offsetX)/that.scaleX;
                            var rangeXMax = (Math.max(pt1.x,pt2.x)-that.offsetX)/that.scaleX;
                            var rangeYMin = (Math.max(pt1.y,pt2.y)-that.offsetY)/that.scaleY;
                            var rangeYMax = (Math.min(pt1.y,pt2.y)-that.offsetY)/that.scaleY;

                            var qry = that.theQuery.get();
                            qry = SQL.WhereClause.createRangeRestriction(qry, that.mapPlotAspects['xaxis'].propid, rangeXMin, rangeXMax);
                            qry = SQL.WhereClause.createRangeRestriction(qry, that.mapPlotAspects['yaxis'].propid, rangeYMin, rangeYMax);

                            var content = 'X Range: '+rangeXMin+' - '+rangeXMax+'<br>';
                            content += 'Y Range: '+rangeYMin+' - '+rangeYMax+'<br>';

                            if (!that.plotPresent) return;
                            var ids =that.mapPlotAspects['id'].data;
                            var aspectX = that.mapPlotAspects['xaxis'];
                            var aspectY = that.mapPlotAspects['yaxis'];
                            var valX = aspectX.data;
                            var valY = aspectY.data;

                            var selectionCreationFunction = function() {
                                var sellist = [];
                                for (var i=0; i<valX.length; i++) {
                                    if ( (valX[i]!=null) && (valY[i]!=null) ) {
                                        if ((valX[i]>=rangeXMin) && (valX[i]<=rangeXMax) && (valY[i]>rangeYMin) && (valY[i]<=rangeYMax)) {
                                            sellist.push(ids[i]);
                                        }
                                    }
                                }
                                return sellist;
                            };

                            ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Rectangular area', content, {
                                query: qry,
                                subSamplingOptions: that.theQuery.getSubSamplingOptions()
                            }, selectionCreationFunction);
                        });
                    }
                    });

                    actions.push( { content:'Lasso selection', bitmap:'Bitmaps/circle_red_small.png', handler:function() {
                        if (!checkSelectingMode())
                            return;
                        that.pointSelectingMode = true;
                        that.setAssistText('Click points on the plot to select the area. Double-click to finalise the selection');
                        that.panelPlot.startLassoSelection(function(selectedPoints) {
                            that.pointSelectingMode = false;
                            that.setAssistText('');

                            function isPointInPoly(poly, pt) {
                                for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
                                    ((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
                                        && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
                                    && (c = !c);
                                return c;
                            }

                            var polygonPoints = [];
                            $.each(selectedPoints, function(idx, pt) {
                                polygonPoints.push({
                                    x: (pt.x-that.offsetX)/that.scaleX,
                                    y: (pt.y-that.offsetY)/that.scaleY
                                });
                            });
                            var queryInfo = MiscUtils.createPolygonRestrictionQuery(that.theQuery.get(),that.mapPlotAspects['xaxis'].propid, that.mapPlotAspects['yaxis'].propid, polygonPoints);


                            if (!that.plotPresent) return;
                            scaleX = that.scaleX; offsetX = that.offsetX;
                            scaleY = that.scaleY; offsetY = that.offsetY;
                            var ids =that.mapPlotAspects['id'].data;
                            var aspectX = that.mapPlotAspects['xaxis'];
                            var aspectY = that.mapPlotAspects['yaxis'];
                            var valX = aspectX.data;
                            var valY = aspectY.data;
                            var selList = [];
                            for (var i=0; i<valX.length; i++) {
                                if ( (valX[i]!=null) && (valY[i]!=null) ) {
                                    var px = valX[i] * scaleX + offsetX;
                                    var py = valY[i] * scaleY + offsetY;
                                    if (isPointInPoly(selectedPoints, {x:px, y:py}))
                                        selList.push(ids[i]);
                                }
                            }
                            var selectionCreationFunction = function() { return selList; };
                            var content = '';
                            var queryData = null;
                            if (queryInfo.query)
                                queryData = {
                                query: queryInfo.query,
                                subSamplingOptions: that.theQuery.getSubSamplingOptions()
                            };
                            ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Scatterplot area', content, queryData, selectionCreationFunction);
                        });
                    }
                    });

                    actions.push( { content:'Half plane selection', bitmap:'Bitmaps/circle_red_small.png', handler:function() {
                        if (!checkSelectingMode())
                            return;
                        that.pointSelectingMode = true;
                        that.setAssistText('Click two times on the plot to define the boundary line for the selection');
                        that.panelPlot.startHalfPlaneSelection(function(center, dir) {
                            that.pointSelectingMode = false;
                            that.setAssistText('');
                            center.x = (center.x-that.offsetX)/that.scaleX;
                            center.y = (center.y-that.offsetY)/that.scaleY;
                            dir.x = dir.x/that.scaleX;
                            dir.y = dir.y/that.scaleY;
                            var queryInfo = MiscUtils.createHalfPlaneRestrictionQuery(that.theQuery.get(),that.mapPlotAspects['xaxis'].propid, that.mapPlotAspects['yaxis'].propid, center, dir);

                            var selectionCreationFunction = function() {
                                var valX = that.mapPlotAspects['xaxis'].data;
                                var valY = that.mapPlotAspects['yaxis'].data;
                                var ids =that.mapPlotAspects['id'].data;
                                var selector = queryInfo.selector;
                                var selList = [];
                                if (selector) {
                                    for (var i=0; i<valX.length; i++) {
                                        if ( (valX[i]!=null) && (valY[i]!=null) ) {
                                            if (selector(valX[i],valY[i]))
                                                selList.push(ids[i]);
                                        }
                                    }
                                }
                                return selList;
                            };
                            ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Half plane', '', {
                                query: queryInfo.query,
                                subSamplingOptions: that.theQuery.getSubSamplingOptions()
                            }, selectionCreationFunction);
                        });
                    }
                    });

                    ButtonChoiceBox.create('Select points','', [actions]);

                });

                that.ctrl_PointCount = Controls.Html(null, '');

                var pickControls = Controls.CompoundVert([]).setMargin(10);
                $.each(that.plotAspects,function(aspectIdx, plotAspect) {
                    if (plotAspect.visible) {
                        var propList = [ {id:'', name:'-- None --'}];
                        $.each(MetaData.customProperties, function(idx, prop) {
                            var included = false;
                            if (prop.tableid==that.tableInfo.id) {
                                if ( (prop.datatype==plotAspect.datatype) || (!plotAspect.datatype) )
                                    included = true;
                                if ( (plotAspect.datatype=='Value') && (prop.isFloat) )
                                    included = true;
                                if ((plotAspect.datatype=='Category') && ( (prop.datatype=='Text') || (prop.isBoolean) ) )
                                    included = true;
                            }
                            if (included)
                                propList.push({ id:prop.propid, name:prop.name, group:prop.group.Name });
                        });
                        plotAspect.picker = Controls.Combo(null, { label:plotAspect.name+':<br>', states: propList, value:that.providedAspect2Property(plotAspect.id) }).setClassID(plotAspect.id).setOnChanged( function() { that.fetchData(plotAspect.id)} );
                        plotAspect.propid = that.providedAspect2Property(plotAspect.id);
                        pickControls.addControl(plotAspect.picker);
                    }
                });

                that.ctrl_SizeFactor = Controls.ValueSlider(null, {label: 'Size factor', width: 180, minval:0, maxval:2, value:1, digits: 2})
                    .setNotifyOnFinished().setClassID('sizefactor')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_Opacity = Controls.ValueSlider(null, {label: 'Opacity', width: 180, minval:0, maxval:1, value:1, digits: 2})
                    .setNotifyOnFinished().setClassID('opacity')
                    .setOnChanged(function() {
                        that.reDraw();
                });

                that.ctrl_Outline = Controls.Check(null, {label: 'Outline', value:false}).setClassID('outline')
                  .setOnChanged(function() {
                      that.reDraw();
                  });


                that.colorLegend = Controls.Html(null,'');
                that.styleLegend = Controls.Html(null,'');

                var controlsGroup = Controls.CompoundVert([
                    that.createIntroControls(),
                    Controls.AlignCenter(Controls.CompoundHor([
                        cmdPointSelection,
                        Controls.HorizontalSeparator(95)
                    ])),
                    Controls.VerticalSeparator(20),

                    Controls.Section(pickControls, {
                        title: 'Plot data',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrl_SizeFactor,
                        that.ctrl_Opacity,
                        that.ctrl_Outline
                    ]).setMargin(10), {
                        title: 'Layout',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        that.colorLegend,
                        that.styleLegend
                    ]), {
                        title: 'Legend',
                        bodyStyleClass: 'ControlsSectionBody'
                    })

                ]).setMargin(0);
                that.addPlotSettingsControl('controls',controlsGroup);
                that.panelButtons.addControl(controlsGroup);

                if (that.hasProvidedAspects())
                    that.reloadAll();
            };


            that.setActiveQuery = function(qry) {
                that.theQuery.modify(qry);
            }

            that.updateQuery = function() {
                that.reloadAll();
            }


            that.reloadAll = function() {
                that.propDataMap = {};
                $.each(that.plotAspects, function(idx, plotAspect) {
                    if (plotAspect.propid)
                        that.fetchData(plotAspect.id);
                });
            }

            that.reDraw = function() {
                that.panelPlot.invalidate();
            }


            that.fetchData = function(plotAspectID) {


                var aspectInfo = that.mapPlotAspects[plotAspectID];
                aspectInfo.data = null;
                if (aspectInfo.visible)
                    aspectInfo.propid = aspectInfo.picker.getValue();
                if (that.staging)
                    return;

                //If ID is missing, silently fetch this as well
                if (plotAspectID == 'xaxis')
                    if (!that.mapPlotAspects['id'].data)
                        setTimeout(function(){
                                that.fetchData('id');
                            },
                            150);

                if (aspectInfo.propid) {
                    var propInfo = MetaData.findProperty(that.tableInfo.id,aspectInfo.propid);
                    if (that.propDataMap[aspectInfo.propid]) {
                        aspectInfo.data = that.propDataMap[aspectInfo.propid];
                        that.processAspectData(plotAspectID);
                        that.panelPlot.invalidate();
                    }
                    else {
                        that.ctrl_PointCount.modifyValue('--- data points');
                        var fetcher = DataFetchers.RecordsetFetcher(
                            MetaData.serverUrl,
                            MetaData.database,
                            that.tableInfo.getQueryTableName(that.theQuery.isSubSampling())
                        );
                        fetcher.setMaxResultCount(that.maxrecordcount);
                        var encoding='ST';
                        if (propInfo.isFloat) {
                            encoding = 'F3';
                            if (propInfo.datatype=='HighPrecisionValue')
                                encoding = 'FH';
                        }
                        if (propInfo.isInt)
                            encoding = 'IN';
                        if (propInfo.isBoolean)
                            encoding = 'GN';
                        fetcher.addColumn(aspectInfo.propid, encoding);
                        that.panelPlot.invalidate();
                        var requestID = DQX.getNextUniqueID();
                        aspectInfo.requestID = requestID;
                        that.fetchCount += 1;
                        var orderField = that.tableInfo.primkey;
                        if (that.theQuery.isSubSampling())
                            orderField = 'RandPrimKey';
                        fetcher.getData(that.theQuery.getForFetching(), orderField,
                            function (data) { //success
                                that.fetchCount -= 1;
                                if (aspectInfo.requestID != requestID) {//request must be outdated, so we don't handle it
                                    that.panelPlot.invalidate();
                                    return;
                                }
                                aspectInfo.data = data[aspectInfo.propid];
                                that.ctrl_PointCount.modifyValue(aspectInfo.data.length+' data points');
                                that.propDataMap[aspectInfo.propid] = aspectInfo.data;
                                that.processAspectData(plotAspectID);
                                that.panelPlot.invalidate();
                                if (aspectInfo.data.length >= that.maxrecordcount)
                                    that.setWarning('Number of points truncated to ' + that.maxrecordcount);
                                else
                                    that.setWarning('');
                            },
                            function (data) { //error
                                that.fetchCount -= 1;
                            }

                        );
                    }
                }
                else {
                    that.processAspectData(plotAspectID);
                    that.panelPlot.invalidate();
                }
            };

            that.processAspectData = function(plotAspectID) {
                var aspectInfo = that.mapPlotAspects[plotAspectID];
                if (aspectInfo.propid)
                    var propInfo = MetaData.findProperty(that.tableInfo.id,aspectInfo.propid);
                var values = aspectInfo.data;
                if ((aspectInfo.datatype == 'Value')&&(values)) {
                    var minval=1.0e99;
                    var maxval= -1.0e99;
                    for (var i=0; i<values.length; i++) {
                        if (values[i]!=null) {
                            if (minval > values[i]) minval = values[i];
                            if (maxval < values[i]) maxval = values[i];
                        }
                    }
                    aspectInfo.minval = minval;
                    aspectInfo.maxval = maxval;
                    var range = aspectInfo.maxval-aspectInfo.minval;
                    if (range <= 0)
                        range=1;
                    aspectInfo.maxval += range/20;
                    aspectInfo.minval -= range/20;
                    aspectInfo.safeRange = aspectInfo.maxval - aspectInfo.minval;
                }

                if (plotAspectID == 'xaxis') {
                    that.panelPlot.setXRange(aspectInfo.minval, aspectInfo.minval + aspectInfo.safeRange);
                }

                if (plotAspectID == 'yaxis') {
                    that.panelPlot.setYRange(aspectInfo.minval, aspectInfo.minval + aspectInfo.safeRange);
                }

                if ( (aspectInfo.datatype == 'Category') && (values) ) {
                    for (var i=0; i<values.length; i++)
                        values[i] = propInfo.toDisplayString(values[i]);
                }

                if (plotAspectID=='id') {
                    var sortIndex = [];
                    for (var i=0; i<values.length; i++)
                        sortIndex.push(i);
                    that.sortIndex = sortIndex;
                    that.panelPlot.setDirectDedraw(values.length<10000);
                }

                if (plotAspectID=='size') {
                    if (values) {// Make sure the points are sorted largest to smallest
                        var idx = [];
                        for (i=0; i<values.length; i++)
                            idx.push(i);
                        that.sortIndex = _.sortBy(idx, function(val,key) {
                            return -values[key];
                        });
                    }
                }

                if (plotAspectID=='style') {
                    var legendStr = "";
                    if (values) {
                        var propInfo = MetaData.findProperty(that.tableInfo.id,aspectInfo.propid);
                        legendStr += '<b>'+propInfo.name+'</b><br>';
                        that.styleMapper = {};
                        var usedStyleCount  = 0;
                        $.each(values, function(idx, value) {
                            if (!that.styleMapper[value]) {
                                if (usedStyleCount<ItemScatterPlot.PointStyles.length) {
                                    that.styleMapper[value] = ItemScatterPlot.PointStyles[usedStyleCount];
                                    usedStyleCount++;
                                    if (that.styleMapper[value].name)
                                        legendStr += that.styleMapper[value].name + ': ' + value + '<br>';
                                }
                                else {
                                    that.styleMapper[value] = ItemScatterPlot.PointStyles[ItemScatterPlot.PointStyles.length-1];
                                }
                            }
                        });
                    }
                    that.styleLegend.modifyValue(legendStr);
                }

                if (plotAspectID=='color') {// Create categorical data
                    aspectInfo.catData = null;
                    var legendStr = '';
                    if (values) {
                        var propInfo = MetaData.findProperty(that.tableInfo.id,aspectInfo.propid);
                        legendStr += '<b>'+propInfo.name+'</b><br>';
                        var maprs = propInfo.mapColors(values);
                        aspectInfo.catData = maprs.indices;
                        that.mappedColors = maprs.colors;
                        $.each(maprs.legend,function(idx, legendItem) {
                            legendStr+='<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}<br>'.DQXformat({cl:legendItem.color.toString(), name:legendItem.state});
                        });
                    }
                    that.colorLegend.modifyValue(legendStr);
                }
            }

            that.drawXScale = function(drawInfo) {
                var aspectX = that.mapPlotAspects['xaxis'];
                if ((!aspectX.propid) || (!aspectX.data))
                    return;
                var ctx = drawInfo.ctx;
                var scaleX = that.panelPlot.getXScale();
                var offsetX = that.panelPlot.getXOffset();
                var plotLimitXMin = that.panelPlot.xScaler.getMinVisibleRange();
                var plotLimitXMax = that.panelPlot.xScaler.getMaxVisibleRange();
                ctx.save();
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scaleTicks = MiscUtils.createPropertyScale(that.tableInfo.id, aspectX.propid, scaleX, aspectX.minval, aspectX.maxval);
                $.each(scaleTicks, function(idx, tick) {
                    if ((tick.value>=plotLimitXMin) && (tick.value<=plotLimitXMax)) {
                        var px = Math.round(tick.value * scaleX + offsetX)-0.5;
                        if (tick.label) {
                            ctx.fillText(tick.label,px,drawInfo.sizeY-that.panelPlot.scaleMarginY+13);
                            if (tick.label2)
                                ctx.fillText(tick.label2,px,drawInfo.sizeY-that.panelPlot.scaleMarginY+23);
                            ctx.strokeStyle = "rgba(0,0,0,0.2)";
                        }
                        else {
                            ctx.strokeStyle = "rgba(0,0,0,0.1)";
                        }
                        if (!drawInfo.scaleBorderOnly) {
                            ctx.beginPath();
                            ctx.moveTo(px,0);
                            ctx.lineTo(px,drawInfo.sizeY-that.panelPlot.scaleMarginY);
                            ctx.stroke();
                        }
                    }
                });
                var aspectXpropid = that.mapPlotAspects['xaxis'].propid;
                if (aspectXpropid) {
                    ctx.font="bold 11px Arial";
                    ctx.fillText(MetaData.findProperty(that.tableInfo.id, aspectXpropid).name,drawInfo.sizeX/2, drawInfo.sizeY-12);
                }

                ctx.restore();
            }

            that.drawYScale = function(drawInfo) {
                var aspectY = that.mapPlotAspects['yaxis'];
                if ((!aspectY.propid) || (!aspectY.data))
                    return;
                var ctx = drawInfo.ctx;
                var scaleY = that.panelPlot.getYScale();
                var offsetY = that.panelPlot.getYOffset();
                var plotLimitYMin = that.panelPlot.yScaler.getMinVisibleRange();
                var plotLimitYMax = that.panelPlot.yScaler.getMaxVisibleRange();

                ctx.save();
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scaleTicks = MiscUtils.createPropertyScale(that.tableInfo.id, aspectY.propid, Math.abs(scaleY), aspectY.minval, aspectY.maxval);
                $.each(scaleTicks, function(idx, tick) {
                    if ((tick.value>=plotLimitYMin) && (tick.value<=plotLimitYMax)) {
                        var py = Math.round(tick.value * scaleY + offsetY)-0.5;
                        if (tick.label) {
                            ctx.save();
                            ctx.translate(that.panelPlot.scaleMarginX-5,py);
                            ctx.rotate(-Math.PI/2);
                            if (!tick.label2)
                                ctx.fillText(tick.label,0,0);
                            else {
                                ctx.fillText(tick.label,0,-10);
                                ctx.fillText(tick.label2,0,0);
                            }
                            ctx.restore();
                            ctx.strokeStyle = "rgba(0,0,0,0.2)";
                        }
                        else {
                            ctx.strokeStyle = "rgba(0,0,0,0.1)";
                        }
                        if (!drawInfo.scaleBorderOnly) {
                            ctx.beginPath();
                            ctx.moveTo(that.panelPlot.scaleMarginX,py);
                            ctx.lineTo(drawInfo.sizeX,py);
                            ctx.stroke();
                        }
                    }
                });

                var aspectYpropid = that.mapPlotAspects['yaxis'].propid;
                if (aspectYpropid) {
                    ctx.font="bold 11px Arial";
                    ctx.save();
                    ctx.translate(17,drawInfo.sizeY/2);
                    ctx.rotate(-Math.PI/2);
                    ctx.fillText(MetaData.findProperty(that.tableInfo.id, aspectYpropid).name,0,0);
                    ctx.restore();
                }

                ctx.restore();
            }

            that.drawCenter = function(drawInfo) {
                that.plotPresent = false;
                var ctx = drawInfo.ctx;
                ctx.fillStyle="#FFFFFF";
                ctx.fillRect(0, 0, drawInfo.sizeX,  drawInfo.sizeY);
                if (that.fetchCount > 0) {
                    ctx.font="20px Arial";
                    ctx.textAlign = 'left';
                    ctx.fillStyle="rgb(140,140,140)";
                    ctx.fillText("Fetching data ... "+that.fetchCount,110,50);
                    return;
                }

                var missingAspects =[];
                $.each(that.plotAspects, function(idx, aspect) {
                    if (aspect.required&&(!aspect.data))
                        missingAspects.push(aspect.name);
                });
                if (missingAspects.length>0) {
                    ctx.font="italic 14px Arial";
                    ctx.fillStyle="rgb(0,0,0)";
                    ctx.fillText("Please provide data for "+missingAspects.join(', '),50,50);
                    return;
                }


                var ids = that.mapPlotAspects['id'].data;
                var aspectX = that.mapPlotAspects['xaxis'];
                var aspectY = that.mapPlotAspects['yaxis'];
                var valX = aspectX.data;
                var valY = aspectY.data;
                var valColorCat = that.mapPlotAspects['color'].catData;
                var valSize = that.mapPlotAspects['size'].data;
                var valStyle = that.mapPlotAspects['style'].data;
                var scaleX = that.panelPlot.getXScale();
                var offsetX = that.panelPlot.getXOffset();
                var scaleY = that.panelPlot.getYScale();
                var offsetY = that.panelPlot.getYOffset();
                that.scaleX = scaleX; that.offsetX = offsetX;
                that.scaleY = scaleY; that.offsetY = offsetY;
                var plotLimitXMin = that.panelPlot.xScaler.getMinVisibleRange();
                var plotLimitXMax = that.panelPlot.xScaler.getMaxVisibleRange();
                var plotLimitYMin = that.panelPlot.yScaler.getMinVisibleRange();
                var plotLimitYMax = that.panelPlot.yScaler.getMaxVisibleRange();



                var sizeFactor =that.ctrl_SizeFactor.getValue();
                var opacity = that.ctrl_Opacity.getValue();
                var outline = that.ctrl_Outline.getValue();

                if (valColorCat) {
                    //Prepare color category strings
                    var colorStrings = [];
                    $.each(that.mappedColors, function(idx, color) {
                        colorStrings.push(color.changeOpacity(opacity).toStringCanvas());
                    });
                }


                // Draw points
                ctx.fillStyle = ctx.strokeStyle = DQX.Color(0,0,0).changeOpacity(opacity).toStringCanvas();
                var selectionMap = that.tableInfo.currentSelection;
                var selpsX = [];
                var selpsY = [];

                var smallPoints = (!valSize)&&(!valStyle)&&(sizeFactor<0.05);
                var sortIndex = that.sortIndex;
                var ptcount = valX.length;



                if (smallPoints) {
                    for (var i=0; i<ptcount; i++) {
                        var ii = sortIndex[i];
                        var vlx = valX[ii];
                        var vly = valY[ii];
                        if ( (vlx!=null) && (vly!=null) && (vlx>=plotLimitXMin) && (vlx<=plotLimitXMax) && (vly>=plotLimitYMin) && (vly<=plotLimitYMax) ) {
                            var px = Math.round(vlx * scaleX + offsetX);
                            var py = Math.round(vly * scaleY + offsetY);
                            if (valColorCat) {
                                ctx.strokeStyle = colorStrings[valColorCat[ii]];
                            }
                            if (selectionMap[ids[ii]]) {
                                selpsX.push(px);
                                selpsY.push(py);
                            }
                            ctx.beginPath();
                            ctx.moveTo(px - 2, py - 0.5);
                            ctx.lineTo(px + 1, py - 0.5);
                            ctx.moveTo(px - 0.5, py - 2);
                            ctx.lineTo(px - 0.5, py + 1);
                            ctx.stroke();
                        }
                    }
                }

                if ((!smallPoints) && (!valSize)) {
                    var pointSize = 2*sizeFactor;
                    for (var i=0; i<ptcount; i++) {
                        var ii = sortIndex[i];
                        var vlx = valX[ii];
                        var vly = valY[ii];
                        if ( (vlx!=null) && (vly!=null) && (vlx>=plotLimitXMin) && (vlx<=plotLimitXMax) && (vly>=plotLimitYMin) && (vly<=plotLimitYMax) ) {
                            var px = /*Math.round*/(vlx * scaleX + offsetX);
                            var py = /*Math.round*/(vly * scaleY + offsetY);
                            if (valColorCat) {
                                ctx.fillStyle = ctx.strokeStyle = colorStrings[valColorCat[ii]];
                            }
                            if (selectionMap[ids[ii]]) {
                                selpsX.push(px);
                                selpsY.push(py);
                            }
                            if ((!valStyle)||(!that.styleMapper)) {
                                ctx.beginPath();
                                ctx.arc(px, py, pointSize, 0, 2 * Math.PI, false);
                                ctx.closePath();
                                outline ? ctx.stroke() : ctx.fill();
                            }
                            else {
                                var mppr = that.styleMapper[valStyle[ii]];
                                if (mppr) {
                                    mppr.drawer(ctx, px, py, pointSize*3);
                                    outline ? ctx.stroke() : ctx.fill();
                                }
                            }
                        }
                    }
                }

                if (!valColorCat) {
                    ctx.fillStyle=DQX.Color(1,0,0,0.25*(0.5+0.5*opacity)).toStringCanvas();
                    ctx.strokeStyle=DQX.Color(1,0,0,0.75*(0.5+0.5*opacity)).toStringCanvas();
                }
                else
                {
                    ctx.fillStyle=DQX.Color(0,0,0,0.0*(0.5+0.5*opacity)).toStringCanvas();
                    ctx.strokeStyle=DQX.Color(0,0,0,1.0*(0.5+0.5*opacity)).toStringCanvas();
                }
                for (var i=0; i<selpsX.length; i++) {
                    ctx.beginPath();
                    ctx.arc(selpsX[i], selpsY[i], 2*sizeFactor+2, 0, 2 * Math.PI, false);
                    ctx.closePath();
                    if (!outline)
                        ctx.fill();
                    ctx.stroke();
                }

                if (valSize) {
                    ctx.fillStyle=DQX.Color(0.8,0.8,0.8,opacity).toStringCanvas();
                    ctx.strokeStyle=DQX.Color(0.5,0.5,0.5,opacity).toStringCanvas();
                    var sizeMin = that.mapPlotAspects['size'].minval;
                    var sizeMax = that.mapPlotAspects['size'].maxval;
                    for (var i=0; i<ptcount; i++) {
                        var ii = sortIndex[i];
                        if ( (valX[ii]!=null) && (valY[ii]!=null) ) {
                            var px = /*Math.round*/(valX[ii] * scaleX + offsetX);
                            var py = /*Math.round*/(valY[ii] * scaleY + offsetY);
                            var rd = Math.max(0.1, ((valSize[ii]-sizeMin)/(sizeMax-sizeMin)*10+2) * sizeFactor);
                            if (valColorCat) {
                                ctx.fillStyle=colorStrings[valColorCat[ii]];
                            }
                            if (!valStyle) {
                                ctx.beginPath();
                                ctx.arc(px, py, rd, 0, 2 * Math.PI, false);
                                ctx.closePath();
                                if (!outline)
                                    ctx.fill();
                                ctx.stroke();
                            }
                            else {
                                that.styleMapper[valStyle[ii]].drawer(ctx, px, py, rd);
                                if (!outline)
                                    ctx.fill();
                                ctx.stroke();
                            }
                        }
                    }
                }

                that.plotPresent = true;
            };


            that.storeCustomSettings = function() {
//                var sett = {};
//                if (that.plotPresent) {
//                    sett.xScaler = that.panelPlot.xScaler.store();
//                    sett.yScaler = that.panelPlot.yScaler.store();
//                }
//                return sett;
            };

            that.recallCustomSettings = function(sett) {
//  does not work because scaler info is reset after retrieval of data...
//                if (sett.xScaler)
//                    that.panelPlot.xScaler.recall(sett.xScaler);
//                if (sett.yScaler)
//                    that.panelPlot.yScaler.recall(sett.yScaler);
            };

            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.plotPresent) return;
                scaleX = that.scaleX; offsetX = that.offsetX;
                scaleY = that.scaleY; offsetY = that.offsetY;
                var ids =that.mapPlotAspects['id'].data;
                var aspectX = that.mapPlotAspects['xaxis'];
                var aspectY = that.mapPlotAspects['yaxis'];
                var valX = aspectX.data;
                var valY = aspectY.data;
                var mindst=10;
                var bestidx = -1;
                for (var i=0; i<valX.length; i++) {
                    if ( (valX[i]!=null) && (valY[i]!=null) ) {
                        var px = valX[i] * scaleX + offsetX;
                        var py = valY[i] * scaleY + offsetY;
                        var dst=Math.abs(px-px0) + Math.abs(py-py0);
                        if (dst<=mindst) {
                            mindst=dst;
                            bestidx = i;
                        }
                    }
                }
                if (bestidx<0) return null;
                var str ='';
                $.each(that.plotAspects, function(idx, plotAspect) {
                    if (plotAspect.data) {
                        var propInfo = MetaData.findProperty(that.tableInfo.id,plotAspect.propid);
                        if (str.length>0) str += '<br>';
                        if (plotAspect.id=='label') str +='<b>';
                        str += propInfo.name+': '+propInfo.toDisplayString(plotAspect.data[bestidx]);
                        if (plotAspect.id=='label') str +='</b>';
                    }
                });
                return {
                    itemid: ids[bestidx],
                    ID: 'IDX'+bestidx,
                    px: valX[bestidx] * scaleX + offsetX,
                    py: valY[bestidx] * scaleY + offsetY,
                    showPointer:true,
                    content: str
                };
            };

            that.onMouseClick = function(ev, info) {
                var tooltip = that.getToolTipInfo(info.x, info.y);
                if (tooltip) {
                    Msg.send({ type: 'ItemPopup' }, { tableid: that.tableInfo.id, itemid: tooltip.itemid } );
                }
            }

            that.onSelected = function(minX, minY, maxX, maxY, shiftPressed, controlPressed, altPressed) {
                if (!that.plotPresent) return;
                var ids =that.mapPlotAspects['id'].data;
                var aspectX = that.mapPlotAspects['xaxis'];
                var aspectY = that.mapPlotAspects['yaxis'];
                var valX = aspectX.data;
                var valY = aspectY.data;

                var rangeXMin = (minX-that.offsetX)/that.scaleX;
                var rangeXMax = (maxX-that.offsetX)/that.scaleX;
                var rangeYMin = (maxY-that.offsetY)/that.scaleY;
                var rangeYMax = (minY-that.offsetY)/that.scaleY;

                var qry = that.theQuery.get();
                qry = SQL.WhereClause.createRangeRestriction(qry, aspectX.propid, rangeXMin, rangeXMax);
                qry = SQL.WhereClause.createRangeRestriction(qry, aspectY.propid, rangeYMin, rangeYMax);


                var content = 'X Range: '+rangeXMin+' - '+rangeXMax+'<br>';
                content += 'Y Range: '+rangeYMin+' - '+rangeYMax+'<br>';


                var selectionCreationFunction = function() {
                    var sellist = [];
                    for (var i=0; i<valX.length; i++) {
                        if ( (valX[i]!=null) && (valY[i]!=null) ) {
                            var px = valX[i] * scaleX + offsetX;
                            var py = valY[i] * scaleY + offsetY;
                            if ((px>=minX) && (px<=maxX) && (py>minY) && (py<=maxY)) {
                                sellist.push(ids[i]);
                            }
                        }
                    }
                    return sellist;
                };

                ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Scatter plot area', content, {
                    query: qry,
                    subSamplingOptions: that.theQuery.getSubSamplingOptions()
                }, selectionCreationFunction);

/*
                var doSelect = function(tpe) {
                    if (tpe==0)
                        that.tableInfo.currentSelection = {};
                    for (var i=0; i<valX.length; i++) {
                        if ( (valX[i]!=null) && (valY[i]!=null) ) {
                            var px = valX[i] * scaleX + offsetX;
                            var py = valY[i] * scaleY + offsetY;
                            if ((px>=minX) && (px<=maxX) && (py>minY) && (py<=maxY)) {
                                if (tpe!=3)
                                    that.tableInfo.currentSelection[ids[i]] = true;
                                else
                                    delete that.tableInfo.currentSelection[ids[i]];
                            }
                        }
                    }
                    Msg.broadcast({type:'SelectionUpdated'}, that.tableInfo.id);
                }
*/

            }





            that.create();
            return that;
        }



        return ItemScatterPlot;
    });


