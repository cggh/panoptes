// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "_", "d3", "blob", "filesaver", "DQX/Model", "DQX/SQL", "DQX/Framework", "DQX/ArrayBufferClient", "DQX/Controls", "DQX/Msg", "DQX/Utils",
    "DQX/ChannelPlot/ChannelCanvas", "Utils/QueryTool", "Utils/AnimatedIcon", "Utils/Serialise", "MetaData", "Views/Genotypes/Model",
     "Views/Genotypes/View"],
    function (require, _, d3, Blob, FileSaver, DQXModel, SQL, Framework, ArrayBufferClient,
              Controls, Msg, DQX, ChannelCanvas, QueryTool, AnimatedIcon, Serialise, MetaData, Model,
               View) {

        var GenotypeChannel = {};

        GenotypeChannel.Channel = function (table_info, controls_group, parent) {
            var id = table_info.id+'_genotypes';
            var that = ChannelCanvas.Base(id);

            that.init = function(table_info, controls_group, parent) {
                that._height = 400;
                that.loadIcon = AnimatedIcon('Bitmaps/Icons/Canvas/preloader.png', 35, 35, 12, 1000);
                that._toolTipHandler = null;
                that._clickHandler = null;
                that._always_call_draw = true;
                that._title = table_info.name;
                that.parent_browser = parent;
                that.table_info = table_info;

                that.rowTableInfo = that.table_info.row_table;


                var model_params = DQXModel({
                  col_query: SQL.WhereClause.Trivial(),
                  row_query: SQL.WhereClause.Trivial(),
                  col_order: table_info.col_table.PositionField,
                  row_order: table_info.row_table.primkey,
                  width_mode:'auto',
                  user_column_width: 1,
                  page_length: 50,
                  page: 1,
                  row_sort_columns: []
                });

                that.model = Model(table_info,
                                   _.map(MetaData.chromosomes, DQX.attr('id')),
                                   that._draw,
                                   model_params.get()
                );

                //Create controls
                that.download_button = Controls.Button(null, {content:'Download View', buttonClass: 'PnButtonGrid', width:120, height:30, icon:'fa-download'})
                .setOnChanged(that.download_view);

                var view_controls = Controls.CompoundVert([]);
                view_controls.addControl(that.createVisibilityControl());

                var view_params = DQXModel({
                  samples_property:that.rowTableInfo.primkey,
                  row_height:11,
                  alpha_channel:(that.model.settings.ExtraProperties &&
                    that.model.settings.ExtraProperties[0] ?
                    that.model.settings.ExtraProperties[0] : '__null'),
                  height_channel:(that.model.settings.ExtraProperties &&
                    that.model.settings.ExtraProperties[1] ?
                    that.model.settings.ExtraProperties[1] : '__null'),
                  colour_channel: that.model.settings.Call ? 'call' : 'fraction'
                });

                view_params.on({}, function() {
                    that.view.update_params(this.get());
                    //None of these controls change the horizontal region so it is safe to just call the internal redraw.
                    that._draw();
                });
                model_params.on({}, function() {
                    that.model.update_params(this.get());
                    //Call the full draw as we need to refresh data and column placement
                    that.draw(that.draw_info);
                });

                var states = [];
                var property_names = {};
                $.each(that.rowTableInfo.propertyGroups, function(idx1, propertyGroup) {
                    $.each(propertyGroup.properties, function(idx2, propInfo) {
                        property_names[propInfo.propid] = propInfo.name;
                        if (propInfo.settings.showInTable || propInfo.isPrimKey)
                            states.push({id: propInfo.propid, name: propInfo.name})
                    });
                });

                var controlsGridData = [];

                var controlWidth = 125;

                var sampleProperty_channel = Controls.Combo(null, { label:'', states:states, width:controlWidth})
                    .bindToModel(view_params, 'samples_property').setClassID(that.table_info.id + 'SamplesLabel');

//                var buttonSortSamplesByField = Controls.Hyperlink(null, {content: '&nbsp;<span class="fa fa-sort-amount-asc" style="font-size:110%"></span>&nbsp;'}).setOnChanged(function() {
//                      model_params.set({
//                          row_order: view_params.get('samples_property'),
//                          row_sort_columns: []
//                      });
//                });

                var buttonSortSamplesByField = Controls.Button(null, {content: 'Current Label', buttonClass: 'PnButtonGrid', width:120, height:10, iconWidth:16, icon:'fa-sort-amount-asc'}).setOnChanged(function() {
                    model_params.set({
                        row_order: view_params.get('samples_property'),
                        row_sort_columns: []
                    });
                });

                var buttonSortSamplesByColumn = Controls.Button(null, {content: 'Selected Columns', buttonClass: 'PnButtonGrid', width:120, height:10, iconWidth:16, icon:'fa-sort-amount-asc'}).setOnChanged(function() {
                    model_params.set({
                            row_order: 'columns',
                            row_sort_columns: _.keys(that.table_info.col_table.currentSelection)
                        });

                });

                that.sort_display = Controls.Html(null, that.model.row_order);
                that.sort_display.bindToModel(model_params, 'row_order', null, function(id) {
                    if (id == 'columns')
                        return that.table_info.col_table[that.model.row_sort_columns.length === 1 ? 'tableCapNameSingle' : 'tableCapNamePlural'];
                    return property_names[id] || 'Unset';
                });
                controlsGridData.push({ label:'Current Sort', ctrl: that.sort_display });
                controlsGridData.push({ label:null, ctrl: buttonSortSamplesByColumn});
                controlsGridData.push({ label:null, ctrl: buttonSortSamplesByField});
                controlsGridData.push({ label:'Row Label', ctrl: sampleProperty_channel });

                var cell_colour_states = [];
                if (that.model.settings.Call)
                    cell_colour_states.push({id:'call', name:'Call'});
                if (that.model.settings.AlleleDepth)
                    cell_colour_states.push({id:'fraction', name:'Alt Read Fraction'});
                var colour_channel = Controls.Combo(null, { label:'', states:cell_colour_states, width:controlWidth })
                    .bindToModel(view_params, 'colour_channel').setClassID(that.table_info.id + 'ChannelColour');
                controlsGridData.push({ label:'Cell', ctrl: colour_channel });

                var states = _.map(that.model.settings.ExtraProperties, function(prop) {
                    return {id:prop, name:that.table_info.properties[prop].name};
                });
                states.push({id:'__null', name:'None'});
                var alpha_channel = Controls.Combo(null, { label:'', states:states, width:controlWidth })
                    .bindToModel(view_params, 'alpha_channel').setClassID(that.table_info.id + 'ChannelAlpha');
                controlsGridData.push({ label:'Cell Alpha', ctrl: alpha_channel });
                var height_channel = Controls.Combo(null, { label:'', states:states, width:controlWidth })
                    .bindToModel(view_params, 'height_channel').setClassID(that.table_info.id + 'ChannelHeight');
                controlsGridData.push({ label:'Cell Height', ctrl: height_channel });

                var states = [{id:'auto', name:'Automatic width'}, {id:'fill', name:'Fill Width'}, {id:'manual', name:'Manual Width'}];
                var width_mode = Controls.Combo(null, { label:'', states:states, width:controlWidth })
                    .bindToModel(model_params, 'width_mode').setClassID(that.table_info.id + 'ColumnMode');
                controlsGridData.push({ label:'Columns', ctrl: width_mode });

                var column_width = Controls.ValueSlider(null, {label: 'Manual Column Width (bp)', width:(controlWidth+75), minval:1, maxval:150, scaleDistance: 20, value:model_params.get('user_column_width')})
                    .bindToModel(model_params, 'user_column_width').setClassID(that.table_info.id + 'ColumnWidth');
                var show_hide_width = Controls.ShowHide(column_width);
                model_params.on({change:'width_mode'}, function() {
                  show_hide_width.setVisible(this.get('width_mode') == 'manual');
                });
                show_hide_width.setVisible(false);

                //var page_length = Controls.Edit(null, { label:'', size:5 });
                var states = [{id:'20', name:'20'}, {id:'50', name:'50'}, {id:'100', name:'100'}, {id:'200', name:'200'}, {id:'500', name:'500'}, {id:'1000', name:'1000'}, {id:'100000', name:'All'}];
                var page_length = Controls.Combo(null, { label:'', states:states, width:controlWidth });
                page_length.bindToModel(model_params, 'page_length', function(input) {
                    var num = parseInt(input);
                    if (num != num) //Check for NaN
                        return 1;
                    else
                        return num;
                });
                model_params.on({change:'page_length'}, function() {
                    model_params.set({'page':1});
                });

                controlsGridData.push({ label:'Page size', ctrl: page_length });


                var controlsGrid = Controls.CompoundGrid().setSeparation(2,4);
                $.each(controlsGridData, function(idx, item) {
                    if (item.label)
                        controlsGrid.setItem(idx, 0, Controls.Static('<span class="DescriptionText">'+item.label+':</span>'));
                    else
                        controlsGrid.setItem(idx, 0, Controls.Static('<span class="DescriptionText"></span>'));
                    controlsGrid.setItem(idx, 1, item.ctrl);
                });

                var controls_wrapper = Controls.CompoundVert([]).setMargin(0);
                that.controlsShowHide = Controls.ShowHide(controls_wrapper);
                view_controls.addControl(that.controlsShowHide);

                controls_wrapper.addControl(Controls.VerticalSeparator(3));
                controls_wrapper.addControl(controlsGrid);
                controls_wrapper.addControl(show_hide_width);
                controls_wrapper.addControl(Controls.VerticalSeparator(3));

                var row_height = Controls.ValueSlider(null, {label: 'Row Height:', width:(controlWidth+75), minval:1, maxval:20, scaleDistance: 5, value:view_params.get('row_height')})
                    .bindToModel(view_params, 'row_height').setClassID(that.table_info.id + 'RowHeight');
                controls_wrapper.addControl(row_height);

                controls_wrapper.addControl(Controls.VerticalSeparator(15));
                controls_wrapper.addControl(that.download_button);

                that.col_query = QueryTool.Create(table_info.col_table.id, {includeCurrentQuery:true});
                that.col_query.notifyQueryUpdated = function() {
                  model_params.set('col_query', that.col_query.get());
                };
                model_params.set('col_query', that.col_query.get());

                var col_query_tool = that.col_query.createQueryControl({hasSection: true, hasQueryString: true, defaultHidden: true});
                controls_group.addControl(col_query_tool);
                that.row_query = QueryTool.Create(table_info.row_table.id, {includeCurrentQuery:true});
                that.row_query.notifyQueryUpdated = function() {
                  model_params.set('row_query', that.row_query.get());
                  model_params.set('page', 1);
                };
                model_params.set('row_query', that.row_query.get());

                var row_query_tool = that.row_query.createQueryControl({hasSection: true, hasQueryString: true, defaultHidden: true});
                controls_group.addControl(row_query_tool);


                controls_group.addControl(Controls.Section(view_controls, {
                    title: 'Display settings',
                    bodyStyleClass: 'ControlsSectionBody'
                }));


                //Fix order to by position for col and primary key for row
                that.view = View(view_params.get());

                Msg.listen('',{ type: 'SelectionUpdated'}, function(scope,tableid) {
                    if (tableid == that.model.table.row_table.id) {
                        that._draw();
                    }
                });
                that.model_params = model_params;
                that.view_params = view_params;
            };

            that.draw = function (draw_info) {
                //Save the draw info so that we can redraw when we need to without redrawing the entire panel.
                that.draw_info = draw_info;
                if (!draw_info) return;
                if (draw_info.needZoomIn) {
                  that.download_button.enable(false);
                  return;
                }
                //This is the place where we are called by the framework when the horizontal range is changed so update the model data here.
                var chrom = that.parent_browser.getCurrentChromoID();
                if (!chrom) return;
                var min_genomic_pos = draw_info.offsetX / draw_info.zoomFactX;
                var max_genomic_pos = (draw_info.sizeCenterX + draw_info.offsetX) / draw_info.zoomFactX;

                //Changing the col range will cause a redraw by calling _draw below
                that.model.change_col_range(chrom, min_genomic_pos, max_genomic_pos);

                if (!that.page_controls) {
                    that.page_controls = $('<div class="PnGenotypePageControl" style="position:absolute"> </div>');
                    var page_up = Controls.Button(null,
                        {
                            icon:'fa-chevron-up',
                            vertShift:-2,
                            width:12,
                            height:12,
                            hint:"Page Up",
                            buttonClass:"PnGenotypesPageArrow"
                        })
                        .setOnChanged(function() {
                            that.model_params.set('page', Math.max(that.model_params.get('page')-1, 1));
                        });
                    page_up.modifyEnabled(that.model_params.get('page') > 1);
                    var edit = Controls.Edit(null, {
                        label:'Page:',
                        class: 'PnGenotypesPageEdit',
                        size:2
                    });
                    edit.bindToModel(that.model_params, 'page', function(input) {
                        var num = parseInt(input);
                        if (num != num) //Check for NaN
                            return 1;
                        else
                            return num;
                    });
                    that.page_down = Controls.Button(null,
                        {
                            icon:'fa-chevron-down',
                            width:12,
                            height:12,
                            hint:"Page Down",
                            buttonClass: "PnGenotypesPageArrow"
                        })
                        .setOnChanged(function() {
                            that.model_params.set('page', that.model_params.get('page')+1);
                        });
                    var compound = Controls.Wrapper(Controls.CompoundHor([page_up, Controls.HorizontalSeparator(6), edit, Controls.HorizontalSeparator(6), that.page_down]),"PnGenotypesPageBox");
                    that.page_controls.append(compound.renderHtml());
                    that.getCanvasElementJQ('center').after(that.page_controls);
                    Controls.ExecPostCreateHtml();
                    that.model_params.on({change:'page'}, function() {
                        page_up.modifyEnabled(that.model_params.get('page') > 1);
                    });

                    }
                if (that.page_controls) {
                    that.page_controls.css({
                        top: Math.max(0,draw_info.top_visible + 10),
                        left: (draw_info.sizeCenterX/2) + draw_info.sizeLeftX - 100
                    })
                }

            };

            that._draw = function () {
                var draw_info = that.draw_info;
                if (!draw_info) return;
                if (draw_info.needZoomIn) {
                    that.download_button.enable(false);
                    return;
                }
                //Modify the height of the channel
                var height = 5 + that.view.link_height + that.view.col_header_height;
                if (that.model.row_ordinal.length)
                    height += that.view.row_height * that.model.row_ordinal.length;
                else
                    height += that.view.row_height * that.model_params.get('page_length');
                //Limit height to IE's maximum of 8,192 otherwise canvas goes blank
                height = Math.min(height, 8192);
                if (that._height != height) {
                    that.modifyHeight(height);
                    that._myPlotter.resizeHeight(true);
                    //The last call will result in the framework calling draw, so we should end here.
                    return;
                }

                if (that.page_down)
                    that.page_down.modifyEnabled(!(that.model.row_ordinal.length && that.model.row_ordinal.length != that.model_params.get('page_length')));

                that.drawStandardGradientLeft(draw_info, 1);
                that.drawStandardGradientRight(draw_info, 1);

                that.view.draw(draw_info.centerContext,
                               draw_info.leftContext,
                               {t:draw_info.top_visible, b:draw_info.bottom_visible, l:0, r:draw_info.centerContext.canvas.clientWidth},
                               that.model);
                that.drawMark(draw_info);


                that.download_button.enable(that.model.intervals_being_fetched.length == 0);

                that.drawing = false;

                if (that.model.intervals_being_fetched.length > 0) {
                    if (!that.loading_id) {
                        var draw = function (time) {
                            if (that.model.intervals_being_fetched.length > 0 && !that.draw_info.needZoomIn) {
                                for (var i=0; i < that.model.intervals_being_fetched.length; i++) {
                                    var interval = that.model.intervals_being_fetched[i];
                                    for (var pos = that.view.col_scale(interval.start); pos < that.view.col_scale(interval.end); pos += that.loadIcon.width*2) {
                                        that.loadIcon.drawTo(draw_info.centerContext, Math.floor(pos/(that.loadIcon.width*2))*(that.loadIcon.width*2), 10, time);
                                    }
                                }

                                window.requestAnimationFrame(draw);
                            }
                        };
                        window.requestAnimationFrame(draw);
                    }
                }
            };


            that.mapPositionsReverse = function(posx) {
                return that.model.mapPos2Ordinal(posx);
            }

            that.drawMark = function(drawInfo, showText) {//override default implementation
                if (!that._isMarkVisible)
                    return;
                if (!drawInfo.mark.present)
                    return;

                var voffset = /*that.view.col_header_height +*/ that.view.link_height;
                //that.view.row_header_width;


                var ctx = drawInfo.centerContext;

                var mark1Ordinal = Math.min(drawInfo.mark.pos1, drawInfo.mark.pos2);
                var mark2Ordinal = Math.max(drawInfo.mark.pos1, drawInfo.mark.pos2);

                mark1Pos = that.model.mapOrdinal2Pos(mark1Ordinal);
                mark2Pos = that.model.mapOrdinal2Pos(mark2Ordinal);

                var mark1OrdScreen = Math.round((mark1Ordinal) * drawInfo.zoomFactX - drawInfo.offsetX) - 0.5;
                var mark2OrdScreen = Math.round((mark2Ordinal) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                var mark1PosScreen = Math.round((mark1Pos) * drawInfo.zoomFactX - drawInfo.offsetX) - 0.5;
                var mark2PosScreen = Math.round((mark2Pos) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;

                var markgrad = ctx.createLinearGradient(mark1PosScreen, 0, mark2PosScreen, 0);
                var markWidth = Math.max(1, mark2PosScreen - mark1PosScreen);
                markgrad.addColorStop(0, "rgba(255,50,0,0.2)");
                markgrad.addColorStop(Math.min(0.45, 30 / markWidth), "rgba(255,50,0,0.05)");
                markgrad.addColorStop(Math.max(0.55, 1 - 30 / markWidth), "rgba(255,50,0,0.05)");
                markgrad.addColorStop(1, "rgba(255,50,0,0.2)");
                ctx.fillStyle = markgrad;
                ctx.fillRect(mark1PosScreen, voffset, mark2PosScreen - mark1PosScreen, drawInfo.sizeY-voffset);

                ctx.beginPath();
                ctx.moveTo(mark1OrdScreen,0);
                ctx.bezierCurveTo(mark1OrdScreen, voffset/2, mark1PosScreen, voffset/2, mark1PosScreen, voffset);
                ctx.lineTo(mark2PosScreen, voffset);
                ctx.bezierCurveTo(mark2PosScreen, voffset/2, mark2OrdScreen, voffset/2, mark2OrdScreen, 0);
                ctx.closePath();
                ctx.fill();

                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = "rgb(255,50,0)";
                ctx.beginPath();
                ctx.moveTo(mark1OrdScreen,0);
                ctx.bezierCurveTo(mark1OrdScreen, voffset/2, mark1PosScreen, voffset/2, mark1PosScreen, voffset);
                ctx.lineTo(mark1PosScreen, drawInfo.sizeY);
                ctx.moveTo(mark2OrdScreen, 0);
                ctx.bezierCurveTo(mark2OrdScreen, voffset/2, mark2PosScreen, voffset/2, mark2PosScreen, voffset);
                ctx.lineTo(mark2PosScreen, drawInfo.sizeY);
                ctx.stroke();
                ctx.globalAlpha = 1;

            }

            that.download_view = function() {
              var data = '';
              data += '#Dataset: ' + MetaData.database + '\r\n';
              data += '#Workspace: ' + MetaData.workspaceid + '\r\n';
              data += '#Table:' + that.table_info.tableCapNamePlural + that.view.colour_channel == 'call' ? ' Calls' : ' Allele Depths' + '\r\n';
              data += '#'+ that.table_info.col_table.tableCapNamePlural + ' query: ' + that.table_info.col_table.createQueryDisplayString(that.model.col_query) + '\r\n';
              data += '#'+ that.table_info.row_table.tableCapNamePlural + ' query: ' + that.table_info.row_table.createQueryDisplayString(that.model.row_query) + '\r\n';
              data += '#Choromosome:' + that.model.chrom + '\r\n';
              data += '#Start:' + Math.floor(that.model.col_start) + '\r\n';
              data += '#End:' + Math.ceil(that.model.col_end) + '\r\n';
              Serialise.createStoredURL(function(url) {
                data += '#URL: '+url+'\r\n';
                data += 'Position\t';
                for(var i=0; i<that.model.row_primary_key.length; i++)
                  data += that.model.row_primary_key[i] +'\t'
                data += "\r\n";
                var prop = that.view.colour_channel == 'call' ? that.model.settings.Call : that.model.settings.AlleleDepth;
                var prop_array = that.model.data[prop];
                var arity = prop_array.shape[2] || 1;
                for(i=0; i<that.model.col_ordinal.length; i++) {
                    data += that.model.col_ordinal[i] + '\t';
                    for(var j=0; j<that.model.row_ordinal.length; j++) {
                      for (var k = 0; k < arity; k++) {
                        data += prop_array[j][i * arity + k];
                        if ( k < arity-1 )
                          data += ','
                      }
                      data += '\t';
                    }
                    data += '\r\n';
                  }
                var blob = new Blob([data], {type: "text/plain;charset=utf-8"});
                FileSaver(blob, MetaData.database + '-' + that.view.colour_channel == 'call' ? ' Calls' : ' Allele Depths' + '-' + that.table_info.tableCapNamePlural + '-' + that.model.chrom + '-' + Math.floor(that.model.col_start) + '~' + Math.ceil(that.model.col_end));
              });
            };

            that.handleMouseClicked = function (px, py, area, params) {
                if (area == 'left') {
                    var result = that.view.leftEvent('click', {x:px, y:py}, that.model, params);
                } else if (area == 'center') {
                  var result = that.view.event('click', {x:px, y:py}, that.model, params);
                  if (result.type == 'click_col')
                    Msg.send({ type: 'ItemPopup' }, { tableid:that.table_info.col_table.id, itemid:result.col_key } );
                }
            };

            that.createVisibilityControl = function() {
                var chk=Controls.Check(null,{ label:"Display", value:(true) }).setClassID(that._myID).setOnChanged(function() {
                    that.modifyVisibility(chk.getValue());
                    if (chk.getValue())
                        that.scrollInView();
                });
                return chk;
            };

            that.modifyVisibility = function(isVisible, preventReDraw) {
                that._myPlotter.channelModifyVisibility(that.getID(), isVisible, preventReDraw);
                if (!preventReDraw)
                    that._myPlotter.render();
                that.controlsShowHide.setVisible(isVisible);
            };

            var stored_params = ['row_order', 'row_sort_columns', 'page', 'page_length'];
            that.storeSettings = function() {
                var settings =  _.zipObject(stored_params, _.map(stored_params, function (param) {
                    return that.model_params.get(param)
                }));
                settings['row_query'] = that.row_query.store();
                settings['col_query'] = that.col_query.store();
                return settings;
            };

            that.recallSettings = function(settObj) {
                _.each(stored_params, function(param) {
                    if (settObj[param])
                        that.model_params.set(param,settObj[param]);
                });
                that.row_query.recall(settObj['row_query'], true);
                that.col_query.recall(settObj['col_query'], true);
            };

            that.getToolTipInfo = function (px, py) {
                return that.view.getToolTipInfo(px, py, that.model);
            };


            that.getLeftToolTipInfo = function(px, py) {
                return that.view.getLeftToolTipInfo(px, py, that.model);
            };


            that.init(table_info, controls_group, parent);
            return that;
        };
    return GenotypeChannel;
});
