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
                that.parent_browser = parent;
                that.col_header_height = 100;
                that.link_height = 25;

                //Create controls
                that.col_query = QueryTool.Create(table_info.col_table.id, {includeCurrentQuery:true});
                that.col_query.notifyQueryUpdated = that.new_col_query;
                var col_query_tool = that.col_query.createControl();
                controls_group.addControl(col_query_tool);
                that.row_query = QueryTool.Create(table_info.row_table.id, {includeCurrentQuery:true});
                that.row_query.notifyQueryUpdated = that.new_row_query;
                var row_query_tool = that.row_query.createControl();
                controls_group.addControl(row_query_tool);

                //Fix order to by position for col and primary key for row
                that.model = Model(table_info,
                    that.col_query.get(),
                    that.row_query.get(),
                    table_info.col_table.PositionField,
                    table_info.row_table.primkey,
                    _.map(MetaData.chromosomes, DQX.attr('id')),
                    _.bind(that._draw,this)
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
            
            //Provides a function that will be called when hovering over a position. The return string of this function will be displayed as tooltip
            that.setToolTipHandler = function(handler) {
                that._toolTipHandler = handler
            };

            //Provides a function that will be called when clicking on a position.
            that.setClickHandler = function(handler) {
                that._clickHandler = handler
            };

            that._setPlotter = function(iPlotter) {
                that._myPlotter=iPlotter;
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
                that.draw_info = draw_info;
                _.bind(that._draw, this)();
            }

            that._draw = function () {
                var draw_info = that.draw_info;
                if (!draw_info) return;
                if (that.drawing == true)
                    return;
                that.drawing = true;

                var chrom = that.parent_browser.getCurrentChromoID();
                if (!chrom) {
                    that.drawing = false;
                    return;
                }

                var min_genomic_pos = Math.round((draw_info.offsetX) / draw_info.zoomFactX);
                var max_genomic_pos = Math.round((draw_info.sizeCenterX + draw_info.offsetX) / draw_info.zoomFactX);

                //TODO Get height somehow... hmm
//                if (that._height != 100+(10 * that.model.row_index.length)) {
//                    that.modifyHeight(100+(10 * that.model.row_index.length));
//                    that._myPlotter.handleResize();
//                }


//                drawInfo.sizeY = that._height;
                this.drawStandardGradientCenter(draw_info, 1);

                var genomic_length_overdraw = 0.2*(max_genomic_pos - min_genomic_pos);
                that.model.change_col_range(chrom, min_genomic_pos - genomic_length_overdraw, max_genomic_pos + genomic_length_overdraw);
                var ctx = draw_info.centerContext;
                that.view.col_scale.domain([min_genomic_pos, max_genomic_pos]).range([0,ctx.canvas.clientWidth]);
                that.root_container.draw(ctx, {t:0, b:ctx.canvas.clientHeight, l:0, r:ctx.canvas.clientWidth});
                this.drawStandardGradientLeft(draw_info, 1);
                this.drawStandardGradientRight(draw_info, 1);

                this.drawMark(draw_info);
//                this.drawXScale(drawInfo);
                this.drawTitle(draw_info);
                that.drawing = false;
            };

            that.init(table_info, controls_group, parent);
            return that;
        };
    return GenotypeChannel;
});
