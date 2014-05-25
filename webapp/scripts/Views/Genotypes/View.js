define(['d3', 'Views/Genotypes/ColourAllocator',
        "Views/Genotypes/Components/Container",
        "Views/Genotypes/Components/TabContainer",
        "Views/Genotypes/Components/ColumnHeader",
        "Views/Genotypes/Components/GenotypesTable",
        "Views/Genotypes/Components/Link",
        "Views/Genotypes/Components/Gradient"
    ],
    function (d3, ColourAllocator, Container, TabContainer, ColumnHeader, GenotypesTable, Link, Gradient) {
        return function View(initial_params) {
            var that = {};
            that.init = function(inital_params) {
                that.col_header_height = 30;
                that.link_height = 25;
                that.colours = ColourAllocator();
                that.row_header_width = 150;
                that.col_scale =  d3.scale.linear();

                //Vars set by params
                _.extend(that, initial_params);

                that.root_container = Container([
                    {name: 'data_area', t:that.gene_map_height, content:
                        Container([
                            {name: 'body', t: that.col_header_height + that.link_height, content:
                                Container([
                                    {name:'table', content:GenotypesTable()}
                                ])
                            },
                            {name: 'moving_header', content:
                                Container([
                                    {name:'gradient', content:Gradient('rgba(255,255,255,0.8)', 'rgba(255,255,255,0)', 1, that.link_height+that.col_header_height)},
                                    {name:'column_header', t: that.link_height, content:ColumnHeader(that.col_header_height, that.clickSNP)},
                                    {name:'link', content:Link(that.link_height)}
                                ])
                            }
                        ])
                    }
                ]);
            };

            that.update_params = function(view_params){
                _.extend(that, view_params);
            };

            that.draw = function(ctx, ctx_left, clip, model) {
                ctx.clearRect ( clip.l , clip.t , clip.r-clip.l , clip.b - clip.t );
                that.root_container.contents_by_name['data_area'].content.contents_by_name['moving_header'].t = Math.max(0, clip.t);
                that.col_scale.domain([model.genomic_start, model.genomic_end]).range([0,clip.r - clip.l]);
                that.root_container.draw(ctx, clip, model, that);

                ctx = ctx_left;
                var row_labels = model.row_ordinal;
                ctx.save();
                ctx.fillStyle = '#000';
                ctx.font = "" + (that.row_height) + "px sans-serif";
                ctx.translate(0,that.col_header_height+that.link_height);
                _.forEach(row_labels, function(label, i) {
                    ctx.fillText(label, 0, (i+1) * (that.row_height));
                });
                ctx.restore();

            };

            that.init(initial_params);
            return that
        };
    }
);