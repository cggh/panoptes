define(["require", "_", "d3", "DQX/Framework", "DQX/ArrayBufferClient", "DQX/Controls", "DQX/Msg", "DQX/Utils",
    "DQX/ChannelPlot/ChannelCanvas", "Utils/QueryTool", "MetaData", "Views/Genotypes/Model",
    "Views/Genotypes/Components/TabContainer", "Views/Genotypes/Components/Container", "Views/Genotypes/ColourAllocator",
    "Views/Genotypes/Components/ColumnHeader", "Views/Genotypes/Components/GenotypesTable", "Views/Genotypes/Components/Link"],
    function (require, _, d3, Framework, ArrayBufferClient, Controls, Msg, DQX, ChannelCanvas, QueryTool, MetaData, Model,
              TabContainer, Container, ColourAllocator, ColumnHeader, GenotypesTable, Link) {

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
                that.col_header_height = 30;
                that.link_height = 25;
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
                    that.col_query.get(),
                    that.row_query.get(),
                    table_info.col_table.PositionField,
                    table_info.row_table.primkey,
                    _.map(MetaData.chromosomes, DQX.attr('id')),
                    that._draw
                );
                //View parameters
                that.view = {
                    colours: ColourAllocator(),
                    compress: false,
                    row_height: 10,
                    row_header_width: 150,
                    col_scale: d3.scale.linear()
                };
                var col_header = ColumnHeader(that.model, that.view, that.col_header_height, that.clickSNP);
                that.root_container = Container([
                    {name: 'data_area', t:that.gene_map_height, content:
                        TabContainer([
                            {name: 'genotypes', content:
                                Container([
                                    {name:'table', t: that.col_header_height + that.link_height, content:GenotypesTable(that.model, that.view)},
                                    {name:'column_header', t: that.link_height, content: col_header},
                                    {name:'link', content:Link(that.model, that.view, that.link_height)}

//                                    {name:'row_header', t: that.col_header_height, content:RowHeader(that.model, that.view)}
                                ])}
//                            {name: 'bifurcation', content:
//                                Container([
//                                    {name:'table', t: that.col_header_height, content:Bifurcation(that.model, that.view)},
//                                    {name:'column_header', content: col_header},
//                                ])},
//                            {name: 'ld', content:
//                                Container([
//                                    {name:'table', t: that.col_header_height, content: LDMap(that.model, that.view)},
//                                    {name:'column_header', content: col_header},
//                                ])},
//                            {name: 'network', content:
//                                Container([
//                                    {name:'network', t: that.col_header_height, content: Network(that.model, that.view)},
//                                    {name:'column_header', content: col_header},
//                                ])},
                        ])}
//                    {name: 'genome', content:GeneMap(that.model, that.view)},
//                    {name: 'controls', content:Controls(that.model, that.view,
//                        {w:that.view.row_header_width, h:that.gene_map_height})
//                    },
                ]);

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
                var height = that.link_height + that.col_header_height;
                if (that.model.row_ordinal.length)
                    height += 10*that.model.row_ordinal.length;
                if (that._height != height) {
                    that.modifyHeight(height);
                    that._myPlotter.handleResize();
                }
//                that.drawStandardGradientCenter(draw_info, 1);

                var ctx = draw_info.centerContext;
                that.view.col_scale.domain([min_genomic_pos, max_genomic_pos]).range([0,ctx.canvas.clientWidth]);
                that.root_container.draw(ctx, {t:0, b:ctx.canvas.clientHeight, l:0, r:ctx.canvas.clientWidth});
                that.drawStandardGradientLeft(draw_info, 1);
                that.drawStandardGradientRight(draw_info, 1);

                that.drawMark(draw_info);
//                this.drawXScale(drawInfo);
                that.drawTitle(draw_info);

                ctx = draw_info.leftContext;
                var row_labels = that.model.row_ordinal;
                ctx.save();
                ctx.fillStyle = '#000';
                ctx.font = "" + (that.view.row_height) + "px sans-serif";
                ctx.translate(0,that.col_header_height+that.link_height);
                _.forEach(row_labels, function(label, i) {
                    ctx.fillText(label, 0, (i+1) * (that.view.row_height));
                });
                ctx.restore();

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
