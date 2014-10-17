// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers",
    "Wizards/EditQuery", "MetaData", "Utils/QueryTool", "Plots/GenericPlot", "Plots/StandardLayoutPlot", "Utils/ButtonChoiceBox", "Utils/MiscUtils"
],
    function (
        require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers,
        EditQuery, MetaData, QueryTool, GenericPlot, StandardLayoutPlot, ButtonChoiceBox, MiscUtils
        ) {

        var Histogram2D = {};

        Histogram2D.typeID = 'histogram2d';
        Histogram2D.name = '2D Histogram';
        Histogram2D.description= 'Takes <b>two numerical properties</b>, bins the values, and plots the number of {items} in each cell as a colour density.';
        Histogram2D.isCompatible = function(tableInfo) {
            return true;
        }

        Histogram2D.plotAspects = [
            { id:'xvalue', name:'X value', dataType:'Value', requiredLevel: 2 },
            { id:'yvalue', name:'Y value', dataType:'Value', requiredLevel: 2 }
        ];

        var paletteList = ['Gray', 'Gray (inverted)', 'Rainbow 1', 'Rainbow 2', 'Heath'];

        function getPaletteColor(name,fr) {
            if (fr<0) fr=0;
            if (fr>1) fr=1;
            if (name=='Gray (inverted)')
                return DQX.Color(fr,fr,fr);

            if (name=='Rainbow 1') {
                var cl = DQX.HSL2Color(0.5-fr*0.75,1,0.5);
                return cl;
            }

            if (name=='Rainbow 2') {
                var cl = DQX.HSL2Color(0.5-fr*0.75,1,0.5);
                if (fr<0.2)
                    cl=cl.lighten(1-fr/0.2);
                return cl;
            }

            if (name=='Heath') {
                if (fr>0)
                    fr = (fr +0.07)/0.93;
                return DQX.Color(1-Math.pow(Math.max(fr-0.66,0)/(1-0.66),2),1-Math.pow(Math.max(fr-0.33,0)/(1-0.33),0.8),1-Math.pow(fr,0.6));
            }


            return DQX.Color(1-fr,1-fr,1-fr);
        }



        Histogram2D.Create = function(tableid, startQuery, querySettings, plotSettings) {
            var that = StandardLayoutPlot.Create(tableid, Histogram2D.typeID, {title: Histogram2D.name}, startQuery, querySettings, plotSettings);
            that.fetchCount = 0;
            that.showRelative = false;


            that.barW = 16;
            that.scaleW = 100;
            that.textH = 130;


            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid,{ type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid)
                    that.reDraw();
            } );


            that.createPanelPlot = function() {
                that.panelPlot = FrameCanvas(that.framePlot);
                that.panelPlot.draw = that.draw;
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
            }

            that.createPanelButtons = function() {
                that.ctrl_PointCount = Controls.Html(null, '');


                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.isFloat) ) )
                        propList.push({ id:prop.propid, name:prop.name, group:prop.group.Name });
                });
                that.ctrlValueXProperty = Controls.Combo(null,{ label:'X Value:<br>', states: propList, value:that.providedAspect2Property('xvalue') }).setClassID('xvalue');
                that.ctrlValueXProperty.setOnChanged(function() {
                    that.fetchData();
                });
                that.ctrlValueYProperty = Controls.Combo(null,{ label:'Y Value:<br>', states: propList, value:that.providedAspect2Property('yvalue') }).setClassID('yvalue');
                that.ctrlValueYProperty.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrl_binsizeAutomatic = Controls.Check(null,{label:'Automatic', value:true}).setClassID('autobinsize').setOnChanged(function() {
                    that.ctrl_binsizeValueX.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    that.ctrl_binsizeValueY.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    that.ctrl_binsizeUpdate.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    if (that.ctrl_binsizeAutomatic.getValue())
                        that.fetchData();
                });

                that.ctrl_binsizeValueX = Controls.Edit(null,{size:10, label:'X:'}).setClassID('binsizex').modifyEnabled(false);
                that.ctrl_binsizeValueY = Controls.Edit(null,{size:10, label:'Y:'}).setClassID('binsizey').modifyEnabled(false);

                that.ctrl_binsizeUpdate = Controls.Button(null,{content:'Update', buttonClass: 'PnButtonGrid'}).setOnChanged(function() {
                    that.fetchData();
                });
                that.ctrl_binsizeUpdate.modifyEnabled(false);

                var binsizeGroup = Controls.CompoundVert([
                    that.ctrl_binsizeAutomatic,
                    Controls.CompoundHor([
                        Controls.CompoundVert([
                            that.ctrl_binsizeValueX,
                            that.ctrl_binsizeValueY
                        ]).setTreatAsBlock(true),
                        Controls.HorizontalSeparator(5),
                        that.ctrl_binsizeUpdate
                    ])
                    ]);

                var colormaplist = [];
                $.each(paletteList, function(idx,name) {
                    colormaplist.push({id:name, name:name});
                });
                that.ctrlPalette = Controls.Combo(null,{label:'Colors', states:colormaplist, value:'Heath'}).setClassID('color').setOnChanged(function() {
                    that.reDraw();
                });

                that.ctrl_Gamma = Controls.ValueSlider(null, {label: 'Gamma correction', width: 180, minval:0.1, maxval:1, value:0.75, digits: 2, scaleDistance: 0.2})
                    .setNotifyOnFinished().setClassID('gamma')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                var cmdPointSelection = Controls.Button(null, { icon: 'fa-crosshairs', content: 'Select points...', buttonClass: 'PnButtonGrid', width:80, height:30}).setOnChanged(function () {
                    var actions = [];
                    actions.push( { content:'Half plane selection', bitmap:'Bitmaps/circle_red_small.png', handler:function() {
                        that.panelPlot.startHalfPlaneSelection(function(center, dir) {
                            center.x = (center.x-that.offsetX)/that.scaleX;
                            center.y = (center.y-that.offsetY)/that.scaleY;
                            dir.x = dir.x/that.scaleX;
                            dir.y = dir.y/that.scaleY;
                            var queryInfo = MiscUtils.createHalfPlaneRestrictionQuery(that.theQuery.get(),that.propidValueX, that.propidValueY, center, dir);

                            ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Half plane', '', {
                                query: queryInfo.query,
                                subSamplingOptions: that.theQuery.getSubSamplingOptions()
                            }, null);
                        });
                    }
                    });
                    ButtonChoiceBox.create('Select points','', [actions]);
                });

                var controlsGroup = Controls.CompoundVert([
                    that.createIntroControls(),
                    Controls.AlignCenter(Controls.CompoundHor([
                        cmdPointSelection,
                        Controls.HorizontalSeparator(95)
                    ])),
                    Controls.VerticalSeparator(20),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrlValueXProperty,
                        that.ctrlValueYProperty,
                    ]).setMargin(10), {
                        title: 'Plot data',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        binsizeGroup,
                    ]), {
                        title: 'Bin size',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrlPalette,
                        that.ctrl_Gamma,
                        cmdPointSelection
                    ]).setMargin(10), {
                        title: 'Layout',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),


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
                that.fetchData();
            }

            that.reloadAll = function() {
                that.fetchData();
            }

            that.fetchData = function() {
                that.propidValueX = that.ctrlValueXProperty.getValue();
                that.propidValueY = that.ctrlValueYProperty.getValue();
                if (that.staging)
                    return;

                that.bucketDens = null;
                if ((!that.propidValueX)||(!that.propidValueY)) {
                    that.reDraw();
                    return;
                }

                DQX.setProcessing();
                that.ctrl_PointCount.modifyValue('--- data points');
                var data ={};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.propidx = that.propidValueX;
                data.propidy = that.propidValueY;
                data.tableid = that.tableInfo.getQueryTableName(that.theQuery.isSubSampling());
                data.maxrecordcount = that.tableInfo.settings.MaxCountQueryAggregated || 1000000;
                data.qry = SQL.WhereClause.encode(that.theQuery.getForFetching());
                if (!that.ctrl_binsizeAutomatic.getValue()) {
                    data.binsizex = that.ctrl_binsizeValueX.getValue();
                    data.binsizey = that.ctrl_binsizeValueY.getValue();
                }
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'histogram2d', data, function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }

                    if (!resp.hasdata) {
                        that.setWarning('No data in result set');
                        that.reDraw();
                        return;
                    }

                    if ('Warning' in resp)
                        that.setWarning(resp.Warning);
                    else
                        that.setWarning('');


                    var decoder = DataDecoders.ValueListDecoder();
                    var bucketsX = decoder.doDecode(resp.bucketsx);
                    var bucketsY = decoder.doDecode(resp.bucketsy);
                    var densities = decoder.doDecode(resp.densities);
                    that.bucketSizeX = resp.binsizex;
                    that.bucketSizeY = resp.binsizey;


                    var bucketXMin = Math.min.apply(Math, bucketsX);
                    var bucketXMax = Math.max.apply(Math, bucketsX);
                    var bucketYMin = Math.min.apply(Math, bucketsY);
                    var bucketYMax = Math.max.apply(Math, bucketsY);

                    that.bucketNrOffsetX = bucketXMin;
                    that.bucketCountX = bucketXMax-bucketXMin+1;
                    that.bucketNrOffsetY = bucketYMin;
                    that.bucketCountY = bucketYMax-bucketYMin+1;

                    that.bucketDens=[];
                    for (var i=0; i<that.bucketCountX; i++) {
                        var ar = [];
                        for (var j=0; j<that.bucketCountY; j++)
                            ar.push(0);
                        that.bucketDens.push(ar);
                    }
                    that.maxDens = 1;
                    var totCount = 0;
                    for (var i=0; i<densities.length; i++) {
                        that.bucketDens[bucketsX[i]-bucketXMin][bucketsY[i]-bucketYMin] = densities[i];
                        that.maxDens = Math.max(that.maxDens,densities[i]);
                        totCount += densities[i];
                    }

                    if (that.ctrl_binsizeAutomatic.getValue()) {
                        that.ctrl_binsizeValueX.modifyValue(that.bucketSizeX);
                        that.ctrl_binsizeValueY.modifyValue(that.bucketSizeY);
                    }

                    that.panelPlot.setDirectDedraw(that.bucketCountX*that.bucketCountY<2000);
                    that.reDraw();
                    that.ctrl_PointCount.modifyValue(totCount + ' data points');
                });

            }



            that.reloadAll = function() {
                that.fetchData();
            }

            that.reDraw = function() {
                that.panelPlot.invalidate();
            }



            that.draw = function(drawInfo) {
                that.drawImpl(drawInfo);
            }

            that.drawImpl = function(drawInfo) {

                that.plotPresent = false;
                var ctx = drawInfo.ctx;

                var paletteName=that.ctrlPalette.getValue();

                var marginX = 40;
                var marginY = 40;
                ctx.fillStyle="rgb(220,220,220)";
                ctx.fillRect(0,0,marginX,drawInfo.sizeY);
                ctx.fillRect(0,drawInfo.sizeY-marginY,drawInfo.sizeX,marginY);

                if (!that.bucketDens)
                    return;

                var XMin = that.bucketNrOffsetX*that.bucketSizeX;
                var XMax = (that.bucketNrOffsetX+that.bucketCountX)*that.bucketSizeX;
                var XRange = XMax - XMin;
                XMin -= 0.02*XRange;
                XMax += 0.02*XRange;
                var YMin = that.bucketNrOffsetY*that.bucketSizeY;
                var YMax = (that.bucketNrOffsetY+that.bucketCountY)*that.bucketSizeY;
                var YRange = YMax - YMin;
                YMin -= 0.02*YRange;
                YMax += 0.02*YRange;
                var scaleX = (drawInfo.sizeX-marginX) / (XMax - XMin);
                var offsetX = marginX - XMin*scaleX;
                var scaleY = - (drawInfo.sizeY-marginY) / (YMax - YMin);
                var offsetY = (drawInfo.sizeY-marginY) - YMin*scaleY;
                that.scaleX = scaleX; that.offsetX = offsetX;
                that.scaleY = scaleY; that.offsetY = offsetY;

                var gamma = Math.pow(that.ctrl_Gamma.getValue(),2.0);
                for (var ix=0; ix<that.bucketCountX; ix++) {
                    var x1 = (that.bucketNrOffsetX+ix+0)*that.bucketSizeX;
                    var x2 = (that.bucketNrOffsetX+ix+1)*that.bucketSizeX;
                    var px1 = Math.round(x1 * scaleX + offsetX);
                    var px2 = Math.round(x2 * scaleX + offsetX);
                    for (var iy=0; iy<that.bucketCountY; iy++) {
                        var y1 = (that.bucketNrOffsetY+iy+0)*that.bucketSizeY;
                        var y2 = (that.bucketNrOffsetY+iy+1)*that.bucketSizeY;
                        var py1 = Math.round(y1 * scaleY + offsetY);
                        var py2 = Math.round(y2 * scaleY + offsetY);
                        var fr = that.bucketDens[ix][iy]*1.0/that.maxDens;
                        fr  = Math.pow(fr,gamma);
                        var cl = getPaletteColor(paletteName, fr);
                        ctx.fillStyle=cl.toString();
                        ctx.fillRect(px1,py2,px2-px1,py1-py2);
                    }
                }


                // Draw x scale
                ctx.save();
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scaleTicks = MiscUtils.createPropertyScale(that.tableInfo.id, that.propidValueX, scaleX, XMin, XMax);
                $.each(scaleTicks, function(idx, tick) {
                    var px = Math.round(tick.value * scaleX + offsetX)-0.5;
                    if (tick.label) {
                        ctx.fillText(tick.label,px,drawInfo.sizeY-marginY+13);
                        if (tick.label2)
                            ctx.fillText(tick.label2,px,drawInfo.sizeY-marginY+23);
                        ctx.strokeStyle = "rgba(0,0,0,0.25)";
                    }
                    else {
                        ctx.strokeStyle = "rgba(128,128,128,0.15)";
                    }
                    ctx.beginPath();
                    ctx.moveTo(px,0);
                    ctx.lineTo(px,drawInfo.sizeY-marginY);
                    ctx.stroke();

                });
                if (that.propidValueX) {
                    ctx.font="bold 11px Arial";
                    ctx.fillText(MetaData.findProperty(that.tableInfo.id, that.propidValueX).name,drawInfo.sizeX/2, drawInfo.sizeY-12);
                }
                ctx.restore();

                // Draw y scale
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                ctx.save();
                var scaleTicks = MiscUtils.createPropertyScale(that.tableInfo.id, that.propidValueY, Math.abs(scaleY), YMin, YMax);
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
                        ctx.strokeStyle = "rgba(0,0,0,0.25)";
                    }
                    else {
                        ctx.strokeStyle = "rgba(128,128,128,0.15)";
                    }
                    ctx.beginPath();
                    ctx.moveTo(marginX,py);
                    ctx.lineTo(drawInfo.sizeX,py);
                    ctx.stroke();
                });
                if (that.propidValueY) {
                    ctx.font="bold 11px Arial";
                    ctx.save();
                    ctx.translate(17,drawInfo.sizeY/2);
                    ctx.rotate(-Math.PI/2);
                    ctx.fillText(MetaData.findProperty(that.tableInfo.id, that.propidValueY).name,0,0);
                    ctx.restore();
                }

                ctx.restore();


                that.plotPresent = true;
            };

            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.plotPresent) return;
                var iX = Math.floor(((px0-that.offsetX)/that.scaleX)/that.bucketSizeX) - that.bucketNrOffsetX;
                var iY = Math.floor(((py0-that.offsetY)/that.scaleY)/that.bucketSizeY) - that.bucketNrOffsetY;
                if ( (iX>=0) && (iX<that.bucketCountX) && (iY>=0) && (iY<that.bucketCountY) && (that.bucketDens[iX][iY]>0) ) {
                    var str = '';
//                    str += that.propidx+': '+(iX+that.bucketNrOffsetX)*that.bucketSizeX+' - '+(iX+1+that.bucketNrOffsetX)*that.bucketSizeX+'<br>';
                    str += 'Count: '+that.bucketDens[iX][iY];
                    return {
                        ID: 'IDX'+iX+'_'+iY,
                        px: (iX+0.5+that.bucketNrOffsetX)*that.bucketSizeX*that.scaleX+that.offsetX,
                        py: (iY+0.5+that.bucketNrOffsetY)*that.bucketSizeY*that.scaleY+that.offsetY,
                        showPointer:true,
                        count: that.bucketDens[iX][iY],
                        minvalX: (iX+0+that.bucketNrOffsetX)*that.bucketSizeX,
                        maxvalX: (iX+1+that.bucketNrOffsetX)*that.bucketSizeX,
                        minvalY: (iY+0+that.bucketNrOffsetY)*that.bucketSizeY,
                        maxvalY: (iY+1+that.bucketNrOffsetY)*that.bucketSizeY,
                        content: str
                    };
                }
                return null;
            };


            that.onMouseClick = function(ev, info) {
                var tooltip = that.getToolTipInfo(info.x, info.y);
                if (tooltip) {

                    var qry = that.theQuery.get();
                    qry = SQL.WhereClause.createRangeRestriction(qry, that.propidValueX, tooltip.minvalX, tooltip.maxvalX);
                    qry = SQL.WhereClause.createRangeRestriction(qry, that.propidValueY, tooltip.minvalY, tooltip.maxvalY);

                    var content = 'X Range: '+tooltip.minvalX+' - '+tooltip.maxvalX+'<br>';
                    content += 'Y Range: '+tooltip.minvalY+' - '+tooltip.maxvalY+'<br>';
                    content += 'Number of items: '+tooltip.count;
                    ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Histogram range', content, {
                        query: qry,
                        subSamplingOptions: that.theQuery.getSubSamplingOptions()
                    }, null);
                }
            }


            that.onSelected = function(minX, minY, maxX, maxY, shiftPressed, controlPressed, altPressed) {
                var rangeXMin = (minX-that.offsetX)/that.scaleX;
                var rangeXMax = (maxX-that.offsetX)/that.scaleX;
                var rangeYMin = (maxY-that.offsetY)/that.scaleY;
                var rangeYMax = (minY-that.offsetY)/that.scaleY;

                var qry = that.theQuery.get();
                qry = SQL.WhereClause.createRangeRestriction(qry, that.propidValueX, rangeXMin, rangeXMax);
                qry = SQL.WhereClause.createRangeRestriction(qry, that.propidValueY, rangeYMin, rangeYMax);


                var content = 'X Range: '+rangeXMin+' - '+rangeXMax+'<br>';
                content += 'Y Range: '+rangeYMin+' - '+rangeYMax+'<br>';
                ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Histogram range', content, {
                    query: qry,
                    subSamplingOptions: that.theQuery.getSubSamplingOptions()
                }, null);
            }


            that.create();
            return that;
        }



        return Histogram2D;
    });


