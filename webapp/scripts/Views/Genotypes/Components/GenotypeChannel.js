define(["require", "_", "d3", "DQX/Framework", "DQX/ArrayBufferClient", "DQX/Controls", "DQX/Msg", "DQX/Utils",
    "DQX/ChannelPlot/ChannelCanvas", "Utils/QueryTool", "MetaData", "Views/Genotypes/Model",
     "Views/Genotypes/View"],
    function (require, _, d3, Framework, ArrayBufferClient, Controls, Msg, DQX, ChannelCanvas, QueryTool, MetaData, Model,
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
                that.parent_browser = parent;
                that.table_info = table_info;

                //Create controls
                controls_group.addControl(that.createVisibilityControl());
                that.col_query = QueryTool.Create(table_info.col_table.id, {includeCurrentQuery:true});
                that.col_query.notifyQueryUpdated = that.new_col_query;
                var col_query_tool = that.col_query.createQueryControl({defaultHidden: true});
                controls_group.addControl(col_query_tool);
                that.row_query = QueryTool.Create(table_info.row_table.id, {includeCurrentQuery:true});
                that.row_query.notifyQueryUpdated = that.new_row_query;
                var row_query_tool = that.row_query.createQueryControl({});
                controls_group.addControl(row_query_tool);

                //Fix order to by position for col and primary key for row
                that.model = Model(table_info,
                                   {
                                       col_query: that.col_query.get(),
                                       row_query: that.row_query.get(),
                                       col_order: table_info.col_table.PositionField,
                                       row_order: table_info.row_table.primkey
                                   },
                                   _.map(MetaData.chromosomes, DQX.attr('id')),
                                   that._draw
                );
                //View parameters
                that.view = View();
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
                //Save the draw info so that we can redraw when we need to without redrawing the entire panel.
                that.draw_info = draw_info;
                that._draw();
            };

            that._draw = function () {
                var draw_info = that.draw_info;
                if (!draw_info) return;
                if (that.drawing == true)
                    return;
                that.drawing = true;

                if (that.draw_info.needZoomIn) {
                    that.drawing = false;
                    return;
                }
                var chrom = that.parent_browser.getCurrentChromoID();
                if (!chrom) {
                    that.drawing = false;
                    return;
                }

                var min_genomic_pos = Math.round((draw_info.offsetX) / draw_info.zoomFactX);
                var max_genomic_pos = Math.round((draw_info.sizeCenterX + draw_info.offsetX) / draw_info.zoomFactX);

                var genomic_length_overdraw = 0.2*(max_genomic_pos - min_genomic_pos);
                that.model._change_col_range(chrom, min_genomic_pos - genomic_length_overdraw, max_genomic_pos + genomic_length_overdraw);

                //Modify the height of the channel
                var height = that.view.link_height + that.view.col_header_height;
                if (that.model.row_ordinal.length)
                    height += 10*that.model.row_ordinal.length;
                if (that._height != height) {
                    that.modifyHeight(height);
                    that._myPlotter.resizeHeight();
                }

                that.drawStandardGradientLeft(draw_info, 1);
                that.drawStandardGradientRight(draw_info, 1);

                that.view.draw(draw_info.centerContext,
                               draw_info.leftContext,
                               {t:draw_info.top_visible, b:draw_info.bottom_visible, l:0, r:draw_info.centerContext.canvas.clientWidth},
                               that.model);
                that.drawMark(draw_info);
                that.drawTitle(draw_info);

                that.drawing = false;
            };

            that.handleMouseClickedSide = function (px, py, area) {
                if (area == 'left') {
                    py -= that.col_header_height+that.link_height+4;
                    py /= that.view.row_height;
                    py = Math.floor(py);
                    if (py >= 0 && py < that.model.row_ordinal.length) {
                        var key = that.model.row_ordinal[py];
                        Msg.send({ type: 'ItemPopup' }, { tableid:that.table_info.row_table.id, itemid:key } );
                    }
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
