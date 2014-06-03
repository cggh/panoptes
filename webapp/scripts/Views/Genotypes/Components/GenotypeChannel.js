define(["require", "_", "d3", "DQX/Model", "DQX/SQL", "DQX/Framework", "DQX/ArrayBufferClient", "DQX/Controls", "DQX/Msg", "DQX/Utils",
    "DQX/ChannelPlot/ChannelCanvas", "Utils/QueryTool", "MetaData", "Views/Genotypes/Model",
     "Views/Genotypes/View"],
    function (require, _, d3, DQXModel, SQL, Framework, ArrayBufferClient, Controls, Msg, DQX, ChannelCanvas, QueryTool, MetaData, Model,
               View) {

        var GenotypeChannel = {};

        GenotypeChannel.Channel = function (table_info, controls_group, parent) {
            var id = table_info.id+'_genotypes';
            var that = ChannelCanvas.Base(id);

            that.init = function(table_info, controls_group, parent) {
                that._height = 400;
                that._toolTipHandler = null;
                that._clickHandler = null;
                that._always_call_draw = true;
                that._title = table_info.name;
                that.parent_browser = parent;
                that.table_info = table_info;

                that.model = Model(table_info,
                                   {
                                       col_query: SQL.WhereClause.Trivial(),
                                       row_query: SQL.WhereClause.Trivial(),
                                       col_order: table_info.col_table.PositionField,
                                       row_order: table_info.row_table.primkey
                                   },
                                   _.map(MetaData.chromosomes, DQX.attr('id')),
                                   that._draw
                );

                //Create controls

                var view_controls = Controls.CompoundVert([]);
                view_controls.addControl(that.createVisibilityControl());
                view_controls.addControl(Controls.VerticalSeparator(3));

                var view_params = DQXModel({width_mode:'fill_width',
                                            row_height:11,
                                            column_width:1,
                                            alpha_channel:(that.model.settings.ExtraProperties[0] ? that.model.settings.ExtraProperties[0] : null),
                                            height_channel:(that.model.settings.ExtraProperties[1] ? that.model.settings.ExtraProperties[1] : null)
                                           });
                view_params.on({}, function() {
                    that.view.update_params(this.get());
                    //None of these controls change the horizontal region so it is safe to just call the internal redraw.
                    that._draw();
                });

                var states = _.map(that.model.settings.ExtraProperties, function(prop) {
                    return {id:prop, name:that.table_info.properties[prop].name};
                });
                states.push({id:'__null', name:'None'});
                var alpha_channel = Controls.Combo(null, { label:'Alpha:', states:states})
                    .bindToModel(view_params, 'alpha_channel');
                view_controls.addControl(alpha_channel);
                var height_channel = Controls.Combo(null, { label:'Height:', states:states })
                    .bindToModel(view_params, 'height_channel');
                view_controls.addControl(height_channel);

                var states = [ {id:'fill_width', name:'Fill Width'}, {id:'fixed_width', name:'Fixed Width'}];
                var width_mode = Controls.Combo(null, { label:'', states:states, width:90 })
                    .bindToModel(view_params, 'width_mode');
                //view_controls.addControl(width_mode);

                var column_width = Controls.ValueSlider(null, {label: 'Column Width', width:220, minval:1, maxval:10, value:view_params.get('column_width')})
                    .bindToModel(view_params, 'column_width');
                //view_controls.addControl(column_width);

                view_controls.addControl(Controls.VerticalSeparator(3));
                var row_height = Controls.ValueSlider(null, {label: 'Row Height:', width:220, minval:1, maxval:20, scaleDistance: 5, value:view_params.get('row_height')})
                    .bindToModel(view_params, 'row_height');
                view_controls.addControl(row_height);

                that.col_query = QueryTool.Create(table_info.col_table.id, {includeCurrentQuery:true});
                that.col_query.notifyQueryUpdated = that.new_col_query;
                var col_query_tool = that.col_query.createQueryControl({defaultHidden: true});
                controls_group.addControl(col_query_tool);
                that.row_query = QueryTool.Create(table_info.row_table.id, {includeCurrentQuery:true});
                that.row_query.notifyQueryUpdated = that.new_row_query;
                var row_query_tool = that.row_query.createQueryControl({defaultHidden: true});
                controls_group.addControl(row_query_tool);

                controls_group.addControl(Controls.Section(view_controls, {
                    title: 'Display settings',
                    bodyStyleClass: 'ControlsSectionBody'
                }));


                //Fix order to by position for col and primary key for row
                that.view = View(view_params.get());
            };

            that.new_col_query = function () {
                that.model.new_col_query(that.col_query.get());
                that._draw();
            };

            that.new_row_query = function () {
                that.model.new_row_query(that.row_query.get());
                that._draw();
            };

            that.draw = function (draw_info) {
                if (!draw_info) return;
                if (draw_info.needZoomIn) return;
                //Save the draw info so that we can redraw when we need to without redrawing the entire panel.
                that.draw_info = draw_info;
                //This is the place where we are called by the framework when the horizontal range is changed so update the model data here.
                var chrom = that.parent_browser.getCurrentChromoID();
                if (!chrom) return;
                var min_genomic_pos = draw_info.offsetX / draw_info.zoomFactX;
                var max_genomic_pos = (draw_info.sizeCenterX + draw_info.offsetX) / draw_info.zoomFactX;

                //Changing the col range will cause a redraw by calling _draw below
                that.model.change_col_range(chrom, min_genomic_pos, max_genomic_pos);
            };

            that._draw = function () {
                var draw_info = that.draw_info;
                if (!draw_info) return;

                //Modify the height of the channel
                var height = 5 + that.view.link_height + that.view.col_header_height;
                if (that.model.row_ordinal.length)
                    height += that.view.row_height * that.model.row_ordinal.length;
                if (that._height != height) {
                    that.modifyHeight(height);
                    that._myPlotter.resizeHeight(true);
                    //The last call will result in the framework calling draw, so we should end here.
                    return;
                }

                that.drawStandardGradientLeft(draw_info, 1);
                that.drawStandardGradientRight(draw_info, 1);

                that.view.draw(draw_info.centerContext,
                               draw_info.leftContext,
                               {t:draw_info.top_visible, b:draw_info.bottom_visible, l:0, r:draw_info.centerContext.canvas.clientWidth},
                               that.model);
                that.drawMark(draw_info);

                that.drawing = false;
            };

            that.handleMouseClicked = function (px, py, area) {
                if (area == 'left') {
                    py -= that.view.col_header_height+that.view.link_height+4;
                    py /= that.view.row_height;
                    py = Math.floor(py);
                    if (py >= 0 && py < that.model.row_ordinal.length) {
                        var key = that.model.row_ordinal[py];
                        Msg.send({ type: 'ItemPopup' }, { tableid:that.table_info.row_table.id, itemid:key } );
                    }
                } else if (area == 'center') {
                  var result = that.view.event('click', {x:px, y:py}, that.model);
                  if (result.type == 'click_col')
                    Msg.send({ type: 'ItemPopup' }, { tableid:that.table_info.col_table.id, itemid:result.col_key } );
                }
            };

            that.createVisibilityControl = function() {
                var chk=Controls.Check(null,{ label:"Display", value:(true) }).setClassID(that._myID).setOnChanged(function() {
                    that.modifyVisibility(chk.getValue());
                });
                return chk;
            };

            that.modifyVisibility = function(isVisible, preventReDraw) {
                that._myPlotter.channelModifyVisibility(that.getID(), isVisible, preventReDraw);
                if (!preventReDraw)
                    that._myPlotter.render();
            };

            that.init(table_info, controls_group, parent);
            return that;
        };
    return GenotypeChannel;
});
