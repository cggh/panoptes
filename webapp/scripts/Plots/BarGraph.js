define([
    "require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers",
    "Wizards/EditQuery", "MetaData", "Utils/QueryTool", "Plots/GenericPlot", "Plots/StandardLayoutPlot", "Utils/ButtonChoiceBox"
],
    function (
        require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers,
        EditQuery, MetaData, QueryTool, GenericPlot, StandardLayoutPlot, ButtonChoiceBox
        ) {

        var BarGraph = {};

        BarGraph.typeID = 'bargraph';
        BarGraph.name = 'Bar graph';
        BarGraph.description= 'Takes a <b>categorical property</b>, and plots the number of {items} for each state of this property. Optionally, a second categorical property can be used to overlay as a colour.';
        BarGraph.isCompatible = function(tableInfo) {
            return true;
        }



        GenericPlot.registerPlotType(BarGraph);

        BarGraph.Create = function(tableid, startQuery) {
            var that = StandardLayoutPlot.Create(tableid, BarGraph.typeID,
                {
                    title: BarGraph.name,
                    scrollHorizontal: true
                },
                startQuery);
            that.fetchCount = 0;
            that.showRelative = false;

            that.barW = 16;
            that.scaleW = 100;
            that.textH = 130;


            that.createPanelPlot = function() {
                that.panelPlot = FrameCanvas(that.framePlot);
                that.panelPlot.draw = that.draw;
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
            };

            that.createPanelButtons = function() {
                var ctrl_Query = that.theQuery.createControl();

                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Text') || (prop.datatype=='Boolean') ) )
                        propList.push({ id:prop.propid, name:prop.name });
                });
                that.ctrlCatProperty1 = Controls.Combo(null,{ label:'Group by:', states: propList }).setClassID('groupby');
                that.ctrlCatProperty1.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrlCatSort1 = Controls.Combo(null,{ label:'Sort by:', states: [{id:'cat', name:'Category'}, {id:'count', name:'Count'}] }).setClassID('sortby');
                that.ctrlCatSort1.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrlCatProperty2 = Controls.Combo(null, { label:'Secondary group:', states: propList }).setClassID('secgroup');
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
                    ctrl_Query,
                    Controls.VerticalSeparator(20),
                    that.ctrlCatProperty1,
                    that.ctrlCatSort1,
                    Controls.VerticalSeparator(20),
                    that.ctrlCatProperty2,
                    that.ctrlCatType,
                    Controls.VerticalSeparator(10),
                    that.colorLegend
                ]);
                that.addPlotSettingsControl('controls',controlsGroup);
                that.panelButtons.addControl(controlsGroup);

            };

            that.reloadAll = function() {
                that.fetchData();
            }

            that.fetchData = function() {
                that.catpropid1 = that.ctrlCatProperty1.getValue();
                that.catpropid2 = that.ctrlCatProperty2.getValue();
                if (!that.catpropid1)
                    return;
                if (that.staging)
                    return;
                DQX.setProcessing();
                var data ={};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.tableid = that.tableInfo.id + 'CMB_' + MetaData.workspaceid;
                data.propid1 = that.catpropid1;
                if (that.catpropid2)
                    data.propid2 = that.catpropid2;
                data.qry = SQL.WhereClause.encode(that.theQuery.get());
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
                $.each(categorycounts, function(idx, cnt) {
                    that.categories.push({ name:categories1[idx], count:cnt });
                    that.maxcount = Math.max(that.maxcount,cnt);
                });
                that.colorLegend.modifyValue('');
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
                $.each(categorycounts, function(idx, cnt) {
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
                var colormapper = MetaData.findProperty(that.tableInfo.id,that.catpropid2).category2Color;
                colormapper.map(subCats);

                var legendStr = '';
                $.each(subCats,function(idx, subcat) {
                    var color = DQX.Color(0.5,0.5,0.5);
                    if (colormapper.get(subcat)>=0)
                        color = DQX.standardColors[colormapper.get(subcat)];
                    legendStr+='<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}<br>'.DQXformat({
                        cl:color.toString(),
                        name:propInfo2.toDisplayString(subcat)
                    });
                });
                that.colorLegend.modifyValue(legendStr);

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

                that.plotH = drawInfo.sizeY - that.textH - 60;

                that.hoverItems = [];

                var totcount  = 0;
                $.each(that.categories, function(idx, cat) {
                    totcount += cat.count;
                });

                ctx.font="12px Arial";
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
                    ctx.fillText(propInfo1.toDisplayString(cat.name),0,0);
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

                    if (that.catpropid2) {
                        var colorMapper = MetaData.findProperty(that.tableInfo.id,that.catpropid2).category2Color;
                        var cumulcount = 0;
                        $.each(cat.subcats, function(idx, subcat) {
                            var h1 = cumulcount*1.0/sumcount * that.plotH;
                            var h2 = (cumulcount+subcat.count)*1.0/sumcount * that.plotH;
                            var py1 = drawInfo.sizeY-that.textH - Math.round(h1) + 0.5;
                            var py2 = drawInfo.sizeY-that.textH - Math.round(h2) + 0.5;
                            var colNr = colorMapper.get(subcat.name);
                            if (colNr>=0)
                                ctx.fillStyle=DQX.standardColors[colNr].toStringCanvas();
                            else
                                ctx.fillStyle='rgb(100,100,100)';
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
                    ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Bargraph bar', content, qry, null);
                }
            }



            that.theQuery.notifyQueryUpdated = that.updateQuery;
            that.create();
            return that;
        }



        return BarGraph;
    });


