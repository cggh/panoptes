// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(['_', 'd3',
        "Views/Genotypes/Components/Container",
        "Views/Genotypes/Components/TabContainer",
        "Views/Genotypes/Components/ColumnHeader",
        "Views/Genotypes/Components/GenotypesTable",
        "Views/Genotypes/Components/Link",
        "Views/Genotypes/Components/Gradient",
        "Views/Genotypes/Components/SamplesHeader"
    ],
    function (_, d3, Container, TabContainer, ColumnHeader, GenotypesTable, Link, Gradient, SamplesHeader) {
        return function View(initial_params) {
            var that = {};
            that.init = function(inital_params) {
                that.col_header_height = 30;
                that.link_height = 40;
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

                that.samplesHeader = SamplesHeader();
            };

            that.update_params = function (view_params) {
              _.extend(that, view_params);
            };

            that.draw = function(ctx, ctx_left, clip, model) {
                ctx.clearRect ( clip.l , clip.t , clip.r-clip.l , clip.b - clip.t );
                that.root_container.contents_by_name['data_area'].content.contents_by_name['moving_header'].t = Math.max(0, clip.t);
                that.col_scale.domain([model.col_start, model.col_end]).range([0,clip.r - clip.l]);
                that.root_container.draw(ctx, clip, model, that);

                ctx_left.save();
                var leftPanelVertOffset = that.col_header_height+that.link_height;
                ctx_left.translate(0,leftPanelVertOffset);
                var leftPanelClip = $.extend({}, clip);
                leftPanelClip.t -= leftPanelVertOffset;
                leftPanelClip.b -= leftPanelVertOffset;
                that.samplesHeader.draw(ctx_left, leftPanelClip, model, that);
                ctx_left.restore();

                ctx = ctx_left;
                ctx.save();
                ctx.fillStyle = 'rgb(40,40,40)';
                ctx.font = '11px sans serif';
                ctx.fillText(model.intervals_being_fetched.length > 0 ? "LOADING..." : model.table.tableCapNamePlural, 5, 15);
                ctx.textBaseline = 'top';

                if (model.data_type == 'diploid') {
                ctx.fillStyle = 'rgb(0,55,135)';
                ctx.fillRect(5, 25, 10, 10);
                ctx.fillStyle = 'rgb(180,0,0)';
                ctx.fillRect(5, 40, 10, 10);
                ctx.fillStyle = 'rgb(78,154,0)';
                ctx.fillRect(5, 55, 10, 10);
                ctx.fillStyle = 'rgb(40,40,40)';
                ctx.fillText('Hom - Ref', 20, 25);
                ctx.fillText('Hom - Alt', 20, 40);
                ctx.fillText('Het', 20, 55);
                }
                if (model.data_type == 'fractional'){
                ctx.fillText('Ref fraction:', 5, 25);
                ctx.textAlign = 'center';
                ctx.fillText('1', 5, 49);
                ctx.fillText('0.5', 5+((ctx.canvas.width-10)/2), 49);
                ctx.fillText('0', ctx.canvas.width-5, 49);
                var grd = ctx.createLinearGradient(0, 0, ctx.canvas.width-10, 10);
                grd.addColorStop(0, 'hsl(216,100%,35%');
                grd.addColorStop(1, 'hsl(360,100%,35%');
                ctx.fillStyle = grd;
                ctx.fillRect(5,37,ctx.canvas.width-10, 10);
                }

                ctx.restore();
          };


            that.getToolTipInfo = function (px, py, model) {
                return that.root_container.getToolTipInfo(px, py, model, that);
            }


          that.event = function (type, pos, model) {
            return that.root_container.event(type, pos, {x: 0, y: 0}, model, that);
          };

          that.init(initial_params);
          return that
        };
    });
