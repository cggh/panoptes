define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers",
    "Wizards/EditQuery", "MetaData", "Utils/QueryTool", "Plots/GenericPlot", "Plots/StandardLayoutPlot", "Utils/ButtonChoiceBox", "Utils/MiscUtils"
],
    function (
        require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers,
        EditQuery, MetaData, QueryTool, GenericPlot, StandardLayoutPlot, ButtonChoiceBox, MiscUtils
        ) {

        var ItemScatterPlot = {};

        ItemScatterPlot.typeID = 'scatterplot';
        ItemScatterPlot.name = 'Scatter plot';
        ItemScatterPlot.description= 'Takes <b>two numerical properties</b> and plot the {items} as points on a X-Y chart. Optionally, the colour and size of the points can be controlled by other properties.';
        ItemScatterPlot.isCompatible = function(tableInfo) {
            return true;
        }



        GenericPlot.registerPlotType(ItemScatterPlot);

        ItemScatterPlot.Create = function(tableid, startQuery) {
            var that = StandardLayoutPlot.Create(tableid, ItemScatterPlot.typeID, {title: ItemScatterPlot.name }, startQuery);
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
                that.panelPlot = FrameCanvas(that.framePlot);
                that.panelPlot.draw = that.draw;
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
            }



            that.createPanelButtons = function() {
                that.ctrl_PointCount = Controls.Html(null, '');
                var ctrl_Query = that.theQuery.createControl([that.ctrl_PointCount]);


                var pickControls = Controls.CompoundGrid();
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
                                propList.push({ id:prop.propid, name:prop.name });
                        });
                        plotAspect.picker = Controls.Combo(null, { label:'', states: propList }).setClassID(plotAspect.id).setOnChanged( function() { that.fetchData(plotAspect.id)} );
                        pickControls.setItem(aspectIdx, 0, Controls.Static(plotAspect.name+':'));
                        pickControls.setItem(aspectIdx, 1, plotAspect.picker);
                        //controls.push(Controls.VerticalSeparator(7));
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

                var cmdPointSelection = Controls.Button(null, { content: 'Select points...', buttonClass: 'PnButtonSmall'}).setOnChanged(function () {

                    var actions = [];

                    actions.push( { content:'Lasso selection', bitmap:'Bitmaps/circle_red_small.png', handler:function() {
                        that.panelPlot.startLassoSelection(function(selectedPoints) {

                            function isPointInPoly(poly, pt) {
                                for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
                                    ((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
                                        && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
                                    && (c = !c);
                                return c;
                            }

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
                            ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Scatterplot area', content, null, selectionCreationFunction);
                        });
                    }
                    });

                    actions.push( { content:'Half plane selection', bitmap:'Bitmaps/circle_red_small.png', handler:function() {
                        that.panelPlot.startHalfPlaneSelection(function(center, dir) {
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
                            ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Half plane', '', queryInfo.query, selectionCreationFunction);
                        });
                    }
                    });

                    ButtonChoiceBox.create('Select points','', [actions]);

                });


                that.colorLegend = Controls.Html(null,'');

                var controlsGroup = Controls.CompoundVert([
                    ctrl_Query,

                    Controls.Section(pickControls, {
                        title: 'Plot data',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrl_SizeFactor,
                        that.ctrl_Opacity,
                        cmdPointSelection
                    ]).setMargin(10), {
                        title: 'Layout',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        that.colorLegend
                    ]), {
                        title: 'Color legend',
                        bodyStyleClass: 'ControlsSectionBody'
                    })

                ]);
                that.addPlotSettingsControl('controls',controlsGroup);
                that.panelButtons.addControl(controlsGroup);

                //that.fetchData('id');
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
                        if (propInfo.isFloat)
                            encoding = 'F3';
                        if (propInfo.isInt)
                            encoding = 'IN';
                        if (propInfo.isBoolean)
                            encoding = 'GN';
                        fetcher.addColumn(aspectInfo.propid, encoding);
                        that.panelPlot.invalidate();
                        var requestID = DQX.getNextUniqueID();
                        aspectInfo.requestID = requestID;
                        that.fetchCount += 1;
                        fetcher.getData(that.theQuery.getForFetching(), that.tableInfo.primkey,
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

                if (plotAspectID=='color') {// Create categorical data
                    aspectInfo.catData = null;
                    var legendStr = '';
                    if (values) {
                        var maprs = MetaData.findProperty(that.tableInfo.id,aspectInfo.propid).mapColors(values);
                        aspectInfo.catData = maprs.indices;
                        that.mappedColors = maprs.colors;
                        $.each(maprs.legend,function(idx, legendItem) {
                            legendStr+='<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}<br>'.DQXformat({cl:legendItem.color.toString(), name:legendItem.state});
                        });
                    }
                    that.colorLegend.modifyValue(legendStr);
                }
            }

            that.draw = function(drawInfo) {
                that.drawImpl(drawInfo);
            }

            that.drawImpl = function(drawInfo) {
                that.plotPresent = false;
                var ctx = drawInfo.ctx;
                ctx.fillStyle="#FFFFFF";
                ctx.fillRect(0, 0, drawInfo.sizeX,  drawInfo.sizeY);
                if (that.fetchCount > 0) {
                    ctx.font="20px Arial";
                    ctx.fillStyle="rgb(140,140,140)";
                    ctx.fillText("Fetching data ... "+that.fetchCount,10,50);
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
                    ctx.fillText("Please provide data for "+missingAspects.join(', '),10,50);
                    return;
                }

                var marginX = 40;
                var marginY = 40;
                ctx.fillStyle="rgb(220,220,220)";
                ctx.fillRect(0,0,marginX,drawInfo.sizeY);
                ctx.fillRect(0,drawInfo.sizeY-marginY,drawInfo.sizeX,marginY);

                var ids = that.mapPlotAspects['id'].data;
                var aspectX = that.mapPlotAspects['xaxis'];
                var aspectY = that.mapPlotAspects['yaxis'];
                var valX = aspectX.data;
                var valY = aspectY.data;
                var valColorCat = that.mapPlotAspects['color'].catData;
                var valSize = that.mapPlotAspects['size'].data;
                var scaleX = (drawInfo.sizeX-marginX) / aspectX.safeRange;
                var offsetX = marginX - aspectX.minval*scaleX;
                var scaleY = - (drawInfo.sizeY-marginY) / aspectY.safeRange;
                var offsetY = (drawInfo.sizeY-marginY) - aspectY.minval*scaleY;
                that.scaleX = scaleX; that.offsetX = offsetX;
                that.scaleY = scaleY; that.offsetY = offsetY;

                // Draw x scale
                ctx.save();
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scaleTicks = MiscUtils.createPropertyScale(that.tableInfo.id, aspectX.propid, scaleX, aspectX.minval, aspectX.maxval);
                $.each(scaleTicks, function(idx, tick) {
                    var px = Math.round(tick.value * scaleX + offsetX)-0.5;
                    if (tick.label) {
                        ctx.fillText(tick.label,px,drawInfo.sizeY-marginY+13);
                        if (tick.label2)
                            ctx.fillText(tick.label2,px,drawInfo.sizeY-marginY+23);
                        ctx.strokeStyle = "rgb(190,190,190)";
                    }
                    else {
                        ctx.strokeStyle = "rgb(230,230,230)";
                    }
                    ctx.beginPath();
                    ctx.moveTo(px,0);
                    ctx.lineTo(px,drawInfo.sizeY-marginY);
                    ctx.stroke();

                });
                ctx.restore();

                // Draw y scale
                ctx.save();
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scaleTicks = MiscUtils.createPropertyScale(that.tableInfo.id, aspectY.propid, Math.abs(scaleY), aspectY.minval, aspectY.maxval);
                $.each(scaleTicks, function(idx, tick) {
                    var py = Math.round(tick.value * scaleY + offsetY)-0.5;
                    if (tick.label) {
                        ctx.save();
                        ctx.translate(marginX-5,py);
                        ctx.rotate(-Math.PI/2);
                        if (!tick.label2)
                            ctx.fillText(tick.label,0,0);
                        else {
                            ctx.fillText(tick.label,0,-10);
                            ctx.fillText(tick.label2,0,0);
                        }
                        ctx.restore();
                        ctx.strokeStyle = "rgb(190,190,190)";
                    }
                    else {
                        ctx.strokeStyle = "rgb(230,230,230)";
                    }
                    ctx.beginPath();
                    ctx.moveTo(marginX,py);
                    ctx.lineTo(drawInfo.sizeX,py);
                    ctx.stroke();

                });
                ctx.restore();

                var sizeFactor =that.ctrl_SizeFactor.getValue();
                var opacity = that.ctrl_Opacity.getValue();

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

                var smallPoints = (!valSize)&&(sizeFactor<0.05);
                var sortIndex = that.sortIndex;
                var ptcount = valX.length;



                if (smallPoints) {
                    for (var i=0; i<ptcount; i++) {
                        var ii = sortIndex[i];
                        if ( (valX[ii]!=null) && (valY[ii]!=null) ) {
                            var px = Math.round(valX[ii] * scaleX + offsetX);
                            var py = Math.round(valY[ii] * scaleY + offsetY);
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
                        if ( (valX[ii]!=null) && (valY[ii]!=null) ) {
                            var px = /*Math.round*/(valX[ii] * scaleX + offsetX);
                            var py = /*Math.round*/(valY[ii] * scaleY + offsetY);
                            if (valColorCat) {
                                ctx.fillStyle = ctx.strokeStyle = colorStrings[valColorCat[ii]];
                            }
                            if (selectionMap[ids[ii]]) {
                                selpsX.push(px);
                                selpsY.push(py);
                            }
                            ctx.beginPath();
                            ctx.arc(px, py, pointSize, 0, 2 * Math.PI, false);
                            ctx.closePath();
                            ctx.fill();
                            //ctx.stroke();
                        }
                    }
                }

                ctx.fillStyle=DQX.Color(1,0,0,0.25*opacity).toStringCanvas();
                ctx.strokeStyle=DQX.Color(1,0,0,0.75*opacity).toStringCanvas();
                for (var i=0; i<selpsX.length; i++) {
                    ctx.beginPath();
                    ctx.arc(selpsX[i], selpsY[i], 2*sizeFactor+2, 0, 2 * Math.PI, false);
                    ctx.closePath();
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
                            var rd = ((valSize[ii]-sizeMin)/(sizeMax-sizeMin)*10+2) * sizeFactor;
                            if (valColorCat) {
                                ctx.fillStyle=colorStrings[valColorCat[ii]];
                            }
                            ctx.beginPath();
                            ctx.arc(px, py, rd, 0, 2 * Math.PI, false);
                            ctx.closePath();
                            ctx.fill();
                            ctx.stroke();
                        }
                    }
                }

                that.plotPresent = true;
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

/*
                var bt1 = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Show items in range in table",  width:120, height:30 }).setOnChanged(function() {
                    var tableView = Application.getView('table_'+that.tableInfo.id);
                    tableView.activateWithQuery(qry);
                    Popup.closeIfNeeded(popupid);
                });

                var bt2 = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Restrict plot dataset to range",  width:120, height:30 }).setOnChanged(function() {
                    that.setActiveQuery(qry);
                    Popup.closeIfNeeded(popupid);
                });

                */
/*
                buttonsRow1 = [];

                buttonsRow1.push( { content:'Select<br>(REPLACE)', bitmap:'Bitmaps/venn2.png', handler:function() {
                    doSelect(0);
                }
                });

                buttonsRow1.push( { content:'Select<br>(ADD)', bitmap:'Bitmaps/venn3.png', handler:function() {
                    doSelect(2);
                }
                });

                buttonsRow1.push( { content:'Select<br>(NARROW)', bitmap:'Bitmaps/venn1.png', handler:function() {
                    doSelect(3);
                }
                });

                buttonsRow2 = [];

                buttonsRow2.push( { content:'Restrict plot query', bitmap: DQX.BMP('filter1.png'), handler: function() {
                    that.setActiveQuery(qry);
                }
                } );
*/

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

                ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Scatter plot area', content, qry, selectionCreationFunction);

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





            that.theQuery.notifyQueryUpdated = that.updateQuery;
            that.create();
            return that;
        }



        return ItemScatterPlot;
    });


