// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
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

        Msg.listen('',{type:'OpenTree'}, function(scope, info) {
            var querySettings = {
                treeid: info.treeid
            };
            TreePlot.Create(info.tableid, SQL.WhereClause.Trivial(), querySettings);
        });

        TreePlot.typeID = 'TreePlot';
        TreePlot.name = 'Tree';
        TreePlot.description= 'Displays a pre-calculated, unrooted tree of {items}.';
        TreePlot.isCompatible = function(tableInfo) {
            return tableInfo.trees.length>0;
        }

        TreePlot.plotAspects = [
            { id:'label', name:'Label', dataType:'', requiredLevel: 0 },
            { id:'color', name:'Node color', dataType:'', requiredLevel: 0 },
            { id:'colorbranch', name:'Branch color', dataType:'Text', requiredLevel: 0 }
        ];


        TreePlot.Create = function(tableid, startQuery, querySettings, plotSettings) {
            var that = StandardLayoutPlot.Create(tableid, TreePlot.typeID, {title: TreePlot.name}, startQuery, querySettings, plotSettings);
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

                var startTreeId = that.tableInfo.trees[0].id;
                if (querySettings && querySettings.treeid)
                    startTreeId = querySettings.treeid;
                that.ctrlTree = Controls.Combo(null,{ label:'Tree:<br>', states: that.tableInfo.trees, value:startTreeId }).setClassID('tree');
                that.ctrlTree.setOnChanged(that.loadTree);

                var propList = [ {id:'', name:'-- None --'}];
                var propListText = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) ) {
                        propList.push({ id:prop.propid, name:prop.name, group:prop.group.Name });
                        if (prop.isText)
                            propListText.push({ id:prop.propid, name:prop.name, group:prop.group.Name });
                    }
                });
                that.ctrlValueLabel = Controls.Combo(null,{ label:'Label:<br>', states: propList, value:that.providedAspect2Property('label') }).setClassID('label');
                that.ctrlValueLabel.setOnChanged(function() {
                    that.fetchData();
                });
                that.ctrlValueColorNode = Controls.Combo(null,{ label:'Node colour:<br>', states: propList, value:that.providedAspect2Property('color') }).setClassID('color');
                that.ctrlValueColorNode.setOnChanged(function() {
                    that.fetchData();
                });
                that.ctrlValueColorBranch = Controls.Combo(null,{ label:'Branch colour:<br>', states: propListText, value:that.providedAspect2Property('colorbranch') }).setClassID('colorbranch');
                that.ctrlValueColorBranch.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrl_ColorDrawing = Controls.Combo(null,{ label:'Draw branch colour on:<br>', states: [{id: 'consensus', 'name':'Consensus branches'}, {id: 'leaf', 'name':'Leaf branches'}], value:'consensus' }).setClassID('drawcolor')
                    .setOnChanged(function() {
                        that.reDraw();
                    });
                that.ctrl_SelDrawing = Controls.Combo(null,{ label:'Draw selection on:<br>', states: [{id: 'node', 'name':'Nodes only'}, {id: 'leaf', 'name':'Leaf branches'}, {id: 'consensus1', 'name':'Branches (all selected)'}, {id: 'consensus2', 'name':'Branches (some selected)'}], value:'node' }).setClassID('drawsel')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_RotateLabels = Controls.Check(null,{label:'Rotate labels', value:true}).setClassID('rotatelabels')
                    .setOnChanged(function() {
                        that.reDraw();
                    });

                that.ctrl_ShowInternalNodes = Controls.Check(null,{label:'Show internal nodes', value:false}).setClassID('showinternalnodes')
                    .setOnChanged(function() {
                    that.reDraw();
                });

                that.ctrl_Stabilise = Controls.Check(null,{label:'Stabilise', value:false}).setClassID('stabilise')
                    .setOnChanged(function() {
                        that.tuneTree();
                        that.reDraw();
                    });

                that.colorLegend = Controls.Html(null,'');

                that.ctrl_Description = Controls.Html(null,'');
                that.ctrl_crossLink = Controls.Hyperlink(null, {content: 'xxx'}).setOnChanged(function() {
                    MiscUtils.openCrossLink(that.crossLinkInfo);
                });
                that.ctrl_ShowHideCrossLink = Controls.ShowHide(that.ctrl_crossLink);
                that.ctrl_ShowHideCrossLink.setVisible(false);


                var cmdPointSelection = Controls.Button(null, { icon: 'fa-crosshairs', content: 'Select points...', buttonClass: 'PnButtonGrid', width:80, height:30}).setOnChanged(function () {
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
                            var polygonPoints = [];
                            $.each(selectedPoints, function(idx, pt) {
                                polygonPoints.push({
                                    x: (pt.x-that.offsetX)/that.scaleX,
                                    y: (pt.y-that.offsetY)/that.scaleY
                                });
                            });
                            if (!that.allDataPresent()) return;
                            var selectionCreationFunction = function() {
                                var sellist = [];
                                var selectPoints = function(branch) {
                                    if (branch.itemid) {
                                        if (isPointInPoly(selectedPoints, {x: branch.screenX, y:branch.screenY}))
                                            sellist.push(branch.itemid);
                                    }
                                    $.each(branch.children, function(idx, child) { selectPoints(child); });
                                }
                                selectPoints(that.currentTree.root);
                                return sellist;
                            };
                            ButtonChoiceBox.createPlotItemSelectionOptions(that, that.tableInfo, 'Tree lasso selection', '', null, selectionCreationFunction);
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
                    that.createIntroControls([that.ctrl_Description, that.ctrl_ShowHideCrossLink]) ,
                    Controls.AlignCenter(Controls.CompoundHor([
                        cmdPointSelection,
                        Controls.HorizontalSeparator(95)
                    ])),
                    Controls.VerticalSeparator(10),
                    Controls.VerticalSeparator(20),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrlTree,
                        that.ctrlValueLabel,
                        that.ctrlValueColorNode,
                        that.ctrlValueColorBranch
                    ]).setMargin(10), {
                        title: 'Plot data',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),

                    Controls.Section(Controls.CompoundVert([
                        that.ctrl_SizeFactor,
                        that.ctrl_Opacity,
                        that.ctrl_BranchOpacity,
                        that.ctrl_ColorDrawing,
                        that.ctrl_SelDrawing,
                        that.ctrl_RotateLabels,
                        that.ctrl_ShowInternalNodes,
                        that.ctrl_Stabilise
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
                that.colorNodePropId = null;
                if (that.ctrlValueColorNode.getValue()) {
                    that.colorNodePropId = that.ctrlValueColorNode.getValue();
                    if (!that.pointData[that.colorNodePropId])
                        fetcher.addColumn(that.colorNodePropId, 'ST');
                }
                that.colorBranchPropId = null;
                if (that.ctrlValueColorBranch.getValue()) {
                    that.colorBranchPropId = that.ctrlValueColorBranch.getValue();
                    if (!that.pointData[that.colorBranchPropId])
                        fetcher.addColumn(that.colorBranchPropId, 'ST');
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
                            that.tuneTree();
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
                    that.updateTreeInfo();
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
                    that.currentTree.name = resp.name;
                    that.currentTree.load(JSON.parse(resp.settings), resp.data);
                    that.tuneTree();
                    that.currentTree.layout(that.ctrl_Stabilise.getValue()?that.mapItemAngles:null);
                    that.panelPlot.setXRange(0,1);
                    that.panelPlot.setYRange(0,1);
                    that.updateTreeInfo();
                    that.reDraw();
                });

            }


            that.tuneTree = function() {
                if ( (!that.currentTree) || (!that.pointIndex) )
                    return;

                if (that.ctrl_Stabilise.getValue()) {
                    var rndIter = function(val) {
                        for (var i=0; i<5; i++)
                            val =  (val * 9301 + 49297) % 233280;
                        return val;
                    }

                    var rndIndex = {};
                    $.each(that.pointIndex, function(key, val) {
                        rndIndex[key] = rndIter(val);
                    });

                    that.currentTree.optimizeOrdering(rndIndex);
                }

            }


            that.updateTreeInfo = function() {
                var descr = '';
                if (that.currentTree.name)
                    descr += '<b>' + that.currentTree.name + '.</b> ';
                if (that.currentTree.settings.Description)
                    descr += that.currentTree.settings.Description;
                that.ctrl_Description.modifyValue(descr);
                that.crossLinkInfo = null;
                if (that.currentTree.settings.CrossLink) {
                    that.crossLinkInfo = MiscUtils.parseCrossLink(that.currentTree.settings.CrossLink);
                    that.ctrl_crossLink.modifyValue('<span class="fa fa-external-link-square" style="font-size: 120%"></span> Open associated <b>' + that.crossLinkInfo.dispName + '</b>');
                    that.ctrl_ShowHideCrossLink.setVisible(true);
                }
            }

            that.allDataPresent = function() {
                return that.currentTree && that.currentTree.root && that.itemDataLoaded;
            }

            that.reDraw = function() {
                that.panelPlot.render();
            }

            that.drawCenter = function(drawInfo) {
                var ctx = drawInfo.ctx;
                ctx.globalAlpha = 1;
                if (!that.allDataPresent())
                    return;

                var sizeFactor =that.ctrl_SizeFactor.getValue();
                var opacity = that.ctrl_Opacity.getValue();
                var opacityBranch = that.ctrl_BranchOpacity.getValue();
                var colorOnConsensusBranch = (that.ctrl_ColorDrawing.getValue() == 'consensus');
                var selOnLeafBranch = (that.ctrl_SelDrawing.getValue() != 'node');
                var selConsensusStrictBranch = (that.ctrl_SelDrawing.getValue() == 'consensus1');
                var selConsensusRelaxedBranch = (that.ctrl_SelDrawing.getValue() == 'consensus2');
                var showInternalNodes = that.ctrl_ShowInternalNodes.getValue();
                var rotateLabels = that.ctrl_RotateLabels.getValue();

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


                var blackNodeColorString = DQX.Color(0,0,0,opacity).toStringCanvas();
                var blackBranchColorString = DQX.Color(0,0,0,opacityBranch).toStringCanvas();
                var internalNodeColorString = DQX.Color(0,0,0,0.5*opacity).toStringCanvas();
                var selBranchColorString = DQX.Color(1,0,0,opacityBranch).toStringCanvas();

                ctx.font="11px Arial";
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.strokeStyle = blackBranchColorString;

                var legendStr = '';
                var colorDataNodes = null;
                if (that.colorNodePropId) {
                    var catPropInfo = MetaData.findProperty(that.tableInfo.id, that.colorNodePropId);
                    var catProps = that.pointData[that.colorNodePropId];
                    for (var i=0; i<catProps.length; i++)
                        catProps[i] = catPropInfo.toDisplayString(catProps[i]);
                    var maprs = catPropInfo.mapColors(catProps);
                    colorDataNodes = maprs.indices;
                    that.mappedNodeColorStrings = [];
                    $.each(maprs.colors, function(idx, color) {
                        that.mappedNodeColorStrings.push(color.changeOpacity(opacity).toStringCanvas());
                    });
                    if (that.colorBranchPropId && (that.colorBranchPropId != that.colorNodePropId))
                        legendStr += '<b>Node colors:</b><br>';
                    $.each(maprs.legend,function(idx, legendItem) {
                        legendStr+='<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}<br>'.DQXformat({cl:legendItem.color.toString(), name:legendItem.state});
                    });
                }
                var colorDataBranches = null;
                if (that.colorBranchPropId) {
                    var catPropInfo = MetaData.findProperty(that.tableInfo.id, that.colorBranchPropId);
                    var catProps = that.pointData[that.colorBranchPropId];
                    for (var i=0; i<catProps.length; i++)
                        catProps[i] = catPropInfo.toDisplayString(catProps[i]);
                    var maprs = catPropInfo.mapColors(catProps);
                    colorDataBranches = maprs.indices;
                    that.mappedBranchColorStrings = [];
                    $.each(maprs.colors, function(idx, color) {
                        that.mappedBranchColorStrings.push(color.changeOpacity(opacityBranch).toStringCanvas());
                    });
                    if (that.colorBranchPropId != that.colorNodePropId) {
                        legendStr += '<br><b>Branch colours:</b><br>';
                        $.each(maprs.legend,function(idx, legendItem) {
                            legendStr+='<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}<br>'.DQXformat({cl:legendItem.color.toString(), name:legendItem.state});
                        });
                    }
                }
                that.colorLegend.modifyValue(legendStr);

                that.mapItemAngles = {};

                var drawBranch = function(branch) {
                    branch.colorIndexNode = -1;
                    branch.colorIndexBranch = -1;
                    branch.selected = false;
                    if (branch.itemid) {
                        var idx = that.pointIndex[branch.itemid];
                        if (idx!=null) {
                            that.mapItemAngles[branch.itemid] = branch.absoluteAngle;
                            if (colorDataNodes)
                                branch.colorIndexNode = colorDataNodes[idx];
                            if (colorDataBranches)
                                branch.colorIndexBranch = colorDataBranches[idx];
                            if (selectionMap[branch.itemid])
                                branch.selected = true;
                        }
                    }
                    var px1 = Math.round(branch.posX * scaleX + offsetX);
                    var py1 = Math.round(branch.posY * scaleY + offsetY);
                    branch.screenX = px1;
                    branch.screenY = py1;

                    // Draw children first
                    var newColorIndexBranch = -1;
                    var hasSubSel = false;
                    var hasSubNonSel = false;
                    $.each(branch.children, function(idx, child) {
                        drawBranch(child);
                        if (colorOnConsensusBranch)
                            if (newColorIndexBranch==-1)
                                newColorIndexBranch = child.colorIndexBranch;
                            else
                                if (newColorIndexBranch != child.colorIndexBranch)
                                    newColorIndexBranch = -2;
                        if (child.selected)
                            hasSubSel = true;
                        else
                            hasSubNonSel = true;
                    });
                    if (!branch.itemid) {
                        branch.colorIndexBranch = newColorIndexBranch;
                        if (selConsensusStrictBranch)
                            branch.selected = !hasSubNonSel;
                        if (selConsensusRelaxedBranch)
                            branch.selected = hasSubSel;
                    }

                    if (branch.parent) {
                        var px0 = branch.parent.screenX;
                        var py0 = branch.parent.screenY;
                        if (that.colorBranchPropId) {
                            if (branch.colorIndexBranch>=0)
                                ctx.strokeStyle = that.mappedBranchColorStrings[branch.colorIndexBranch];
                            else
                                ctx.strokeStyle = blackBranchColorString;
                        }
                        if (selOnLeafBranch) {
                            if (branch.selected)
                                ctx.strokeStyle = selBranchColorString;
                            else
                                ctx.strokeStyle = blackBranchColorString;
                        }
                        ctx.beginPath();
                        ctx.moveTo(px0, py0);
                        ctx.lineTo(px1, py1);
                        ctx.stroke();
                    }

                    if (branch.itemid) {
                        if (idx!=null) {
                            if (branch.selected) {
                                selpsX.push(branch.screenX);
                                selpsY.push(branch.screenY);
                            }
                            if (branch.colorIndexNode>=0)
                                ctx.fillStyle = that.mappedNodeColorStrings[branch.colorIndexNode];
                            else
                                ctx.fillStyle = blackNodeColorString;
                            ctx.beginPath();
                            ctx.arc(px1, py1, 3*sizeFactor, 0, 2 * Math.PI, false);
                            ctx.fill();
                            if (that.labelPropId) {
                                var xoffset = 3*sizeFactor+1;
                                if (branch.pointingLeft) {
                                    ctx.textAlign="right";
                                    xoffset = -xoffset;
                                }
                                else {
                                    ctx.textAlign="left";
                                }
                                if (rotateLabels) {
                                    ctx.save();
                                    ctx.translate(px1,py1);
                                    var ang = branch.absoluteAngle;
                                    if (branch.pointingLeft)
                                        ang -= Math.PI;
                                    ctx.rotate(ang);
                                    ctx.fillText(that.pointData[that.labelPropId][idx], xoffset,4);
                                    ctx.restore();
                                }
                                else
                                    ctx.fillText(that.pointData[that.labelPropId][idx], px1+xoffset, py1+4);
                            }
                        }
                    }
                    else {
                        if (showInternalNodes) {
                            ctx.fillStyle = internalNodeColorString;
                            ctx.beginPath();
                            ctx.arc(px1, py1, 2*sizeFactor, 0, 2 * Math.PI, false);
                            ctx.fill();
                        }
                    }

                }

                var selpsX = [];
                var selpsY = [];
                ctx.strokeStyle = blackBranchColorString;
                ctx.lineWidth = 1;
                drawBranch(that.currentTree.root);

                if (!that.colorNodePropId) {
                    ctx.fillStyle=DQX.Color(1,0,0,0.25*opacity).toStringCanvas();
                    ctx.strokeStyle=DQX.Color(1,0,0,opacity).toStringCanvas();
                }
                else {
                    ctx.fillStyle=DQX.Color(0,0,0,0.0*(0.5+0.5*opacity)).toStringCanvas();
                    ctx.strokeStyle=DQX.Color(0,0,0,1*(0.5+0.5*opacity)).toStringCanvas();
                    ctx.lineWidth = 2;
                }
                for (var i=0; i<selpsX.length; i++) {
                    ctx.beginPath();
                    ctx.arc(selpsX[i], selpsY[i], 2*sizeFactor+3, 0, 2 * Math.PI, false);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }

            };



            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.allDataPresent())
                    return;
                var mindst = 12;
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
                    if (that.colorNodePropId && (that.colorNodePropId!=that.tableInfo.primkey))
                        content += '<br>' + that.pointData[that.colorNodePropId][idx];
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


