// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers",
    "Wizards/EditQuery", "MetaData", "Utils/QueryTool", "Plots/GenericPlot", "Plots/StandardLayoutPlot", "Utils/ButtonChoiceBox", "Utils/MiscUtils",
    "Plots/Tree/Tree"
],
    function (
        require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers,
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
            { id:'color', name:'Item color', dataType:'', requiredLevel: 0 }
        ];


        TreePlot.Create = function(tableid, startQuery, querySettings) {
            var that = StandardLayoutPlot.Create(tableid, TreePlot.typeID, {title: TreePlot.name}, startQuery, querySettings);
            that.treesMap = {};
            that.fetchCount = 0;

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

                that.ctrlTree = Controls.Combo(null,{ label:'Tree:<br>', states: that.tableInfo.trees, value:that.tableInfo.trees[0].id }).setClassID('tree');
                that.ctrlTree.setOnChanged(that.loadTree);

                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) )
                        propList.push({ id:prop.propid, name:prop.name });
                });
                that.ctrlValueColor = Controls.Combo(null,{ label:'Color:<br>', states: propList, value:that.providedAspect2Property('color') }).setClassID('color');
                that.ctrlValueColor.setOnChanged(function() {
                    that.fetchData();
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
                        that.ctrlTree,
                        that.ctrlValueColor,
                    ]).setMargin(10), {
                        title: 'Plot data',
                        bodyStyleClass: 'ControlsSectionBody'
                    }),


                ]).setMargin(0);
                that.addPlotSettingsControl('controls',controlsGroup);
                that.panelButtons.addControl(controlsGroup);

                that.loadTree();
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


                that.plotPresent = true;
            };

            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.plotPresent) return;
                return null;
            };


            that.onMouseClick = function(ev, info) {
                var tooltip = that.getToolTipInfo(info.x, info.y);
                if (tooltip) {
                    alert('Not implemented');
                }
            }


            that.onSelected = function(minX, minY, maxX, maxY, shiftPressed, controlPressed, altPressed) {
                alert('Not implemented');
            }


            that.create();
            return that;
        }



        return TreePlot;
    });


