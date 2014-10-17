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

        var MultiCategoryHistogram = {};

        MultiCategoryHistogram.typeID = 'MultiCategoryHistogram';
        MultiCategoryHistogram.name = 'Multiple category histograms';
        MultiCategoryHistogram.description= 'Takes a <b>numerical property</b> and a <b>categorical property</b>, and plots a separate histogram for each state of the categorical property.';
        MultiCategoryHistogram.isCompatible = function(tableInfo) {
            return true;
        }

        MultiCategoryHistogram.plotAspects = [
            { id:'value', name:'Value', dataType:'Value', requiredLevel: 2 },
            { id:'groupby', name:'Group by', dataType:'Category', requiredLevel: 2 }
        ];


        MultiCategoryHistogram.Create = function(tableid, startQuery, querySettings, plotSettings) {
            var that = StandardLayoutPlot.Create(tableid, MultiCategoryHistogram.typeID,
                {
                    title:MultiCategoryHistogram.name,
                    scrollVertical:true
                },
                startQuery, querySettings, plotSettings);
            that.fetchCount = 0;
            that.showRelative = false;


            that.createPanelPlot = function() {
                that.panelPlot.draw = that.draw;
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
                that.panelPlot.selectionHorOnly = true;
            };

            that.createPanelButtons = function() {
                that.ctrl_PointCount = Controls.Html(null, '');


                var numPropList = [ {id:'', name:'-- Select --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.isFloat) ) )
                        numPropList.push({ id:prop.propid, name:prop.name, group:prop.group.Name });
                });

                var catPropList = [ {id:'', name:'-- Select --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Text') || (prop.datatype=='Boolean') ) )
                        catPropList.push({ id:prop.propid, name:prop.name, group:prop.group.Name });
                });
                
                that.ctrlValueProperty = Controls.Combo(null,{ label:'Value:<br>', states: numPropList, value:that.providedAspect2Property('value') }).setClassID('value');
                that.ctrlValueProperty.setOnChanged(function() {
                    that.fetchData();
            });

                that.ctrlCatProperty = Controls.Combo(null,{ label:'Group by:<br>', states: catPropList, value:that.providedAspect2Property('groupby') }).setClassID('groupby');
                that.ctrlCatProperty.setOnChanged(function() {
                    that.fetchData();
                });
                

                that.ctrl_binsizeAutomatic = Controls.Check(null,{label:'Automatic', value:true}).setClassID('binsizeautomatic').setOnChanged(function() {
                    that.ctrl_binsizeValue.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    that.ctrl_binsizeUpdate.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    if (that.ctrl_binsizeAutomatic.getValue())
                        that.fetchData();
                });

                that.ctrl_binsizeValue = Controls.Edit(null,{size:10}).setClassID('binsizevalue').setOnChanged(function() {

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


                that.ctrlOverlap = Controls.Check(null, { label:'Show in single plot'  }).setClassID('singleplot').setOnChanged(function() {
                    that.fetchData();
                });

                that.isSinglePlot = function() {
                    return that.ctrlOverlap.getValue();
                }

                that.ctrlNormalised = Controls.Check(null, { label:'Normalise per category'  }).setClassID('normcategories').setOnChanged(function() {
                    that.reDraw();
                });


                var sortlist = [{id:'state', name:'Name'}, {id:'count', name:'Size'}, {id:'mean', name:'Average value'}];
                that.ctrlSort = Controls.Combo(null,{label:'Sort by', states:sortlist, value:'state'}).setClassID('sortby').setOnChanged(function() {
                    that.sortCategories();
                    that.reDraw();
                });


                that.ctrl_VertSize = Controls.ValueSlider(null, {label: 'Vertical size', width: 180, minval:1, maxval:10, value:5, digits: 1})
                    /*.setNotifyOnFinished()*/.setClassID('vertsize')
                    .setOnChanged(DQX.debounce(function() {
                        that.reDraw();
                    }, 20));

                that.ctrl_Gamma = Controls.ValueSlider(null, {label: 'Gamma correction', width: 180, minval:0.1, maxval:1, value:1, digits: 2, scaleDistance: 0.2})
                    /*.setNotifyOnFinished()*/.setClassID('gamma')
                    .setOnChanged(DQX.debounce(function() {
                        that.reDraw();
                    }, 20));

                that.colorLegend = Controls.Html(null,'');


                var controlsGroup = Controls.CompoundVert([
                    that.createIntroControls(),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrlValueProperty,
                        that.ctrlCatProperty
                    ]).setMargin(10), {
                        title: 'Plot data',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        binsizeGroup
                    ]), {
                        title: 'Bin size',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrlOverlap,
                        that.ctrlNormalised,
                        that.ctrlSort,
                        that.ctrl_VertSize,
                        that.ctrl_Gamma,
                        that.colorLegend
                    ]).setMargin(10), {
                        title: 'Layout',
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
                that.fetchData();
            }

            that.getVertSize = function() {
                var fr = (3+that.ctrl_VertSize.getValue())/13.0;
                var vl = 200*fr*fr;
                if (that.isSinglePlot())
                    vl *= 3;
                return vl;
            }


            that.reloadAll = function() {
                that.fetchData();
            }

            that.fetchData = function() {
                that.propidValue = that.ctrlValueProperty.getValue();
                that.propidCat = that.ctrlCatProperty.getValue();
                if (that.staging)
                    return;
                that.bucketCounts = null;
                if ((!that.propidValue) || (!that.propidCat)) {
                    that.reDraw();
                    return;
                }
                var catPropInfo = MetaData.findProperty(that.tableInfo.id, that.propidCat);

                DQX.setProcessing();
                that.ctrl_PointCount.modifyValue('--- data points');
                var data ={};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.tableid = that.tableInfo.getQueryTableName(that.theQuery.isSubSampling());
                data.propidvalue = that.propidValue;
                data.propidcat = that.propidCat;
                data.maxrecordcount = that.tableInfo.settings.MaxCountQueryAggregated || 1000000;
                data.qry = SQL.WhereClause.encode(that.theQuery.getForFetching());
                if (!that.ctrl_binsizeAutomatic.getValue())
                    data.binsize = that.ctrl_binsizeValue.getValue();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'histogrammulticat', data, function(resp) {
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
                    var cats = decoder.doDecode(resp.cats);
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

                    that.numberOfBuckets = Math.round(bucketMax-bucketMin+1)
                    that.categories = [];
                    var catMap = {};
                    $.each(cats, function(idx, cat) {
                        if (!catMap[cat]) {
                            var bucketCounts = [];
                            for (var i=bucketMin; i<=bucketMax; i++)
                                bucketCounts.push(0);
                            var catInfo = {
                                name:cat,
                                dispname: catPropInfo.toDisplayString(cat),
                                bucketCounts:bucketCounts
                            };
                            that.categories.push(catInfo);
                            catMap[cat] = catInfo;
                        }
                    });

                    that.bucketNrOffset = bucketMin;
                    that.maxCount = 1;
                    var totCount = 0;
                    for (var i=0; i<buckets.length; i++) {
                        totCount += counts[i];
                        var catInfo = catMap[cats[i]]
                        catInfo.bucketCounts[buckets[i]-bucketMin] += counts[i];
                        if (that.maxCount<counts[i])
                            that.maxCount=counts[i]
                    }

                    $.each(that.categories, function(idx, catInfo) {
                        catInfo.count = 0;
                        catInfo.mean = 0;
                        $.each(catInfo.bucketCounts, function(bidx, val) {
                            var xval = (that.bucketNrOffset+bidx+0)*that.bucketSize;
                            catInfo.count += val;
                            catInfo.mean += xval*val;
                        });
                        if (catInfo.count>0)
                            catInfo.mean /= catInfo.count;
                    });

                    if (that.ctrl_binsizeAutomatic.getValue())
                        that.ctrl_binsizeValue.modifyValue(that.bucketSize);

                    that.sortCategories();


                    if (that.isSinglePlot()) {
                        var catnames = [];
                        $.each(that.categories, function(idx, cat) {
                            catnames.push(cat.name);
                        });
                        var maprs = catPropInfo.mapColors(catnames);
                        var legendStr = '';
                        $.each(maprs.legend,function(idx, legendItem) {
                            legendStr += '<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}<br>'.DQXformat({cl:legendItem.color.toString(), name:legendItem.state});
                        });
                        that.colorLegend.modifyValue(legendStr);
                        that.panelPlot.setFixedHeight(that.getVertSize()+50);
                    }
                    else {
                        that.colorLegend.modifyValue('');
                        that.panelPlot.setFixedHeight(that.categories.length*that.getVertSize()+50);
                    }
                    that.reDraw();
                    that.ctrl_PointCount.modifyValue(totCount + ' data points');
                });

            }


            that.sortCategories = function() {
                if (!that.numberOfBuckets)
                    return;
                var sortType = that.ctrlSort.getValue();
                if (sortType=='state')
                    that.categories.sort(DQX.ByProperty('dispname'));
                if (sortType=='count')
                    that.categories.sort(DQX.ByPropertyReverse('count'));
                if (sortType=='mean')
                    that.categories.sort(DQX.ByProperty('mean'));
            };



            that.reloadAll = function() {
                that.fetchData();
            }

            that.reDraw = function() {
                if (that.categories && (that.categories.length>0)) {
                    if (that.isSinglePlot())
                        that.panelPlot.setFixedHeight(that.getVertSize()+50);
                    else
                        that.panelPlot.setFixedHeight(that.categories.length*that.getVertSize()+50);
                }
                that.panelPlot.invalidate();
            }



            that.draw = function(drawInfo) {
                that.drawImpl(drawInfo);
            }

            that.drawImpl = function(drawInfo) {
                if (that.isSinglePlot())
                    that.drawImpl_Overlap(drawInfo);
                else
                    that.drawImpl_Separate(drawInfo);
            }


            that.drawImpl_Overlap = function(drawInfo) {
                var barH = that.getVertSize();
                var isNormalised = that.ctrlNormalised.getValue();

                that.plotPresent = false;
                var ctx = drawInfo.ctx;

                var marginX = 40;
                var marginY = 40;
                ctx.fillStyle="rgb(220,220,220)";
                ctx.fillRect(0,0,marginX,drawInfo.sizeY);
                ctx.fillRect(0,drawInfo.sizeY-marginY,drawInfo.sizeX,marginY);

                if (!that.numberOfBuckets)
                    return;

                var XMin = that.bucketNrOffset*that.bucketSize;
                var XMax = (that.bucketNrOffset+that.numberOfBuckets)*that.bucketSize;
                var XRange = XMax - XMin;
                XMin -= 0.1*XRange;
                XMax += 0.1*XRange;

                var offsetY = (barH);
                var catPropInfo = MetaData.findProperty(that.tableInfo.id, that.propidCat);

                // Draw x scale
                var scaleX = (drawInfo.sizeX-marginX) / (XMax - XMin);
                var offsetX = marginX - XMin*scaleX;
                that.scaleX = scaleX; that.offsetX = offsetX;
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
                if (that.propidValue) {
                    ctx.font="bold 11px Arial";
                    ctx.fillText(MetaData.findProperty(that.tableInfo.id, that.propidValue).name,drawInfo.sizeX/2, drawInfo.sizeY-12);
                }
                ctx.restore();


                var freqscale = that.maxCount;
                if (isNormalised) {
                    freqscale = 1.0e-9;
                    $.each(that.categories, function(idx, catInfo) {
                        var bucketCounts = catInfo.bucketCounts;
                        var totBucketCount = 0;
                        $.each(bucketCounts, function(bidx, val) {
                            totBucketCount += val;
                        });
                        if (totBucketCount == 0)
                            totBucketCount = 1;
                        var bucketFracs = [];
                        $.each(bucketCounts, function(bidx, val) {
                            bucketFracs.push(val/totBucketCount);
                            freqscale = Math.max(freqscale, val/totBucketCount);
                        });
                        catInfo.bucketFracs = bucketFracs;
                    });
                };


                var gamma = Math.pow(that.ctrl_Gamma.getValue(),2.0);
                var applyGammaCorr = function(vl) {
                    return Math.pow(vl/freqscale,gamma)*freqscale;
                };



                // Draw y scale
                ctx.save();
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scale = DQX.DrawUtil.getScaleJump(30/Math.abs(barH/freqscale)/applyGammaCorr(0.05*freqscale)*(0.05*freqscale));
                var lastTextPos = 1.0e9;
                for (var i=Math.ceil(0); i<=Math.floor(freqscale/scale.Jump1); i++) {
                    var vl = i*scale.Jump1;
                    var fr  = Math.pow(vl/freqscale, gamma);
                    var py = Math.round(-fr*(barH-7) + offsetY)-0.5;
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
                    ctx.font="bold 11px Arial";
                    ctx.save();
                    ctx.translate(17,drawInfo.sizeY/2);
                    ctx.rotate(-Math.PI/2);
                    ctx.fillText(isNormalised?'Relative count':'Count',0,0);
                    ctx.restore();
                }
                ctx.restore();


                that._clickDataPoints = [];
                $.each(that.categories, function(idx, catInfo) {
                    var bucketCounts = catInfo.bucketCounts;
                    var bucketVals = catInfo.bucketCounts;
                    if (isNormalised)
                        bucketVals = catInfo.bucketFracs;

                    var col = catPropInfo.mapSingleColor(catInfo.name);
                    ctx.strokeStyle = col.toString();
                    ctx.fillStyle = col.toString();


                    var vals_x = [];
                    var vals_y = [];
                    $.each(bucketVals, function(bidx, val) {
                        var fr  = Math.pow(val/freqscale,gamma);

                        var x1 = (that.bucketNrOffset+bidx+0.0)*that.bucketSize;
                        var x2 = (that.bucketNrOffset+bidx+1.0)*that.bucketSize;
                        var px1 = Math.round((x1+x2)/2 * scaleX + offsetX)-0.5;
                        var py2 = Math.round(-fr*(barH-7) + offsetY)-0.5;
                        vals_x.push(px1);
                        vals_y.push(py2);
                        that._clickDataPoints.push({
                            x: px1,
                            y: py2,
                            catval: catInfo.name,
                            bidx: bidx,
                            freq: bucketCounts[bidx],
                            minval: x1,
                            maxval: x2
                        });
                        ctx.beginPath();
                        ctx.arc(px1, py2, 2, 0, 2 * Math.PI, false);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.fill();
                    });
                    ctx.beginPath();
                    $.each(bucketVals, function(bidx, val) {
                        var px1 = vals_x[bidx];
                        var py2 = vals_y[bidx];
                        if (bidx==0)
                                ctx.moveTo(px1, py2);
                            else
                                ctx.lineTo(px1, py2);
                    });
                    ctx.stroke();

                });

                that.plotPresent = true;
            }

            that.drawImpl_Separate = function(drawInfo) {

                var barH = that.getVertSize();
                var gamma = Math.pow(that.ctrl_Gamma.getValue(),2.0);

                that.plotPresent = false;
                var ctx = drawInfo.ctx;

                var marginX = 40;
                var marginY = 40;
                ctx.fillStyle="rgb(220,220,220)";
                ctx.fillRect(0,0,marginX,drawInfo.sizeY);
                ctx.fillRect(0,drawInfo.sizeY-marginY,drawInfo.sizeX,marginY);

                if (!that.numberOfBuckets)
                    return;

                var XMin = that.bucketNrOffset*that.bucketSize;
                var XMax = (that.bucketNrOffset+that.numberOfBuckets)*that.bucketSize;
                var XRange = XMax - XMin;
                XMin -= 0.1*XRange;
                XMax += 0.1*XRange;

                // Draw x scale
                var scaleX = (drawInfo.sizeX-marginX) / (XMax - XMin);
                var offsetX = marginX - XMin*scaleX;
                that.scaleX = scaleX; that.offsetX = offsetX;
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
                if (that.propidValue) {
                    ctx.font="bold 11px Arial";
                    ctx.fillText(MetaData.findProperty(that.tableInfo.id, that.propidValue).name,drawInfo.sizeX/2, drawInfo.sizeY-12);
                }
                ctx.restore();


                $.each(that.categories, function(idx, catInfo) {
                    var bucketCounts = catInfo.bucketCounts;
                    var offsetY = (barH-5) + idx * barH;
                    ctx.strokeStyle = "rgb(200,200,200)";
                    ctx.beginPath();
                    ctx.moveTo(0, offsetY);
                    ctx.lineTo(drawInfo.sizeX, offsetY);
                    ctx.stroke();

                    var freqscale = that.maxCount;
                    if (that.ctrlNormalised.getValue()) {
                        freqscale = 1;
                        $.each(bucketCounts, function(bidx, val) {
                            if (val>freqscale)
                                freqscale = val;
                        });
                    };

                    ctx.fillStyle="rgb(190,190,190)";
                    ctx.strokeStyle = "rgb(0, 0, 0)";
                    $.each(bucketCounts, function(bidx, val) {
                        if (val>0) {
                            fr  = Math.pow(val/freqscale,gamma);

                            var x1 = (that.bucketNrOffset+bidx+0)*that.bucketSize;
                            var x2 = (that.bucketNrOffset+bidx+1)*that.bucketSize;
                            var px1 = Math.round(x1 * scaleX + offsetX)-0.5;
                            var px2 = Math.round(x2 * scaleX + offsetX)-0.5;
                            var py1 = Math.round( + offsetY)-0.5;
                            var py2 = Math.round(-fr*(barH-7) + offsetY)-0.5;
                            ctx.beginPath();
                            ctx.moveTo(px1, py2);
                            ctx.lineTo(px1, py1);
                            ctx.lineTo(px2, py1);
                            ctx.lineTo(px2, py2);
                            ctx.closePath();
                            ctx.fill();
                            ctx.stroke();
                        }
                    });

                    ctx.font="11px Arial";
                    ctx.fillStyle="rgba(0,0,0,0.6)";
                    ctx.textAlign = 'left';
                    ctx.fillText(catInfo.dispname,marginX+5,offsetY-barH+20);

                });

                that.plotPresent = true;
            };

            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.plotPresent) return null;
                var tooltip = null;
                var barH = that.getVertSize();

                var catPropInfo = MetaData.findProperty(that.tableInfo.id, that.propidCat);
                if (that.isSinglePlot()) {
                    var mindst = 15;
                    var bestpt = null;
                    $.each(that._clickDataPoints, function(idx, pt) {
                        var dst = Math.abs(pt.x - px0) + Math.abs(pt.y - py0);
                        if (dst<mindst) {
                            mindst = dst;
                            bestpt = pt;
                        }
                    });
                    if (bestpt)
                        return {
                            ID: 'IDX'+bestpt.catval+'_'+bestpt.bidx,
                            px: bestpt.x,
                            py: bestpt.y,
                            showPointer:true,
                            content: catPropInfo.toDisplayString(bestpt.catval)+'<br>'+bestpt.freq,
                            cat: bestpt.catval,
                            count: bestpt.freq,
                            minval: bestpt.minval,
                            maxval: bestpt.maxval
                        };
                    else
                        return null;

                }
                else {
                    var catNr = Math.floor(py0/barH);
                    var catInfo = that.categories[catNr];
                    if (!catInfo) {
                        return null;
                    }
                    $.each(catInfo.bucketCounts, function(bidx, val) {
                        var x1 = (that.bucketNrOffset+bidx+0)*that.bucketSize;
                        var x2 = (that.bucketNrOffset+bidx+1)*that.bucketSize;
                        var px1 = Math.round(x1 * that.scaleX + that.offsetX)-0.5;
                        var px2 = Math.round(x2 * that.scaleX + that.offsetX)-0.5;
                        if ( (px0>=px1) && (px0<=px2) && (val>0) ) {
                            var str = '';
                            str += 'Count: '+val;
                            tooltip = {
                                ID: 'IDX'+bidx,
                                px: (px1+px2)/2,
                                py: (catNr+1)*barH-20,
                                showPointer:true,
                                content: str,
                                count: val,
                                cat: catInfo.name,
                                minval:x1,
                                maxval:x2
                            };
                        }
                    });
                }
                return tooltip;
            };

            that.onMouseClick = function(ev, info) {
                var tooltip = that.getToolTipInfo(info.x, info.y);
                if (tooltip) {
                    var qry = SQL.WhereClause.createRangeRestriction(that.theQuery.get(), that.propidValue, tooltip.minval, tooltip.maxval);
                    qry = SQL.WhereClause.createValueRestriction(qry, that.propidCat, tooltip.cat, '=')
                    var content = 'Number of items: '+tooltip.count;
                    content += '<br>Range: '+tooltip.minval+' - '+tooltip.maxval+'<br>';
                    var propInfo = MetaData.findProperty(that.tableInfo.id, that.propidCat);
                    content += propInfo.name+'= ' + propInfo.toDisplayString(tooltip.cat)+ '<br>';
                    ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Multiple Category Histogram bar', content, {
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

                ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'MultiCategoryHistogram range', content, {
                    query: qry,
                    subSamplingOptions: that.theQuery.getSubSamplingOptions()
                }, null);
            }


            that.create();
            return that;
        }



        return MultiCategoryHistogram;
    });


