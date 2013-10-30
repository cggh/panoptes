define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

        var ItemScatterPlot = {};





        ItemScatterPlot.Create = function(tableid) {
            var tableInfo = MetaData.mapTableCatalog[tableid];
            var that = PopupFrame.PopupFrame(tableInfo.name + ' scatterplot', {title:'Scatter plot', blocking:false, sizeX:700, sizeY:550 });
            that.tableInfo = tableInfo;
            that.query = SQL.WhereClause.Trivial();
            if (tableInfo.currentQuery)
                that.query = tableInfo.currentQuery;
            that.fetchCount = 0;
            that.propDataMap = {};

            that.plotAspects = [
                { id: 'id', name: 'ID', datatype: 'Text', propid: that.tableInfo.primkey, data: null, visible:false, required:true },
                { id: 'xaxis', name: 'X axis', datatype: 'Value', propid: null, data: null, visible:true, required:true },
                { id: 'yaxis', name: 'Y axis', datatype: 'Value', propid: null, data: null, visible:true, required:true },
                { id: 'color', name: 'Point color', datatype: 'Category', propid: null, visible:true, data: null },
                { id: 'size', name: 'Point size', datatype: 'Value', propid: null, visible:true, data: null },
                { id: 'style', name: 'Point style', datatype: 'Category', propid: null, visible:true, data: null },
                { id: 'label', name: 'Hover label', datatype: '', propid: null, visible:true, data: null },
            ];

            that.mapPlotAspects = {};
            $.each(that.plotAspects, function(idx, aspect) {
                that.mapPlotAspects[aspect.id] = aspect;
            });

            that.eventids = [];

            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid,{ type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid)
                    that.reDraw();
            } );

            that.onClose = function() {
                $.each(that.eventids,function(idx,eventid) {
                    Msg.delListener(eventid);
                });
            };



            that.createFrames = function() {
                that.frameRoot.makeGroupHor();
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setAllowScrollBars(false,true);
                that.framePlot = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(false,false);
            };

            that.createPanels = function() {
                that.panelPlot = FrameCanvas(that.framePlot);
                that.panelPlot.draw = that.draw;
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
                that.panelButtons = Framework.Form(that.frameButtons).setPadding(5);

                var buttonDefineQuery = Controls.Button(null, { content: 'Define query...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: DQX.BMP('filter1.png') });
                buttonDefineQuery.setOnChanged(function() {
                    EditQuery.CreateDialogBox(that.tableInfo.id, that.query, function(query) {
                        that.query = query;
                        that.ctrlQueryString.modifyValue(tableInfo.tableViewer.getQueryDescription(query));
                        that.reloadAll();
                    });
                });

                that.ctrlQueryString = Controls.Html(null,tableInfo.tableViewer.getQueryDescription(that.query));

                var pickControls = Controls.CompoundGrid();
                $.each(that.plotAspects,function(aspectIdx, plotAspect) {
                    if (plotAspect.visible) {
                        var propList = [ {id:'', name:'-- None --'}];
                        $.each(MetaData.customProperties, function(idx, prop) {
                            var included = false;
                            if (prop.tableid==that.tableInfo.id) {
                                if ( (prop.datatype==plotAspect.datatype) || (!plotAspect.datatype) )
                                    included = true;
                                if ((plotAspect.datatype=='Category') && ( (prop.datatype=='Text') || (prop.datatype=='Boolean') ) )
                                    included = true;
                            }
                            if (included)
                                propList.push({ id:prop.propid, name:prop.name });
                        });
                        plotAspect.picker = Controls.Combo(null,{ label:'', states: propList }).setOnChanged( function() { that.fetchData(plotAspect.id)} );
                        pickControls.setItem(aspectIdx, 0, Controls.Static(plotAspect.name+':'));
                        pickControls.setItem(aspectIdx, 1, plotAspect.picker);
                        //controls.push(Controls.VerticalSeparator(7));
                    }
                });

                that.colorLegend = Controls.Html(null,'');

                that.panelButtons.addControl(Controls.CompoundVert([
                    buttonDefineQuery,
                    that.ctrlQueryString,
                    Controls.VerticalSeparator(20),
                    pickControls,
                    that.colorLegend
                ]));

                that.fetchData('id');
            };


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
                if (aspectInfo.propid) {
                    var propInfo = MetaData.findProperty(that.tableInfo.id,aspectInfo.propid);
                    if (that.propDataMap[aspectInfo.propid]) {
                        aspectInfo.data = that.propDataMap[aspectInfo.propid];
                        that.processAspectData(plotAspectID);
                        that.panelPlot.invalidate();
                    }
                    else {
                        var fetcher = DataFetchers.RecordsetFetcher(MetaData.serverUrl, MetaData.database, that.tableInfo.id + 'CMB_' + MetaData.workspaceid);
                        fetcher.setMaxResultCount(999999);
                        var encoding='ST';
                        if (propInfo.datatype=='Value')
                            encoding = 'F3';
                        if (propInfo.datatype=='Boolean')
                            encoding = 'GN';
                        fetcher.addColumn(aspectInfo.propid, encoding);
                        that.fetchCount += 1;
                        that.panelPlot.invalidate();
                        var requestID = DQX.getNextUniqueID();
                        aspectInfo.requestID = requestID;
                        fetcher.getData(that.query, that.tableInfo.primkey, function (data) {
                            that.fetchCount -= 1;
                            if (aspectInfo.requestID != requestID) {//request must be outdated, so we don't handle it
                                return;
                            }
                            aspectInfo.data = data[aspectInfo.propid];
                            that.propDataMap[aspectInfo.propid] = aspectInfo.data;
                            that.processAspectData(plotAspectID);
                            that.panelPlot.invalidate();
                        });
                    }
                }
                else {
                    that.processAspectData(plotAspectID);
                    that.panelPlot.invalidate();
                }
            };

            that.processAspectData = function(plotAspectID) {
                var aspectInfo = that.mapPlotAspects[plotAspectID];
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
                    aspectInfo.maxval += range/20;
                    aspectInfo.minval -= range/20;
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
                        var maxCatCount = DQX.standardColors.length-1;
                        var catMap = {};
                        var catData = [];
                        var catCount = 0;
                        for (var i=0; i<values.length; i++) {
                            if (values[i] in catMap)
                                catData.push(catMap[values[i]])
                            else {
                                if (catCount<maxCatCount) {
                                    catMap[values[i]] = catCount;
                                    catData.push(catCount);
                                    catCount++;
                                }
                                else
                                    catData.push(maxCatCount);
                            }
                        }
                        aspectInfo.catData = catData;
                        $.each(catMap,function(key,value) {
                            legendStr+='<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}<br>'.DQXformat({cl:DQX.standardColors[value].toString(), name:key});
                        });
                    }
                    that.colorLegend.modifyValue(legendStr);
                }
            }

            that.draw = function(drawInfo) {
                if (that.panelPlot._directRedraw)
                    that.drawImpl(drawInfo);
                else
                    DQX.executeProcessing(function() { that.drawImpl(drawInfo); });
            }

            that.drawImpl = function(drawInfo) {
                that.plotPresent = false;
                var ctx = drawInfo.ctx;
                if (that.fetchCount > 0) {
                    ctx.font="20px Arial";
                    ctx.fillStyle="rgb(140,140,140)";
                    ctx.fillText("Fetching data ...",10,50);
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
                var scaleX = (drawInfo.sizeX-marginX) / (aspectX.maxval - aspectX.minval);
                var offsetX = marginX - aspectX.minval*scaleX;
                var scaleY = - (drawInfo.sizeY-marginY) / (aspectY.maxval - aspectY.minval);
                var offsetY = (drawInfo.sizeY-marginY) - aspectY.minval*scaleY;
                that.scaleX = scaleX; that.offsetX = offsetX;
                that.scaleY = scaleY; that.offsetY = offsetY;

                // Draw x scale
                ctx.save();
                ctx.font="12px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scale = DQX.DrawUtil.getScaleJump(20/scaleX);
                for (var i=Math.ceil(aspectX.minval/scale.Jump1); i<=Math.floor(aspectX.maxval/scale.Jump1); i++) {
                    var vl = i*scale.Jump1;
                    var px = Math.round(vl * scaleX + offsetX)-0.5;
                    ctx.strokeStyle = "rgb(230,230,230)";
                    if (i%scale.JumpReduc==0)
                        ctx.strokeStyle = "rgb(190,190,190)";
                    ctx.beginPath();
                    ctx.moveTo(px,0);
                    ctx.lineTo(px,drawInfo.sizeY-marginY);
                    ctx.stroke();
                    if (i%scale.JumpReduc==0) {
                        ctx.fillText(vl.toFixed(scale.textDecimalCount),px,drawInfo.sizeY-marginY+13);
                    }
                }
                ctx.restore();

                // Draw y scale
                ctx.save();
                ctx.font="12px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scale = DQX.DrawUtil.getScaleJump(20/Math.abs(scaleY));
                for (var i=Math.ceil(aspectY.minval/scale.Jump1); i<=Math.floor(aspectY.maxval/scale.Jump1); i++) {
                    var vl = i*scale.Jump1;
                    var py = Math.round(vl * scaleY + offsetY)-0.5;
                    ctx.strokeStyle = "rgb(230,230,230)";
                    if (i%scale.JumpReduc==0)
                        ctx.strokeStyle = "rgb(190,190,190)";
                    ctx.beginPath();
                    ctx.moveTo(marginX,py);
                    ctx.lineTo(drawInfo.sizeX,py);
                    ctx.stroke();
                    if (i%scale.JumpReduc==0) {
                        ctx.save();
                        ctx.translate(marginX-5,py);
                        ctx.rotate(-Math.PI/2);
                        ctx.fillText(vl.toFixed(scale.textDecimalCount),0,0);
                        ctx.restore();
                    }
                }
                ctx.restore();


                // Draw points
                ctx.fillStyle="#000000";
                ctx.strokeStyle="#000000";
                var selectionMap = that.tableInfo.currentSelection;
                var selpsX = [];
                var selpsY = [];

                var smallPoints = (!valSize)&&(valX.length>10000);
                var sortIndex = that.sortIndex;
                var ptcount = valX.length;

                if (smallPoints) {
                    for (var i=0; i<ptcount; i++) {
                        var ii = sortIndex[i];
                        if ( (valX[ii]!=null) && (valY[ii]!=null) ) {
                            var px = Math.round(valX[ii] * scaleX + offsetX);
                            var py = Math.round(valY[ii] * scaleY + offsetY);
                            if (valColorCat) {
                                ctx.strokeStyle=DQX.standardColors[valColorCat[ii]].toStringCanvas();
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
                    for (var i=0; i<ptcount; i++) {
                        var ii = sortIndex[i];
                        if ( (valX[ii]!=null) && (valY[ii]!=null) ) {
                            var px = /*Math.round*/(valX[ii] * scaleX + offsetX);
                            var py = /*Math.round*/(valY[ii] * scaleY + offsetY);
                            if (valColorCat) {
                                ctx.fillStyle=DQX.standardColors[valColorCat[ii]].toStringCanvas();
                                ctx.strokeStyle=DQX.standardColors[valColorCat[ii]].toStringCanvas();
                            }
                            if (selectionMap[ids[ii]]) {
                                selpsX.push(px);
                                selpsY.push(py);
                            }
                            ctx.beginPath();
                            ctx.arc(px, py, 2, 0, 2 * Math.PI, false);
                            ctx.closePath();
                            ctx.fill();
                            ctx.stroke();
                        }
                    }
                }

                ctx.fillStyle='rgba(255,0,0,0.25)';
                ctx.strokeStyle='rgba(255,0,0,0.75)';
                for (var i=0; i<selpsX.length; i++) {
                    ctx.beginPath();
                    ctx.arc(selpsX[i], selpsY[i], 4, 0, 2 * Math.PI, false);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }

                if (valSize) {
                    ctx.fillStyle='rgb(220,220,220)';
                    ctx.strokeStyle='rgb(128,128,128)';
                    var sizeMin = that.mapPlotAspects['size'].minval;
                    var sizeMax = that.mapPlotAspects['size'].maxval;
                    for (var i=0; i<ptcount; i++) {
                        var ii = sortIndex[i];
                        if ( (valX[ii]!=null) && (valY[ii]!=null) ) {
                            var px = /*Math.round*/(valX[ii] * scaleX + offsetX);
                            var py = /*Math.round*/(valY[ii] * scaleY + offsetY);
                            var rd = (valSize[ii]-sizeMin)/(sizeMax-sizeMin)*10+2;
                            if (valColorCat) {
                                ctx.fillStyle=DQX.standardColors[valColorCat[ii]].toStringCanvas();
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
                if ((!shiftPressed)&&(!controlPressed))
                    that.tableInfo.currentSelection = {};
                for (var i=0; i<valX.length; i++) {
                    if ( (valX[i]!=null) && (valY[i]!=null) ) {
                        var px = valX[i] * scaleX + offsetX;
                        var py = valY[i] * scaleY + offsetY;
                        if ((px>=minX) && (px<=maxX) && (py>minY) && (py<=maxY)) {
                            if (!controlPressed)
                                that.tableInfo.currentSelection[ids[i]] = true;
                            else
                                delete that.tableInfo.currentSelection[ids[i]];
                        }
                    }
                }
                Msg.broadcast({type:'SelectionUpdated'}, that.tableInfo.id);
            }





            that.create();
            return that;
        }



        return ItemScatterPlot;
    });


