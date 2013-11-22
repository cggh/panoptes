define(["_", "easel", "d3", "tween", "require", "DQX/Utils", "DQX/Model",
  "DQX/SVG",
  "DQX/FramePanel", "MetaData", "Views/Genotypes/Components/ColumnHeader", "Views/Genotypes/Components/RowHeader",
  "Views/Genotypes/Components/GeneMap", "Views/Genotypes/Components/GenotypesTable",
  "Views/Genotypes/TouchEvents", "Views/Genotypes/Components/Controls", "Views/Genotypes/Scale",
  "Views/Genotypes/IntervalCache", "Views/Genotypes/SNPCache", "Views/Genotypes/Components/TabContainer",
  "Views/Genotypes/Components/Container",  "Views/Genotypes/Components/Bifurcation", "Views/Genotypes/Components/LDMap",
  "Views/Genotypes/Components/Network", "Views/Genotypes/ColourAllocator"],
  function (_, easel, d3, tween, require, DQX, Model,
            SVG,
            FramePanel, MetaData, ColumnHeader, RowHeader,
            GeneMap, Genotypes,
            TouchEvents, Controls, Scale, IntervalCache, SNPCache,
            TabContainer, Container, Bifurcation, LDMap, Network,
            ColourAllocator) {
    return function GenotypeViewer(frame, providers, config) {
      var that = {};
      that.providers = providers;
      that.config = config;
      config.on({change:'compress'}, function() {
        that.modify_compress(this.get('compress'));
      });
      config.on({change:'cluster'}, function() {
        that.modify_cluster(this.get('cluster'));
      });
      config.on({change:'tab'}, function() {
        that.modify_tab(this.get('tab'));
      });

      that.clickSNP = function (snp_index) {
        if (_.contains(that.view.selected_snps,snp_index)) {
          that.view.selected_snps = _.filter(that.view.selected_snps, function(index) {return index !== snp_index});
        }
        else
          that.view.selected_snps.push(snp_index);
        that.sortSamples();
      };
      that.modify_compress = function (compress) {
        var t = new tween.Tween(that.view)
          .to({row_height: compress ? that.compressed_row_height : that.row_height}, 2000)
          .easing(tween.Easing.Sinusoidal.InOut)
          .start();
        that.view.compress = compress;
        //that will set the samples ypos
        that.sortSamples();
      };
      that.modify_cluster = function (cluster) {
        that.cluster = cluster;
        that.sortSamples();
      };
      that.modify_tab = function (tab) {
        that.root_container.contents_by_name['data_area'].content.show_tab(tab);
        that.needUpdate = 'tab';
      };

      that.resize = function () {
        var v = that.view;
        that.canvas.attr('width', that.width())
          .attr('height', that.height());
        that.view.genome_scale.range([ that.view.row_header_width, that.width()]);
        that.view.snp_scale.range([ that.view.row_header_width, that.width()]);
        that.needUpdate = 'resize';
        that.tick();
      };

      that.width = function () {
        return that.parent_element.width();
      };
      that.height = function () {
        return that.parent_element.height();
      };
      that.setSamples = function (sample_set) {
        that.data.samples = sample_set;
        sample_set.forEach(function (sample) {
          sample.genotypes_canvas = document.createElement('canvas');
          sample.genotypes_canvas.height = 1;
        });
        that.data.snp_cache.set_samples(sample_set);
        that.sortSamples();
      };
      that.setVariantQuery = function (variant_query) {
        console.log(variant_query);
      }

      that.sortSamples = function () {
        var sample_set = that.data.samples;
        var genotypes = that.data.snp_cache.genotypes;
        _(that.data.samples).forEach(function (sample, i) {
          sample.selected_haplotype = '';
          if (genotypes) {
            _(that.view.selected_snps).forEach(function (snp) {
                sample.selected_haplotype += genotypes[i].gt[snp];
            });
          }
        });
        if (that.cluster) {
//                    var genotypes = [];
//                    that.data.samples.forEach(function(sample){
//                        var g = [];
//                        g.sample = sample;
//                        sample.genotypes.forEach(function(snp, i){
//                            if (that.data.snps[i].selected)
//                                g.push(snp.gt);
//                        });
//                        genotypes.push(g);
//                    });
//                    var c = cluster.hcluster(genotypes, "euclidean", "complete");
//                    var count = 0;
//                    function add(node) {
//                        if (node.value) {
//                            node.value.sample.cluster = count;
//                            count += 1;
//                        }
//                        else {
//                            add(node.left);
//                            add(node.right);
//                        }
//                    }
//                    add(c);
          that.view.sample_heirachy = [
            {
              key: function (sample) {
                return sample.selected_haplotype;
              },
              comparator: d3.descending,
              display_name: function (key, values) {
                return values.length + " samples";
              }
            },
          ]
          that.sample_leaf_sort = function(a,b) {return d3.descending(a.selected_haplotype+ a.SampleContext.Site.Name, b.selected_haplotype+ b.SampleContext.Site.Name);};
        } else {
          that.view.sample_heirachy = [
            {
              key: function (sample) {
                return sample.Classifications.subcont[0].Name;
              },
              comparator: d3.descending,
              display_name: DQX.return_arg(0)
            },
            {
              key: function (sample) {
                return sample.Classifications.region[0].Name;
              },
              comparator: d3.descending,
              display_name: DQX.return_arg(0)
            },
            //Commented out on request of DK
            {
                key: function (sample) {
                    return sample.SampleContext.Site.Name;
                },
                comparator: d3.descending,
                display_name: DQX.return_arg(0)
            }

          ];
          that.sample_leaf_sort = DQX.comp_attr('ID', d3.descending);
        }

        var nest = d3.nest();
        that.view.sample_heirachy.forEach(function (level) {
          nest.key(level.key);
          nest.sortKeys(level.comparator);
        });
        nest.sortValues(that.sample_leaf_sort);
        that.sample_nest = nest.entries(sample_set);
        var vert = 0;
        var set_count = function (nest, depth) {
          if (nest.key == undefined)
            nest.key = nest.ID;
          nest.is_sample = (nest.ID != undefined);
          nest.display_name = nest.is_sample ? nest.ID : depth > 0 ? that.view.sample_heirachy[depth - 1].display_name(nest.key, nest.values) : 'Samples';
          nest.depth = depth;
          if (!nest.vert)
            nest.vert = vert;
          var t = new tween.Tween(nest)
            .to({vert: vert}, 2000)
            .easing(tween.Easing.Sinusoidal.InOut)
            .start();
          vert += nest.is_sample ? (that.view.compress ? that.compressed_row_height : that.row_height) : that.row_height;
          that.max_vert = vert;
          if (depth < that.view.sample_heirachy.length + 1) {
            var count = 0;
            nest.values.forEach(function (sub_nest) {
              count += set_count(sub_nest, depth + 1);
            });
            nest.count = count;
            return count;
          }
          return 1;
        };
        that.sample_nest.count = set_count({values: that.sample_nest}, 0);
        var sample_and_label_list = [];
        var add_func = function (nest, depth) {
          sample_and_label_list.push(nest);
          if (depth < that.view.sample_heirachy.length) {
            nest.values.forEach(function (sub_nest) {
              add_func(sub_nest, depth + 1);
            });
          }
        };
        that.sample_nest.forEach(function (nest) {
          add_func(nest, 0);
        });
        that.data.sample_and_label_list = sample_and_label_list;
        that.needUpdate = 'sortSamples';
      };

      that.set_gene = function (gene_info) {
        if (gene_info) {
          that.data.gene_info = gene_info;
          that.view.genome_scale.domain([gene_info.start, gene_info.stop]);
          that.view.chrom = gene_info.chromid;
          that.data.snp_cache.set_chrom(gene_info.chromid);
          that.data.snp_cache.set_chrom(gene_info.chromid);
          that.view.rescaleGenomic({left: gene_info.start, right:gene_info.stop})
        } else {
          that.data.gene_info = null;
          that.view.genome_scale.domain([0, 0]);
        }
        that.view.scroll_pos = 0;
        that.last_view_change = 'genome';
      };

      that.newData = _.throttle(function() {
        that.updateSNPs(true);
      },1000);

      that.newPositions = function() {
        that.view.rescaleGenomic();
      };

      that.newAnnotations = function() {
        var genome_scale = that.view.genome_scale.domain();
        that.data.annotations = that.data.annotation_cache.get_by_pos(that.view.chrom, Math.floor(genome_scale[0]-25000), Math.ceil(genome_scale[1]+25000));
        that.needUpdate = 'Annots';
      };

      //Initialise the viewer
      var framePanel = FramePanel(frame);
      framePanel.onResize = that.resize;

      //Where to show it
      that.parent_element = $('#' + frame.getClientDivID());
      that.parent_element
        .append('<canvas style="position:absolute" id="genotypes-browser">')
        .addClass('genotypes-browser');
      that.canvas = $("#genotypes-browser");

      that.needUpdate = "Init";

      that.updateSNPs = function(force_update) {
        var view = that.view;
        var genome_scale = view.genome_scale.targetDomain();
        var snp_scale = view.snp_scale.targetDomain();
        that.data.annotations = that.data.annotation_cache.get_by_pos(view.chrom, Math.floor(genome_scale[0]-25000), Math.ceil(genome_scale[1]+25000));
        that.data.snp_cache.retrieve_by_index(view.start_snp, view.end_snp);
        that.data.snps = that.data.snp_cache.snps;
        var snps_per_pixel = Math.max(1, Math.floor((snp_scale[1]-snp_scale[0])/that.width()));
        if (force_update ||
            view.start_snp < view.cache_start_snp ||
            view.end_snp > view.cache_end_snp ||
            snps_per_pixel != view.cache_snps_per_pixel)
        {
          //that.last_snp_range = current_snp_range;
          view.cache_snps_per_pixel = snps_per_pixel;
          var num_snps = view.end_snp - view.start_snp;
          //Over draw by 3x for side scroll
          view.cache_start_snp = Math.max(0, view.start_snp-num_snps);
          view.cache_end_snp = Math.min(that.data.snp_cache.snp_positions.length, view.end_snp+num_snps);
          num_snps = view.cache_end_snp - view.cache_start_snp;
          var width = Math.ceil(num_snps/snps_per_pixel);
          view.cache_pixel_width = width;
          console.time('draw');
          var genotypes = that.data.snp_cache.genotypes;
          var r = that.data.snp_cache.colour_table_r;
          var g = that.data.snp_cache.colour_table_g;
          var b = that.data.snp_cache.colour_table_b;
          that.data.samples.forEach(function(sample, s) {
            //We want a canvas that is the next multiple of the number of snps
            sample.genotypes_canvas.width = width;
            if (num_snps > 0 && genotypes) {
              var ctx = sample.genotypes_canvas.getContext("2d");
              var image_data = ctx.createImageData(width, 1);
              var data = image_data.data;
              var p = 0;
              var col = genotypes[s].col;
              var gt = genotypes[s].gt;
              //Reduce a set up SNPs to a pixel by subsampling
              for(var j=view.cache_start_snp, ref = view.cache_end_snp; j < ref; j+= snps_per_pixel) {
                var c = col[j];
                data[4*p] = r[c];
                data[4*p+1] = g[c];
                data[4*p+2] = b[c];
                data[4*p+3] = 255;
                p++;
              }
              ctx.putImageData(image_data,0,0);
            }
          });
        console.timeEnd('draw');
        that.needUpdate = 'new snps';
        }
      };
      that.throttledUpdateSNPs = _.throttle(that.updateSNPs, 250);

      that.tick = function (event) {
        var snp_scale = that.view.snp_scale.domain();
        var extra_width = (snp_scale[1] - snp_scale[0]) * 0.2;
        that.view.start_snp =  Math.max(0, Math.floor(snp_scale[0] - extra_width));
        that.view.end_snp = Math.min(that.data.snp_cache.snp_positions.length, Math.ceil(snp_scale[1] + extra_width));
        that.throttledUpdateSNPs();
        var ctx = that.canvas.get(0).getContext('2d');
        var tweens = tween.getAll().length;
        tween.update();

        if (tweens || that.needUpdate) {
          //Clear by change of size
          that.canvas.attr('width', that.width());
          that.root_container.draw(ctx, {t:0, b:that.height(), l:0, r:that.width()});
          that.needUpdate = false;
        }
        //Loading indicator
        if (!!that.data.snp_cache.current_provider_requests) {
          that.load_indicator || (that.load_indicator = 0);
          that.load_indicator += (!!that.data.snp_cache.current_provider_requests*0.2);
          ctx.strokeStyle = '#000';
          ctx.fillStyle = '#FFF';
          ctx.lineWidth = 1;
          ctx.fillRect(0,0,101,21);
          ctx.beginPath();
          ctx.moveTo(0, 10+(10*Math.sin(that.load_indicator)));
          for(var i = 0; i <= 100; i += 4) {
            ctx.lineTo(i, 10+(10*Math.sin(((i*Math.PI*4)/100)+that.load_indicator)));
          }
          ctx.moveTo(0, 10+(10*Math.cos(that.load_indicator)));
          for(i = 0; i <= 100; i += 4) {
            ctx.lineTo(i, 10+(10*Math.cos(((i*Math.PI*4)/100)+that.load_indicator)));
          }
          for(i = 0; i <= 100; i += 10) {
            ctx.moveTo(i, 10+(10*Math.cos(((i*Math.PI*4)/100)+that.load_indicator)));
            ctx.lineTo(i, 10+(10*Math.sin(((i*Math.PI*4)/100)+that.load_indicator)));
          }
          ctx.stroke();
          ctx.strokeStyle = '#F00';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(30, 10+(10*Math.cos(((30*Math.PI*4)/100)+that.load_indicator)));
          ctx.lineTo(30, 10+(10*Math.sin(((30*Math.PI*4)/100)+that.load_indicator)));
          ctx.stroke();
        }
      };

      //Mouse and Touch events
      TouchEvents(that.canvas, {
        click: function(ev) {that.root_container.event('click', ev, {x:0, y:0})},
        doubleclick: function(ev) {that.root_container.event('doubleclick', ev, {x:0, y:0})},
        dragStart: function(ev) {that.root_container.event('dragStart', ev, {x:0, y:0})},
        dragMove: function(ev) {that.root_container.event('dragMove', ev, {x:0, y:0})},
        dragEnd: function(ev) {that.root_container.event('dragEnd', ev, {x:0, y:0})},
        mouseWheel: function(ev) {that.root_container.event('mouseWheel', ev, {x:0, y:0})}
      });

      //Layout consts
      that.gene_map_height = 100;
      that.col_header_height = 100;
      that.row_height = 15;
      that.compressed_row_height = 2;
      that.cluster = 0;

      //Bounding boxes set on resize

      //Data to show
      that.data = {
        samples: [],
        sample_and_label_list: [],
        gene_info: null,
        annotations: [],
        snps: []
      };
      var locator = DQX.attr('start');
      that.data.annotation_cache = IntervalCache(that.providers.annotation, locator, null, that.newAnnotations);
      that.data.snp_cache = SNPCache(providers, that.newData, that.newPositions, []);

      //View parameters
      that.view = {
        colours: ColourAllocator(),
        genome_scale: Scale(),
        last_genome_scale_domain: [0, 0],
        snp_scale: Scale(),
        start_snp: 0,
        end_snp: 0,
        compress: false,
        row_height: that.row_height,
        scroll_pos: 0,
        chrom: 'MAL13',
        selected_snps: [],
        row_header_width: 150,
        //Rescale the SNPs based on a genomic range
        rescaleGenomic: function (target) {
          if (!target) {
            target= {left:that.view.genome_scale.domain()[0],
              right:that.view.genome_scale.domain()[1]};
          }
          var left = that.data.snp_cache.posToIndex(target.left);
          var right = that.data.snp_cache.posToIndex(target.right);
          if (_.isEqual(that.view.snp_scale.domain(), [0,0])) {
            that.view.snp_scale.domain([left, right]);
          } else {
            that.view.snp_scale.tweenTo({left: left, right: right});
          }
          that.last_view_change = 'genome';
        },
        //Rescale the genome based on a range of SNPs
        rescaleSNPic: function (target) {
          var left = that.data.snp_cache.indexToPos(target.left);
          var right = that.data.snp_cache.indexToPos(target.right);
          that.view.genome_scale.tweenTo({left: left, right: right});
          that.last_view_change = 'snp_move';
        }
      };
      var col_header = ColumnHeader(that.data, that.view, that.col_header_height, that.clickSNP);
      that.root_container = Container([
        {name: 'data_area', t:that.gene_map_height, content:
          TabContainer([
            {name: 'genotypes', content:
              Container([
                {name:'table', t: that.col_header_height, content:Genotypes(that.data, that.view)},
                {name:'column_header', content: col_header},
                {name:'row_header', t: that.col_header_height, content:RowHeader(that.data, that.view)}
                ])},
            {name: 'bifurcation', content:
              Container([
                {name:'table', t: that.col_header_height, content:Bifurcation(that.data, that.view)},
                {name:'column_header', content: col_header},
              ])},
            {name: 'ld', content:
              Container([
                {name:'table', t: that.col_header_height, content: LDMap(that.data, that.view)},
                {name:'column_header', content: col_header},
              ])},
            {name: 'network', content:
              Container([
                {name:'network', t: that.col_header_height, content: Network(that.data, that.view)},
                {name:'column_header', content: col_header},
              ])},
          ])},
        {name: 'genome', content:GeneMap(that.data, that.view)},
        {name: 'controls', content:Controls(that.data, that.view,
          {w:that.view.row_header_width, h:that.gene_map_height})
        },
      ]);
      that.data.snp_cache.set_chrom('MAL13');
      that.last_view_change = 'genome';


      //How to divide the samples
      that.view.sample_heirachy = [
        {
          key: function (sample) {
            return sample.Classifications.subcont[0].Name;
          },
          comparator: d3.descending
        },
        {
          key: function (sample) {
            return sample.Classifications.region[0].Name;
          },
          comparator: d3.descending
        }
        //Commented out on request of DK
//                    {
//                        key: function (sample) {
//                            return sample.SampleContext.Site.Name;
//                        },
//                        comparator: d3.descending
//                    }

      ];
      that.sample_leaf_sort = DQX.comp_attr('ID', d3.descending);
      that.sample_nest = [];
      that.setSamples([]);

      that.resize();

      easel.Ticker.useRAF = true;
      easel.Ticker.addEventListener("tick", that.tick);
      easel.Ticker.setFPS(60);

      return that;
    };
  }
);