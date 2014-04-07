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


        GenericPlot.registerPlotType(MultiCategoryHistogram);

        MultiCategoryHistogram.Create = function(tableid, startQuery, querySettings) {
            var that = StandardLayoutPlot.Create(tableid, MultiCategoryHistogram.typeID,
                {
                    title:MultiCategoryHistogram.name,
                    scrollVertical:true
                },
                startQuery, querySettings);
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
                var ctrl_Query = that.theQuery.createControl([that.ctrl_PointCount]);


                var numPropList = [ {id:'', name:'-- Select --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.isFloat) ) )
                        numPropList.push({ id:prop.propid, name:prop.name });
                });

                var catPropList = [ {id:'', name:'-- Select --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Text') || (prop.datatype=='Boolean') ) )
                        catPropList.push({ id:prop.propid, name:prop.name });
                });
                
                that.ctrlValueProperty = Controls.Combo(null,{ label:'Value:<br>', states: numPropList }).setClassID('value');
                that.ctrlValueProperty.setOnChanged(function() {
                    that.fetchData();
            });

                that.ctrlCatProperty = Controls.Combo(null,{ label:'Group by:<br>', states: catPropList }).setClassID('groupby');
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

                that.ctrl_binsizeUpdate = Controls.Button(null,{content:'Update'}).setOnChanged(function() {
                    that.fetchData();
                });
                that.ctrl_binsizeUpdate.modifyEnabled(false);

                var binsizeGroup = Controls.CompoundHor([
                    Controls.CompoundVert([that.ctrl_binsizeAutomatic, that.ctrl_binsizeValue]).setAutoFillX(false),
                    Controls.HorizontalSeparator(10),
                    that.ctrl_binsizeUpdate
                ]);

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

                that.ctrl_Gamma = Controls.ValueSlider(null, {label: 'Gamma correction', width: 180, minval:0.1, maxval:1, value:1, digits: 2})
                    /*.setNotifyOnFinished()*/.setClassID('gamma')
                    .setOnChanged(DQX.debounce(function() {
                        that.reDraw();
                    }, 20));



                var controlsGroup = Controls.CompoundVert([
                    ctrl_Query,

                    Controls.Section(Controls.CompoundVert([
                        that.ctrlValueProperty,
                        that.ctrlCatProperty,
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
                        that.ctrlSort,
                        that.ctrl_VertSize,
                        that.ctrl_Gamma
                    ]).setMargin(10), {
                        title: 'Layout',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),


                ]);
                that.addPlotSettingsControl('controls',controlsGroup);
                that.panelButtons.addControl(controlsGroup);

            };

            that.setActiveQuery = function(qry) {
                that.theQuery.modify(qry);
            }

            that.updateQuery = function() {
                that.fetchData();
            }

            that.getVertSize = function() {
                var fr = (3+that.ctrl_VertSize.getValue())/13.0;
                return 200*fr*fr;
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

                    that.panelPlot.setFixedHeight(that.categories.length*that.getVertSize()+50);
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
                if (that.categories && (that.categories.length>0))
                    that.panelPlot.setFixedHeight(that.categories.length*that.getVertSize()+50);
                that.panelPlot.invalidate();
            }



            that.draw = function(drawInfo) {
                that.drawImpl(drawInfo);
            }

            that.drawImpl = function(drawInfo) {

                var barH = that.getVertSize();

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
                ctx.restore();

                $.each(that.categories, function(idx, catInfo) {
                    var offsetY = (barH-5) + idx * barH;
                    ctx.strokeStyle = "rgb(200,200,200)";
                    ctx.beginPath();
                    ctx.moveTo(0, offsetY);
                    ctx.lineTo(drawInfo.sizeX, offsetY);
                    ctx.stroke();



                    var gamma = Math.pow(that.ctrl_Gamma.getValue(),2.0);
                    var bucketCounts = catInfo.bucketCounts;
                    ctx.fillStyle="rgb(190,190,190)";
                    ctx.strokeStyle = "rgb(0, 0, 0)";
                    $.each(bucketCounts, function(bidx, val) {
                        if (val>0) {
                            fr  = Math.pow(val/that.maxCount,gamma);

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


            that.theQuery.notifyQueryUpdated = that.updateQuery;
            that.create();
            return that;
        }



        return MultiCategoryHistogram;
    });


