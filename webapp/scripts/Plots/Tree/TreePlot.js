// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvasXYPlot", "DQX/DataFetcher/DataFetchers",
    "Wizards/EditQuery", "MetaData", "Utils/QueryTool", "Plots/GenericPlot", "Plots/StandardLayoutPlot", "Utils/ButtonChoiceBox", "Utils/MiscUtils",
    "Plots/Tree/Tree"
],
    function (
        require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvasXYPlot, DataFetchers,
        EditQuery, MetaData, QueryTool, GenericPlot, StandardLayoutPlot, ButtonChoiceBox, MiscUtils,
        Tree
        ) {

        var TreePlot = {};

        TreePlot.typeID = 'TreePlot';
        TreePlot.name = 'Tree';
        TreePlot.description= 'Displays a pre-calculated, unrooted tree of {items}.';
        TreePlot.isCompatible = function(tableInfo) {
            return tableInfo.trees.length>0;
        }

        TreePlot.plotAspects = [
            { id:'label', name:'Label', dataType:'', requiredLevel: 0 },
            { id:'color', name:'Item color', dataType:'', requiredLevel: 0 }
        ];


        TreePlot.Create = function(tableid, startQuery, querySettings) {
            var that = StandardLayoutPlot.Create(tableid, TreePlot.typeID, {title: TreePlot.name}, startQuery, querySettings);
            that.treesMap = {};
            that.fetchCount = 0;
            that.pointData = {};//first index: property id, second index: point nr

            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid,{ type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid)
                    that.reDraw();
            } );


            that.createPanelPlot = function() {
                that.panelPlot = FrameCanvasXYPlot(that.framePlot);
                that.panelPlot.scaleMarginX = 0;
                that.panelPlot.scaleMarginY = 0;
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
                that.panelPlot.drawCenter = that.drawCenter;
            }

            that.createPanelButtons = function() {
                //that.ctrl_PointCount = Controls.Html(null, '');

                that.ctrlTree = Controls.Combo(null,{ label:'Tree:<br>', states: that.tableInfo.trees, value:that.tableInfo.trees[0].id }).setClassID('tree');
                that.ctrlTree.setOnChanged(that.loadTree);

                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) )
                        propList.push({ id:prop.propid, name:prop.name });
                });
                that.ctrlValueLabel = Controls.Combo(null,{ label:'Label:<br>', states: propList, value:that.providedAspect2Property('label') }).setClassID('label');
                that.ctrlValueLabel.setOnChanged(function() {
                    that.fetchData();
                });
                that.ctrlValueColor = Controls.Combo(null,{ label:'Color:<br>', states: propList, value:that.providedAspect2Property('color') }).setClassID('color');
                that.ctrlValueColor.setOnChanged(function() {
                    that.fetchData();
                });

                that.colorLegend = Controls.Html(null,'');

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

                that.ctrl_SizeFactor = Controls.ValueSlider(null, {label: 'Point size factor', width: 180, minval:0, maxval:2, value:1, digits: 2})
                    .setNotifyOnFinished().setClassID('sizefactor')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_Opacity = Controls.ValueSlider(null, {label: 'Point opacity', width: 180, minval:0, maxval:1, value:1, digits: 2})
                    .setNotifyOnFinished().setClassID('opacity')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_BranchOpacity = Controls.ValueSlider(null, {label: 'Branch opacity', width: 180, minval:0, maxval:1, value:0.25, digits: 2})
                    .setNotifyOnFinished().setClassID('branchopacity')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                var controlsGroup = Controls.CompoundVert([
                    that.createIntroControls(),
                    Controls.AlignCenter(Controls.CompoundHor([
                        cmdPointSelection,
                        Controls.HorizontalSeparator(95)
                    ])),
                    Controls.VerticalSeparator(20),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrlTree,
                        that.ctrlValueLabel,
                        that.ctrlValueColor
                    ]).setMargin(10), {
                        title: 'Plot data',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrl_SizeFactor,
                        that.ctrl_Opacity,
                        that.ctrl_BranchOpacity
                    ]).setMargin(10), {
                        title: 'Layout',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        that.colorLegend
                    ]).setMargin(10), {
                        title: 'Color legend',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                ]).setMargin(0);
                that.addPlotSettingsControl('controls',controlsGroup);
                that.panelButtons.addControl(controlsGroup);

                that.loadTree();
                that.reloadAll();
            };


            that.setActiveQuery = function(qry) {
                that.theQuery.modify(qry);
            }

            that.updateQuery = function() {
                that.fetchData();
            }

            that.reloadAll = function() {
                that.pointData = {}; // remove all stored data
                that.fetchData();
            }

            that.fetchData = function() {
                var fetcher = DataFetchers.RecordsetFetcher(
                    MetaData.serverUrl,
                    MetaData.database,
                    that.tableInfo.getQueryTableName(that.theQuery.isSubSampling())
                );
                fetcher.setMaxResultCount(that.tableInfo.settings.MaxCountQueryRecords);
                //that.ctrl_PointCount.modifyValue('--- data points');

                that.itemDataLoaded = false;
                that.colorLegend.modifyValue('');

                var sortField = that.tableInfo.primkey;

                if (!that.pointData[that.tableInfo.primkey])
                    fetcher.addColumn(that.tableInfo.primkey, 'ST');
                that.colorPropId = null;
                if (that.ctrlValueColor.getValue()) {
                    that.colorPropId = that.ctrlValueColor.getValue();
                    if (!that.pointData[that.colorPropId])
                        fetcher.addColumn(that.colorPropId, 'ST');
                }

                that.labelPropId = null;
                if (that.ctrlValueLabel.getValue()) {
                    that.labelPropId = that.ctrlValueLabel.getValue();
                    if (!that.pointData[that.labelPropId])
                        fetcher.addColumn(that.labelPropId, 'ST');
                }

                if (fetcher.getColumnIDs().length <= 0) {
                    that.itemDataLoaded = true;
                    that.reDraw();
                    return;
                }

                var requestID = DQX.getNextUniqueID();
                that.requestID = requestID;
                var selectionInfo = that.tableInfo.currentSelection;
                DQX.setProcessing();
                var qry = that.theQuery.getForFetching();

                fetcher.getData(qry, sortField,
                    function (data) { //success
                        DQX.stopProcessing();
                        if (that.requestID == requestID) {
                            //debugger;
                                var resultpointcount = 0;
                                if (!that.pointData[that.tableInfo.primkey]) {//build item index
                                    that.pointIndex = {};
                                    $.each(data[that.tableInfo.primkey], function(idx, itemid) {
                                        that.pointIndex[itemid] = idx;
                                    });
                                }
                                $.each(data, function(id, values) {
                                    that.pointData[id] = values;
                                    resultpointcount = values.length;
                                });
                            that.itemDataLoaded = true;
                            that.reDraw();
                        }
                    },
                    function (data) { //error
                        DQX.stopProcessing();
                        that.fetchCount -= 1;
                    }

                );
            }

            that.loadTree = function() {
                that.currentTreeId = that.ctrlTree.getValue();
                that.currentTree = that.treesMap[that.currentTreeId];
                if (that.currentTree) {
                    that.reDraw();
                    return;
                }

                DQX.setProcessing();
                var data ={};
                data.database = MetaData.database;
                data.tableid = that.tableInfo.id;
                data.graphid = that.currentTreeId;
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'getgraph', data, function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    that.currentTree = Tree();
                    that.currentTree.load(resp.settings, resp.data);
                    that.currentTree.layout();
                    that.panelPlot.setXRange(0,1);
                    that.panelPlot.setYRange(0,1);
                    that.reDraw();
                });

            }

            that.allDataPresent = function() {
                return that.currentTree && that.currentTree.root && that.itemDataLoaded;
            }

            that.reDraw = function() {
                that.panelPlot.render();
            }

            that.drawCenter = function(drawInfo) {
                var ctx = drawInfo.ctx;
                if (!that.allDataPresent())
                    return;

                var sizeFactor =that.ctrl_SizeFactor.getValue();
                var opacity = that.ctrl_Opacity.getValue();
                var opacityBranch = that.ctrl_BranchOpacity.getValue();

                var selectionMap = that.tableInfo.currentSelection;

                var treeSizeX = that.currentTree.boundingBox.maxX-that.currentTree.boundingBox.minX;
                var treeSizeY = that.currentTree.boundingBox.maxY-that.currentTree.boundingBox.minY;
                var treeSizeMax = Math.max(treeSizeX, treeSizeY);

                var zoom_scaleX = Math.abs(that.panelPlot.getXScale()/drawInfo.sizeX);
                var zoom_offsetX = that.panelPlot.getXOffset();
                var zoom_scaleY = Math.abs(that.panelPlot.getYScale()/drawInfo.sizeY);
                var zoom_offsetY = that.panelPlot.getYOffset();//-drawInfo.sizeY;

                var marginfac = 0.2;
                var fcx = drawInfo.sizeX / treeSizeX;
                var fcy = drawInfo.sizeY / treeSizeY;
                var fc = Math.min(fcx, fcy);
                scaleX = fc/(1+2*marginfac);
                scaleY = fc/(1+2*marginfac);

                offsetX = -1 * that.currentTree.boundingBox.minX *scaleX + treeSizeX*scaleX*marginfac;
                offsetY = -1 * that.currentTree.boundingBox.minY *scaleY + treeSizeY*scaleY*marginfac;

                offsetX = offsetX*zoom_scaleX + zoom_offsetX;
                offsetY = offsetY*zoom_scaleY + zoom_offsetY - drawInfo.sizeY*zoom_scaleY;

                scaleX *= zoom_scaleX;
                scaleY *= zoom_scaleY;


                ctx.font="11px Arial";
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.strokeStyle = DQX.Color(0,0,0,opacityBranch).toStringCanvas();

                var catData = null;
                if (that.colorPropId) {
                    var catPropInfo = MetaData.findProperty(that.tableInfo.id, that.colorPropId);
                    var catProps = that.pointData[that.colorPropId];
                    for (var i=0; i<catProps.length; i++)
                        catProps[i] = catPropInfo.toDisplayString(catProps[i]);
                    var maprs = catPropInfo.mapColors(catProps);
                    catData = maprs.indices;
                    that.mappedColors = [];
                    $.each(maprs.colors, function(idx, color) {
                        that.mappedColors.push(color.changeOpacity(opacity));
                    });
                    var legendStr = '';
                    $.each(maprs.legend,function(idx, legendItem) {
                        legendStr+='<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}<br>'.DQXformat({cl:legendItem.color.toString(), name:legendItem.state});
                    });
                    that.colorLegend.modifyValue(legendStr);
                }

                var drawBranch = function(branch) {
                    var px1 = Math.round(branch.posX * scaleX + offsetX);
                    var py1 = Math.round(branch.posY * scaleY + offsetY);
                    branch.screenX = px1;
                    branch.screenY = py1;
                    if (branch.parent) {
                        var px0 = branch.parent.screenX;
                        var py0 = branch.parent.screenY;
                        ctx.beginPath();
                        ctx.moveTo(px0, py0);
                        ctx.lineTo(px1, py1);
                        ctx.stroke();
                    }


                    if (!branch.parent) {
                        ctx.beginPath();
                        ctx.arc(px1, py1, 4, 0, 2 * Math.PI, false);
                        ctx.fill();
                    }

                    if (branch.itemid) {
                        var idx = that.pointIndex[branch.itemid];
                        if (idx!=null) {
                            if (selectionMap[branch.itemid]) {
                                selpsX.push(branch.screenX);
                                selpsY.push(branch.screenY);
                            }
                            if (catData)
                                ctx.fillStyle = that.mappedColors[catData[idx]].toStringCanvas();
                            else
                                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                            ctx.beginPath();
                            ctx.arc(px1, py1, 3*sizeFactor, 0, 2 * Math.PI, false);
                            ctx.fill();
                            if (that.labelPropId) {
                                var xoffset = 3;
                                if (branch.pointingLeft) {
                                    ctx.textAlign="right";
                                    xoffset = -3
                                }
                                else {
                                    ctx.textAlign="left";
                                }
                                ctx.fillText(that.pointData[that.labelPropId][idx], px1+xoffset, py1+4);
                            }
                        }
                    }
                    else {
                        ctx.fillStyle = 'rgba(0,0,0,0.25)';
                        ctx.beginPath();
                        ctx.arc(px1, py1, 3*sizeFactor, 0, 2 * Math.PI, false);
                        ctx.fill();
                    }

                    $.each(branch.children, function(idx, child) { drawBranch(child); });
                }

                var selpsX = [];
                var selpsY = [];
                drawBranch(that.currentTree.root);

                ctx.fillStyle=DQX.Color(1,0,0,0.25*opacity).toStringCanvas();
                ctx.strokeStyle=DQX.Color(1,0,0,0.75*opacity).toStringCanvas();
                for (var i=0; i<selpsX.length; i++) {
                    ctx.beginPath();
                    ctx.arc(selpsX[i], selpsY[i], 2*sizeFactor+2, 0, 2 * Math.PI, false);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }

            };



            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.allDataPresent())
                    return;
                var mindst = 9;
                var bestBranch = null;
                var findPoint = function(branch) {
                    if (branch.itemid) {
                        var dst = Math.abs(px0-branch.screenX) + Math.abs(py0-branch.screenY);
                        if (dst<=mindst) {
                            mindst = dst;
                            bestBranch = branch;
                        }
                    }
                    $.each(branch.children, function(idx, child) { findPoint(child); });
                }
                findPoint(that.currentTree.root);
                if (bestBranch) {
                    var idx = that.pointIndex[bestBranch.itemid];
                    var content = bestBranch.itemid;
                    if (that.labelPropId && (that.labelPropId!=that.tableInfo.primkey))
                        content += '<br>' + that.pointData[that.labelPropId][idx];
                    if (that.colorPropId && (that.colorPropId!=that.tableInfo.primkey))
                        content += '<br>' + that.pointData[that.colorPropId][idx];
                    return {
                        itemid: bestBranch.itemid,
                        ID: bestBranch.itemid,
                        px: bestBranch.screenX,
                        py: bestBranch.screenY,
                        showPointer:true,
                        content: content
                    };
                }
                else
                    return null;
            };


            that.onMouseClick = function(ev, info) {
                var tooltip = that.getToolTipInfo(info.x, info.y);
                if (tooltip) {
                    Msg.send({ type: 'ItemPopup' }, { tableid: that.tableInfo.id, itemid: tooltip.itemid } );
                }
            }


            that.onSelected = function(minX, minY, maxX, maxY, shiftPressed, controlPressed, altPressed) {
                if (!that.allDataPresent())
                    return;
                var selectionCreationFunction = function() {
                    var sellist = [];
                    var selectPoints = function(branch) {
                        if (branch.itemid) {
                            if ( (branch.screenX>=minX) && (branch.screenX<=maxX) && (branch.screenY>=minY) && (branch.screenY<=maxY) )
                                sellist.push(branch.itemid);
                        }
                        $.each(branch.children, function(idx, child) { selectPoints(child); });
                    }
                    selectPoints(that.currentTree.root);
                    return sellist;
                };

                ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Tree selection', '', null, selectionCreationFunction);
            }


            that.updateQuery = function() {
                that.reloadAll();
            }

            that.create();
            return that;
        }



        return TreePlot;
    });


