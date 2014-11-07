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

        var Histogram = {};

        Histogram.typeID = 'histogram';
        Histogram.name = 'Histogram';
        Histogram.description= 'Takes a <b>numerical property</b>, and plots the number of {items} for a set of bins defined over this value.';
        Histogram.isCompatible = function(tableInfo) {
            return true;
        }

        Histogram.plotAspects = [
            { id:'value', name:'Value', dataType:'Value', requiredLevel: 2 }
        ];



        Histogram.Create = function(tableid, startQuery, querySettings, plotSettings) {
            var that = StandardLayoutPlot.Create(tableid, Histogram.typeID, {title:Histogram.name }, startQuery, querySettings, plotSettings);
            that.fetchCount = 0;
            that.showRelative = false;


            that.barW = 16;
            that.scaleW = 100;
            that.textH = 130;

            that.overlayValueList = [];
            if (plotSettings) {
                if (plotSettings.dataValues != null) {
                    $.each(plotSettings.dataValues, function(idx, dataValue) {
                        that.overlayValueList.push(dataValue);
                    });
                }
            }


            that.createPanelPlot = function() {
                that.panelPlot.draw = that.draw;
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
                that.panelPlot.selectionHorOnly = true;
            };

            that.createPanelButtons = function() {


                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.isFloat) ) )
                        propList.push({ id:prop.propid, name:prop.name, group:prop.group.Name });
                });
                that.ctrlValueProperty = Controls.Combo(null,{ label:'Value:<br>', states: propList, value:that.providedAspect2Property('value') }).setClassID('value');
                that.ctrlValueProperty.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrl_binsizeAutomatic = Controls.Check(null,{label:'Automatic', value:true}).setClassID('binsizeautomatic').setOnChanged(function() {
                    that.ctrl_binsizeValue.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    that.ctrl_binsizeUpdate.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    if (that.ctrl_binsizeAutomatic.getValue())
                        that.fetchData();
                });

                that.ctrl_binsizeValue = Controls.Edit(null,{size:12}).setClassID('binsizevalue').setOnChanged(function() {

                });
                that.ctrl_binsizeValue.modifyEnabled(false);

                that.ctrl_binsizeUpdate = Controls.Button(null,{content:'Update', buttonClass: 'PnButtonGrid'}).setOnChanged(function() {
                    that.fetchData();
                });
                that.ctrl_binsizeUpdate.modifyEnabled(false);

                var binsizeGroup = Controls.CompoundHor([
                    Controls.CompoundVert([that.ctrl_binsizeAutomatic, that.ctrl_binsizeValue]).setAutoFillX(false),
                    Controls.HorizontalSeparator(10),
                    that.ctrl_binsizeUpdate
                ]);

                that.ctrl_Gamma = Controls.ValueSlider(null, {label: 'Gamma correction', width: 180, minval:0.1, maxval:1, value:1, digits: 2, scaleDistance: 0.2})
                    /*.setNotifyOnFinished()*/.setClassID('gamma')
                    .setOnChanged(DQX.debounce(function() {
                        that.reDraw();
                    }, 10));

                var controlsGroup = Controls.CompoundVert([
                    that.createIntroControls(),
                    Controls.Section(Controls.CompoundVert([
                        that.ctrlValueProperty
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
                        that.ctrl_Gamma
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
                that.propidValue = that.ctrlValueProperty.getValue();
                if (that.staging)
                    return;
                that.bucketCounts = null;
                if (!that.propidValue) {
                    that.reDraw();
                    return;
                }

                DQX.setProcessing();
                that.ctrl_PointCount.modifyValue('--- data points');
                var data ={};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.tableid = that.tableInfo.getQueryTableName(that.theQuery.isSubSampling());
                data.propid = that.propidValue;
                data.maxrecordcount = that.tableInfo.settings.MaxCountQueryAggregated || 1000000;
                data.qry = SQL.WhereClause.encode(that.theQuery.getForFetching());
                if (!that.ctrl_binsizeAutomatic.getValue())
                    data.binsize = that.ctrl_binsizeValue.getValue();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'histogram', data, function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    if ('Warning' in resp)
                        that.setWarning(resp.Warning);
                    else
                        that.setWarning('');

                    if (!resp.hasdata) {
                        that.setWarning('No data in result set');
                        that.reDraw();
                        return;
                    }

                    var decoder = DataDecoders.ValueListDecoder();
                    var buckets = decoder.doDecode(resp.buckets);
                    var counts = decoder.doDecode(resp.counts);
                    that.bucketSize = resp.binsize;


                    var bucketMin = 1.0e99;
                    var bucketMax = -1.0e99;
                    $.each(buckets,function(idx,vl) {
                        if (vl<bucketMin)
                            bucketMin=vl;
                        if (vl>bucketMax)
                            bucketMax=vl;
                    });

                    that.bucketNrOffset = bucketMin;
                    that.bucketCounts=[];
                    that.maxCount = 1;
                    var totCount = 0;
                    for (var i=bucketMin; i<=bucketMax; i++)
                        that.bucketCounts.push(0);
                    for (var i=0; i<buckets.length; i++) {
                        totCount += counts[i];
                        that.bucketCounts[buckets[i]-bucketMin] = counts[i];
                        if (that.maxCount<counts[i])
                            that.maxCount=counts[i]
                    }

                    if (that.ctrl_binsizeAutomatic.getValue())
                        that.ctrl_binsizeValue.modifyValue(that.bucketSize);

                    that.ctrl_PointCount.modifyValue(totCount + ' data points');

                    that.reDraw();
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

                var marginX = 40;
                var marginY = 40;
                ctx.fillStyle="rgb(220,220,220)";
                ctx.fillRect(0,0,marginX,drawInfo.sizeY);
                ctx.fillRect(0,drawInfo.sizeY-marginY,drawInfo.sizeX,marginY);

                if (!that.bucketCounts)
                    return;

                var propInfo = null;
                if (that.propidValue)
                    propInfo = MetaData.findProperty(that.tableInfo.id, that.propidValue);

                var gamma = Math.pow(that.ctrl_Gamma.getValue(),2.0);

                var XMin = that.bucketNrOffset*that.bucketSize;
                var XMax = (that.bucketNrOffset+that.bucketCounts.length)*that.bucketSize;
                var XRange = XMax - XMin;
                XMin -= 0.1*XRange;
                XMax += 0.1*XRange;
                var YMin = 0;
                var YMax = that.maxCount*1.1;
                var scaleX = (drawInfo.sizeX-marginX) / (XMax - XMin);
                var offsetX = marginX - XMin*scaleX;
                var scaleY = - (drawInfo.sizeY-marginY) / (YMax - YMin);
                var offsetY = (drawInfo.sizeY-marginY) - YMin*scaleY;
                that.scaleX = scaleX; that.offsetX = offsetX;
                that.scaleY = scaleY; that.offsetY = offsetY;

                var applyGammaCorr = function(vl) {
                    return Math.pow(vl/that.maxCount,gamma)*that.maxCount;
                };

                // Draw x scale
                ctx.save();
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scaleTicks = MiscUtils.createPropertyScale(that.tableInfo.id, that.propidValue, scaleX, XMin, XMax);
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

                if (propInfo) {
                    ctx.font="bold 12px Arial";
                    ctx.fillText(propInfo.name,drawInfo.sizeX/2, drawInfo.sizeY-12);
                }
                ctx.restore();

                // Draw y scale
                ctx.save();
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scale = DQX.DrawUtil.getScaleJump(30/Math.abs(scaleY)/applyGammaCorr(0.05*that.maxCount)*(0.05*that.maxCount));
                var lastTextPos = 1.0e9;
                for (var i=Math.ceil(YMin/scale.Jump1); i<=Math.floor(YMax/scale.Jump1); i++) {
                    var vl = i*scale.Jump1;
                    var vlc = applyGammaCorr(vl);
                    var py = Math.round(vlc * scaleY + offsetY)-0.5;
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
                        var txt = scale.value2String(vl);
                        var tw =  ctx.measureText(txt).width;
                        if (py+tw/2<lastTextPos) {
                            ctx.fillText(txt,0,0);
                            lastTextPos = py-(tw/2+7);
                        }
                        ctx.restore();
                    }
                }
                if (true) {
                    ctx.font="bold 12px Arial";
                    ctx.save();
                    ctx.translate(17,drawInfo.sizeY/2);
                    ctx.rotate(-Math.PI/2);
                    ctx.fillText('Number of '+that.tableInfo.tableNamePlural,0,0);
                    ctx.restore();
                }
                ctx.restore();

                ctx.fillStyle="rgb(210,210,210)";
                ctx.strokeStyle = "rgb(100,100,100)";
                $.each(that.bucketCounts, function(bidx, val) {
                    val = applyGammaCorr(val);
                    var x1 = (that.bucketNrOffset+bidx+0)*that.bucketSize;
                    var x2 = (that.bucketNrOffset+bidx+1)*that.bucketSize;
                    var px1 = Math.round(x1 * scaleX + offsetX)-0.5;
                    var px2 = Math.round(x2 * scaleX + offsetX)-0.5;
                    var py1 = Math.round(0 * scaleY + offsetY)-0.5;
                    var py2 = Math.round(val * scaleY + offsetY)-0.5;
                    ctx.beginPath();
                    ctx.moveTo(px1, py2);
                    ctx.lineTo(px1, py1);
                    ctx.lineTo(px2, py1);
                    ctx.lineTo(px2, py2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                });

                //show overlay values
                ctx.strokeStyle = "rgb(255,0,0)";
                ctx.fillStyle="rgb(255,0,0)";
                ctx.font="bold 12px Arial";
                $.each(that.overlayValueList, function(idx, overlayValue) {
                    var px = Math.round(overlayValue.value * scaleX + offsetX)-0.5;
                    ctx.beginPath();
                    ctx.moveTo(px, 0);
                    ctx.lineTo(px, drawInfo.sizeY-marginY);
                    ctx.stroke();
                    ctx.fillText(overlayValue.name, px+2, 12);
                    if (propInfo) {
                        var str = propInfo.toDisplayString(overlayValue.value);
                        ctx.fillText(str, px+2, 28);
                    }
                });

                that.plotPresent = true;
            };

            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.plotPresent) return null;
                var tooltip = null;
                $.each(that.bucketCounts, function(bidx, val) {
                    var x1 = (that.bucketNrOffset+bidx+0)*that.bucketSize;
                    var x2 = (that.bucketNrOffset+bidx+1)*that.bucketSize;
                    var px1 = Math.round(x1 * that.scaleX + that.offsetX)-0.5;
                    var px2 = Math.round(x2 * that.scaleX + that.offsetX)-0.5;
                    var py1 = Math.round(0 * that.scaleY + that.offsetY)-0.5;
                    var py2 = Math.round(val * that.scaleY + that.offsetY)-0.5;
                    if ( (px0>=px1) && (px0<=px2) && (val>0) ) {
                        var str = '';
                        str += 'Count: '+val;
                        tooltip = {
                            ID: 'IDX'+bidx,
                            px: (px1+px2)/2,
                            py: py2,
                            showPointer:true,
                            content: str,
                            count: val,
                            minval:x1,
                            maxval:x2
                        };
                    }
                });
                return tooltip;
            };

            that.onMouseClick = function(ev, info) {
                var tooltip = that.getToolTipInfo(info.x, info.y);
                if (tooltip) {
                    var qry = SQL.WhereClause.createRangeRestriction(that.theQuery.get(), that.propidValue, tooltip.minval, tooltip.maxval);
                    var content = 'Number of items: '+tooltip.count;
                    content += '<br>Range: '+tooltip.minval+' - '+tooltip.maxval+'<br>';
                    ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Histogram bar', content, {
                        query: qry,
                        subSamplingOptions: that.theQuery.getSubSamplingOptions()
                    }, null);
                }
            }

            that.onSelected = function(minX, minY, maxX, maxY, shiftPressed, controlPressed, altPressed) {
                var rangeMin = (minX-that.offsetX)/that.scaleX;
                var rangeMax = (maxX-that.offsetX)/that.scaleX;
                var content = 'Range: '+rangeMin+' - '+rangeMax+'<br>';

                var qry = SQL.WhereClause.createRangeRestriction(that.theQuery.get(), that.propidValue, rangeMin, rangeMax);

                ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Histogram range', content, {
                    query: qry,
                    subSamplingOptions: that.theQuery.getSubSamplingOptions()
                }, null);
            }


            that.create();
            return that;
        }



        return Histogram;
    });


