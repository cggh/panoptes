define(["require", "_", "d3", "DQX/Framework", "DQX/ArrayBufferClient", "DQX/Controls", "DQX/Msg", "DQX/Utils", "DQX/ChannelPlot/ChannelCanvas", "Utils/QueryTool", "MetaData", "Views/Genotypes/Model"],
    function (require, _, d3, Framework, ArrayBufferClient, Controls, Msg, DQX, ChannelCanvas, QueryTool, MetaData, Model) {

        var GenotypeChannel = {};

        GenotypeChannel.Channel = function (table_info, controls_group, parent) {
            var id = table_info.id+'_genotypes';
            var that = ChannelCanvas.Base(id);

            that.init = function(table_info, controls_group, parent) {
                that._height = 40;
                that._toolTipHandler = null;
                that._clickHandler = null;
                that.parent_browser = parent;

                //Create controls
                that.col_query = QueryTool.Create(table_info.col_table.id, {includeCurrentQuery:true});
                that.col_query.notifyQueryUpdated = that.new_col_query;
                var col_query_tool = that.col_query.createControl();
                controls_group.addControl(col_query_tool);
                that.row_query = QueryTool.Create(table_info.row_table.id, {includeCurrentQuery:true});
                that.row_query.notifyQueryUpdated = that.new_row_query;
                var row_query_tool = that.row_query.createControl();
                controls_group.addControl(row_query_tool);

                that.data_type = table_info.settings.ShowInGenomeBrowser.Type;
                if (that.data_type != 'diploid' && that.data_type != 'fractional')
                    DQX.reportError("Genotype data type is not diploid or fractional");
                if (that.data_type == 'diploid') {
                    that.depth_property = table_info.settings.ShowInGenomeBrowser.Depth;
                    that.first_allele_property = table_info.settings.ShowInGenomeBrowser.FirstAllele;
                    that.second_allele_property = table_info.settings.ShowInGenomeBrowser.SecondAllele;
                    that.property_list = [that.depth_property, that.first_allele_property, that.second_allele_property];
                }
                if (that.data_type == 'fractional') {
                    that.ref_fraction_property = table_info.settings.ShowInGenomeBrowser.RefFraction;
                    that.depth_property = table_info.settings.ShowInGenomeBrowser.Depth;
                    that.property_list = [that.depth_property, that.ref_fraction_property];
                }

                var properties = {};
                _.each(that.property_list, function(prop) {
                    //Strip the endianess from the dtype
                    properties[prop] = MetaData.map2DProperties[prop].dtype.substring(1);
                });
                //Fix order to by position for col and primary key for row
                that.model = Model(table_info,
                    that.col_query.get(),
                    that.row_query.get(),
                    table_info.col_table.PositionField,
                    table_info.row_table.primkey,
                    properties,
                    _.map(MetaData.chromosomes, DQX.attr('id'))
                );
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

            that.new_col_query = function (q) {
                console.log(q);
            };

            that.new_row_query = function (q) {
                console.log(q);
            };

            that.draw = function (drawInfo, args) {
                var chrom = that.parent_browser.getCurrentChromoID();
                if (!chrom) return;

                var min_genomic_pos = Math.round((-50 + drawInfo.offsetX) / drawInfo.zoomFactX);
                var max_genomic_pos = Math.round((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX);
                var x_scale = d3.scale.linear().domain([min_genomic_pos, max_genomic_pos]).range([0,1039]);

                var data = that.model.get_range(chrom, min_genomic_pos, max_genomic_pos);
                if (!('row_ID' in data))
                    return;
                var psx = 10, psy = 10;
                var snp_width = 10;
                var pos = data['col_pos'];
                var first_allele = data['2D_first_allele'];
                var second_allele = data['2D_second_allele'];
                var depth = data['2D_total_depth'];
                var row_ID = data['row_ID'];
//TODO - Fix
                that._height = 10 * row_ID.length;
//                drawInfo.sizeY = that._height;
                this.drawStandardGradientCenter(drawInfo, 1);
                this.drawStandardGradientLeft(drawInfo, 1);
                this.drawStandardGradientRight(drawInfo, 1);

                var ctx = drawInfo.centerContext;
                for (var row = 0, lr = row_ID.length; row < lr; ++row) {
                    for (var col = 0, lc = pos.length; col < lc; ++col) {
                        var idx = (row*lc) + col;
                        if (first_allele[idx] == second_allele[idx])
                            ctx.fillStyle = 'rgba(0,0,255,'+(depth[idx]/100)+')';
                        else
                            ctx.fillStyle = 'rgba(255,0,0,'+(depth[idx]/100)+')';
                        if (first_allele[idx] == -1 || second_allele[idx] == -1)
                            ctx.fillStyle = 'rgb(0,0,0)';
                        ctx.fillRect(x_scale(pos[col])-(snp_width*0.01), row*10, Math.ceil(snp_width), 10);
                    }
                }

                this.drawMark(drawInfo);
//                this.drawXScale(drawInfo);
                this.drawTitle(drawInfo);
            };
            
            that.init(table_info, controls_group, parent);
            return that;
        };
    return GenotypeChannel;
});
