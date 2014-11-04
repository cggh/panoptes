// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "DQX/MessageBox",
    "Wizards/EditQuery", "MetaData", "Utils/QueryTool", "Plots/GenericPlot", "Plots/StandardLayoutPlot", "Utils/ButtonChoiceBox"
],
    function (
        require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, MessageBox,
        EditQuery, MetaData, QueryTool, GenericPlot, StandardLayoutPlot, ButtonChoiceBox
        ) {

        var BarGraph = {};

        BarGraph.typeID = 'bargraph';
        BarGraph.name = 'Bar graph';
        BarGraph.description= 'Takes a <b>categorical property</b>, and plots the number of {items} for each state of this property. Optionally, a second categorical property can be used to overlay as a colour.';
        BarGraph.isCompatible = function(tableInfo) {
            return true;
        }

        BarGraph.plotAspects = [
            { id:'groupby', name:'Group by', dataType:'Category', requiredLevel: 2 },
            { id:'secgroup', name:'Secondary group', dataType:'Category', requiredLevel: 0 }
        ];


        BarGraph.Create = function(tableid, startQuery, querySettings, plotSettings) {
            var that = StandardLayoutPlot.Create(tableid, BarGraph.typeID,
                {
                    title: BarGraph.name,
                    scrollHorizontal: true
                },
                startQuery, querySettings, plotSettings);
            that.fetchCount = 0;
            that.showRelative = false;

            that.barW = 14;
            that.scaleW = 20;
            that.textH = 170;


            that.createPanelPlot = function() {
                that.panelPlot = FrameCanvas(that.framePlot);
                that.panelPlot.draw = that.draw;
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
            };

            that.createPanelButtons = function() {

                that.ctrl_PointCount = Controls.Html(null, '');


                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Text') || (prop.datatype=='Boolean') ) )
                        propList.push({ id:prop.propid, name:prop.name, group:prop.group.Name });
                });
                that.ctrlCatProperty1 = Controls.Combo(null,{ label:'Group by:<br>', states: propList, value:that.providedAspect2Property('groupby') }).setClassID('groupby');
                that.ctrlCatProperty1.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrlCatSort1 = Controls.Combo(null,{ label:'Sort by:<br>', states: [{id:'cat', name:'Category'}, {id:'count', name:'Count'}] }).setClassID('sortby');
                that.ctrlCatSort1.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrlCatProperty2 = Controls.Combo(null, { label:'Secondary group:<br>', states: propList, value:that.providedAspect2Property('secgroup') }).setClassID('secgroup');
                that.ctrlCatProperty2.setOnChanged(function() {
                    that.ctrlCatType.modifyEnabled(that.ctrlCatProperty2.getValue()!='');
                    that.fetchData();
                });

                that.ctrlCatType = Controls.Check(null, { label:'Sum to 100%'  }).setClassID('sumto100');
                that.ctrlCatType.setOnChanged(function() {
                    that.showRelative = that.ctrlCatType.getValue();
                    that.reDraw();
                });
                that.ctrlCatType.modifyEnabled(false);

                that.colorLegend = Controls.Html(null,'');

                var controlsGroup = Controls.CompoundVert([
                    that.createIntroControls(),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrlCatProperty1,
                        that.ctrlCatSort1,
                        that.ctrlCatProperty2,
                        that.ctrlCatType,
                    ]).setMargin(10), {
                        title: 'Plot data',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        that.colorLegend
                    ]), {
                        title: 'Color legend',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                ]).setMargin(0);
                that.addPlotSettingsControl('controls',controlsGroup);
                that.panelButtons.addControl(controlsGroup);

                if (that.hasProvidedAspects())
                    that.reloadAll();
            };

            that.reloadAll = function() {
                that.fetchData();
            }

            that.fetchData = function() {
                that.catpropid1 = that.ctrlCatProperty1.getValue();
                that.catpropid2 = that.ctrlCatProperty2.getValue();
                if (!that.catpropid1)
                    return;

                if (that.catpropid2) {
                    if (that.catpropid2==that.catpropid1) {
                        that.maxcount = 0;
                        that.categories = [];
                        that.reDraw();
                        MessageBox.errorBox('Error', 'Secondary category should be different from first');
                        return;
                    }
                }

                if (that.staging)
                    return;
                DQX.setProcessing();
                that.ctrl_PointCount.modifyValue('--- data points');
                var data ={};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.tableid = that.tableInfo.getQueryTableName(that.theQuery.isSubSampling());
                data.propid1 = that.catpropid1;
                if (that.catpropid2)
                    data.propid2 = that.catpropid2;
                data.qry = SQL.WhereClause.encode(that.theQuery.getForFetching());
                data.maxrecordcount = that.tableInfo.settings.MaxCountQueryAggregated || 1000000;
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'categorycounts', data, function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    if ('Warning' in resp)
                        that.setWarning(resp.Warning);
                    else
                        that.setWarning('');
                    if (!that.catpropid2)
                        that.prepareData1Cat(resp);
                    else
                        that.prepareData2Cat(resp);
                    that.sortCats();
                    var sizeX = that.scaleW + that.categories.length * that.barW;
                    that.panelPlot.setFixedWidth(sizeX+20);
                    that.reDraw();
                });
            }

            that.prepareData1Cat = function(resp) {
                var decoder = DataDecoders.ValueListDecoder();
                var categories1 = decoder.doDecode(resp.categories1);
                var categorycounts = decoder.doDecode(resp.categorycounts);
                that.maxcount = 0;
                that.categories = [];
                var totCount = 0;
                $.each(categorycounts, function(idx, cnt) {
                    that.categories.push({ name:categories1[idx], count:cnt });
                    that.maxcount = Math.max(that.maxcount,cnt);
                    totCount += cnt;
                });
                that.colorLegend.modifyValue('');
                that.ctrl_PointCount.modifyValue(totCount + ' data points');
            }

            that.prepareData2Cat = function(resp) {
                var propInfo2 = MetaData.findProperty(that.tableInfo.id,that.catpropid2);
                var decoder = DataDecoders.ValueListDecoder();
                var categories1 = decoder.doDecode(resp.categories1);
                var categories2 = decoder.doDecode(resp.categories2);
                var categorycounts = decoder.doDecode(resp.categorycounts);
                that.categories = [];
                var catMap = {}
                var subCatMap = {}
                var subCats = [];
                var totCount = 0;
                $.each(categorycounts, function(idx, cnt) {
                    totCount += cnt;
                    if (!(categories1[idx] in catMap)) {
                        var cat = { name:categories1[idx], count:0, subcats:[] };
                        that.categories.push(cat);
                        catMap[cat.name] = cat;
                    }
                    var cat = catMap[categories1[idx]];
                    if (!(categories2[idx] in subCatMap)) {
                        var subcat = { name:categories2[idx] };
                        subCats.push(subcat.name);
                        subCatMap[subcat.name] = subcat;
                    }
                    cat.count += cnt;
                    cat.subcats.push({ name:categories2[idx], count:cnt });

                    //that.categories.push({ name:categories1[idx], count:cnt });
                    //that.maxcount = Math.max(that.maxcount,cnt);
                });
                that.maxcount = 0;
                $.each(that.categories,function(idx, cat) {
                    that.maxcount = Math.max(that.maxcount,cat.count);
                });

                var dispSubCats = [];
                $.each(subCats, function(idx, subcat) {
                    dispSubCats.push(propInfo2.toDisplayString(subcat));
                });
                propInfo2.mapColors(dispSubCats);

                var legendStr = '';
                $.each(subCats,function(idx, subcat) {
                    legendStr+='<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}<br>'.DQXformat({
                        cl:propInfo2.mapSingleColor(propInfo2.toDisplayString(subcat)).toString(),
                        name:propInfo2.toDisplayString(subcat)
                    });
                });
                that.colorLegend.modifyValue(legendStr);
                that.ctrl_PointCount.modifyValue(totCount + ' data points');

            }

            that.sortCats = function() {
                if (that.ctrlCatSort1.getValue()=='cat') {
                    that.categories = _.sortBy(that.categories, function(val) {
                        return val.name;
                    });
                }
                else {
                    that.categories = _.sortBy(that.categories, function(val) {
                        return -val.count;
                    });
                }
            };


            that.reloadAll = function() {
                that.fetchData();
            }

            that.reDraw = function() {
                that.panelPlot.invalidate();
            }


            that.updateQuery = function() {
                that.fetchData();
            }

            that.draw = function(drawInfo) {
                that.drawImpl(drawInfo);
            }

            that.drawImpl = function(drawInfo) {
                var ctx = drawInfo.ctx;
                if (!that.categories) {
                    return;
                }
                var propInfo1 = MetaData.findProperty(that.tableInfo.id,that.catpropid1);
                if (that.catpropid2)
                    var propInfo2 = MetaData.findProperty(that.tableInfo.id,that.catpropid2);

                that.plotH = drawInfo.sizeY - that.textH - 40;

                that.hoverItems = [];

                var totcount  = 0;
                $.each(that.categories, function(idx, cat) {
                    totcount += cat.count;
                });

                ctx.font="11px Arial";
                $.each(that.categories, function(idx, cat) {
                    var sumcount = that.maxcount;
                    if (that.showRelative && (that.catpropid2) )
                        sumcount = cat.count;
                    sumcount = Math.max(1,sumcount);

                    ctx.fillStyle="rgb(220,220,220)";
                    var h = cat.count*1.0/sumcount * that.plotH;
                    var px1 = that.scaleW + idx * that.barW + 0.5;
                    var px2 = that.scaleW + (idx+1) * that.barW + 0.5;
                    var py1 = drawInfo.sizeY-that.textH + 0.5;
                    var py2 = drawInfo.sizeY-that.textH -Math.round(h) + 0.5;
                    ctx.beginPath();
                    ctx.moveTo(px1, py2);
                    ctx.lineTo(px1, py1);
                    ctx.lineTo(px2, py1);
                    ctx.lineTo(px2, py2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    //Draw label
                    ctx.fillStyle="black";
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.save();
                    ctx.translate((px1+px2)/2,py1+5);
                    ctx.rotate(-Math.PI/2);
                    var content = cat.name;
                    var truncateCount = 2;
                    while ((ctx.measureText(content).width>that.textH-25) && (truncateCount<content.length)) {
                        truncateCount += 1;
                        content = DQX.truncateString(content, content.length-truncateCount);
                    }
                    ctx.fillText(propInfo1.toDisplayString(content),0,0);
                    ctx.restore();
                    //Draw count
                    ctx.fillStyle="rgb(150,150,150)";
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.save();
                    ctx.translate((px1+px2)/2,py2-2);
                    ctx.rotate(-Math.PI/2);
                    ctx.fillText(cat.count,0,0);
                    ctx.restore();

                    var label = propInfo1.name+': '+propInfo1.toDisplayString(cat.name);
                    label += '<br>Count: {ct} ({fr}%)'.DQXformat({ ct:cat.count, fr:(cat.count/totcount*100).toFixed(2)});
                    var selectors = {};selectors[that.catpropid1] = cat.name;
                    that.hoverItems.push({
                        ID: 'i'+DQX.getNextUniqueID(),
                        px: (px1+px2)/2,
                        py: (py1+py2)/2,
                        //showPointer:true,
                        content: label,
                        px1:px1, px2:px2, py1:py1+5, py2:py2-5,
                        selectors: selectors
                     });
                    that.hoverItems.push({
                        ID: 'i'+DQX.getNextUniqueID(),
                        px: (px1+px2)/2,
                        py: py1+that.textH/2,
                        //showPointer:true,
                        content: label,
                        px1:px1, px2:px2, py1:py1+that.textH, py2:py1+1,
                        selectors: selectors
                    });

                    if (that.catpropid2) {
//                        var colorMapper = propInfo2.category2Color;
                        var cumulcount = 0;
                        $.each(cat.subcats, function(idx, subcat) {
                            var h1 = cumulcount*1.0/sumcount * that.plotH;
                            var h2 = (cumulcount+subcat.count)*1.0/sumcount * that.plotH;
                            var py1 = drawInfo.sizeY-that.textH - Math.round(h1) + 0.5;
                            var py2 = drawInfo.sizeY-that.textH - Math.round(h2) + 0.5;
                            ctx.fillStyle = propInfo2.mapSingleColor(propInfo2.toDisplayString(subcat.name)).toString();
                            ctx.beginPath();
                            ctx.moveTo(px1, py2);
                            ctx.lineTo(px1, py1);
                            ctx.lineTo(px2, py1);
                            ctx.lineTo(px2, py2);
                            ctx.closePath();
                            ctx.fill();
                            ctx.stroke();
                            cumulcount += subcat.count;

                            var label = propInfo1.name+': '+propInfo1.toDisplayString(cat.name);
                            label += '<br>'+propInfo2.name+': '+propInfo2.toDisplayString(subcat.name);
                            label += '<br>Count: {ct} (of class: {fr1}%, of total: {fr2}%)'.DQXformat({
                                ct:subcat.count,
                                fr1:(subcat.count/sumcount*100).toFixed(2),
                                fr2:(subcat.count/totcount*100).toFixed(2)
                            });
                            var selectors = {};selectors[that.catpropid1] = cat.name;selectors[that.catpropid2] = subcat.name;
                            that.hoverItems.push({
                                ID: 'i'+DQX.getNextUniqueID(),
                                px: (px1+px2)/2,
                                py: (py1+py2)/2,
                                content: label,
                                px1:px1, px2:px2, py1:py1, py2:py2,
                                selectors: selectors
                            });

                        });
                    }
                });


                that.plotPresent = true;
            };

            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.plotPresent) return;
                var hoverItem = null;
                $.each(that.hoverItems, function(idx, item) {
                    if ( (px0>=item.px1) && (px0<=item.px2) && (py0>=item.py2) && (py0<=item.py1) )
                        hoverItem = item;
                });
                if (hoverItem!=null) {
                    var tooltip = $.extend({},hoverItem);
                    tooltip.showPointer = true;
                    return tooltip;
                }
                return null;
            };

            that.onMouseClick = function(ev, info) {
                var tooltip = that.getToolTipInfo(info.x, info.y);
                if (tooltip) {

                    var qry= SQL.WhereClause.AND([]);
                    if (!that.theQuery.get().isTrivial)
                        qry.addComponent(that.theQuery.get());
                    $.each(tooltip.selectors, function(key, value) {
                        qry.addComponent(SQL.WhereClause.CompareFixed(key,'=',value));
                    });
                    var content = tooltip.content;
                    ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Bargraph bar', content, {
                        query: qry,
                        subSamplingOptions: that.theQuery.getSubSamplingOptions()
                    }, null);
                }
            }



            that.create();
            return that;
        }



        return BarGraph;
    });


