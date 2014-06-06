// This file is part of Panoptes - Copyright (C) 2014 CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["d3", "DQX/Utils"],
  function (d3, DQX) {
    return function Network(data,view) {
      var that = {};
      that.data = data;
      that.view = view;
      that.last_clip = {l:0, t:0, r:0, b:0};
      that.last_selection = [];
      that.last_samples = '';
      that.svg = null;

      that.nodes = [];
      that.links = [];

      that.tick = function () {
        that.svg.selectAll(".link").attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; })
          .style("stroke", function(d) {return d.distance > 0 ? 'rgba(255,0,0,0.75)' : 'rgba(0,0,255,0.25)'});

        that.svg.selectAll(".link_text")
          .attr("x", function(d) { return (d.source.x + d.target.x)/2; })
          .attr("y", function(d) { return (d.source.y + d.target.y)/2; })
          .text(function(d) { return d.distance > 0 ? d.distance : ''});

        that.svg.selectAll(".node").attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
      };

      that.snp_distance = function(selected, a, b) {
        var count = 0;
        for (var i = 0; i < selected.length; i++) {
          if (a[selected[i]] != b[selected[i]])
            count++;
        }
        return count;
      };

      that.draw = function (ctx, clip) {
        var view = that.view;
        var data = that.data;
        var genotypes = data.snp_cache.genotypes;
        var samples = data.samples;
        var x_scale = view.snp_scale;
        var start_snp = Math.floor(x_scale.domain()[0]);
        var end_snp = Math.ceil(x_scale.domain()[1]);

        //TODO Fix as first sample is stringged as "Object"
        var samp_list = _(samples).sortBy().reduce(function(sum, samp) { return sum + samp.ox_code;});
        var selected_list = _(view.selected_snps).sortBy().reduce(function(sum, num) { return '' + sum + num;});
        if (samp_list != that.last_samples || selected_list != that.last_selection) {
          that.nodes = data.samples;
          that.links = [];
          var to_process = [0];
          var ignore = [];
          while (to_process.length > 0) {
            var i = to_process.shift();
            if (_(ignore).contains(i))
              continue;
            for (var j = i + 1; j < samples.length; j++) {
              if (_(ignore).contains(j))
                continue;
              var distance = that.snp_distance(view.selected_snps,  genotypes[i].gt, genotypes[j].gt);
              if (distance == 0) {
                //Identical sample, ignore in future and remove all existing links to it as we only need the one we
                //are about to add.
                ignore.push(j);
                that.links = _(that.links).reject({source:j}).reject({target:j}).value();
              }
              that.links.push({
                source: i,
                target: j,
                distance: distance});
              if (distance > 0 && !_(to_process).contains(j))
                to_process.push(j);
            }
          }

          //We now need to trim those edges for which there exist other paths of the same length, but which are split.
          //Note that there is never a shorter path than the direct route

          //Make a link lookup table
          var links_by_node = {};
          var links_by_node = {};
          _(that.links).forEach(function (link) {
            if (link.distance > 0) {
              links_by_node[link.source] || (links_by_node[link.source] = []);
              links_by_node[link.source].push(link);
              links_by_node[link.target] || (links_by_node[link.target] = []);
              links_by_node[link.target].push(link);
            }
          });
          var sorted_links = _(that.links).sortBy('distance');
          that.links = sorted_links.filter(function (link) {
            //Keep the 0 and length 1 edges
            if (link.distance <= 1) return true;
            //For everything else only keep it if there is no path of the same length
            var routes = [{node:link.source, distance:0}];

            var found = false;
            while (routes.length > 0 && !found) {
              var new_routes = [];
              _(routes).forEach(function (route) {
                _(links_by_node[route.node]).forEach(function (step) {
                  if (step.source == link.source && step.target == link.target) return //Skip ourselves!
                  var new_route;
                  if (step.source == route.node) {
                    new_route = {node:step.target, distance:route.distance + step.distance}
                  } else {
                    new_route = {node:step.source, distance:route.distance + step.distance}
                  }
                  if (new_route.node != link.target) {
                    if (new_route.distance < link.distance)
                      new_routes.push(new_route); //Not there yet and not yet longer so process it next go.
                  }
                  else {
                    if (new_route.distance == link.distance)
                      found = true; //We found a route so remove the link
                  }
                });
                routes = new_routes;
              });
            }
            //No routes the same length were found so keep this one
            return !found;
          });

          //Translate to actual objects from indices
          that.links = that.links.value();
          for (i = 0; i < that.links.length; i++) {
            that.links[i].source = samples[that.links[i].source];
            that.links[i].target = samples[that.links[i].target];
          }

          var canvas = ctx.canvas;
          if (!that.svg) {
            that.svg = d3.select(ctx.canvas.parentNode).append("svg")
              .style("position","absolute");

            that.force = d3.layout.force()
              .on("tick", that.tick)
              .linkDistance(function (link) {return link.distance*75 + 0;})
              .charge(-100);
          }
          that.svg.attr("width", clip.r-clip.l)
            .attr("height", clip.b)
            .style("left", -clip.l)
            .style("top", -clip.t);

          var link = that.svg.selectAll(".link"),
          // Update the links…
          link = link.data(that.links, function(d) { return d.source.ox_code + d.target.ox_code; });
          // Exit any old links.
          link.exit().remove();
          // Enter any new links.
          var new_links = link.enter().insert("line", ".node")
            .attr("class", "link")
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

          var link_text = that.svg.selectAll(".link_text"),
          // Update the links…
          link_text = link_text.data(that.links, function(d) { return d.source.ox_code + d.target.ox_code; });
          // Exit any old links.
          link_text.exit().remove();
          // Enter any new links.
          var new_links = link_text.enter().insert("text", ".link_text")
            .attr("class", "link_text")
            .attr("x", function(d) { return (d.source.x + d.target.x)/2; })
            .attr("y", function(d) { return (d.source.y + d.target.y)/2; })
            .text(function(d) { return d.distance > 0 ? d.distance : ''});

          // Update the nodes…
          var node = that.svg.selectAll(".node");
          node = node.data(that.nodes, function(d) { return d.ox_code; })//.style("fill", color);
          // Exit any old nodes.
          node.exit().remove();
          // Enter any new nodes.
          node.enter().append("circle")
            .attr("class", "node")
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("r", "10")//function(d) { return Math.sqrt(d.size) / 10 || 4.5; })
            .style("fill", function(d) { return DQX.getRGB(view.colours.get(d.country), 0.75)})
            //.on("click", click)
            .call(that.force.drag);

          that.force
            .size([clip.r-clip.l, clip.b])
            .nodes(that.nodes)
            .links(that.links)
            .start();
        }

        that.last_samples = samp_list;
        that.last_selection = selected_list;
      };
      that.event = function(){};
      return that;
    };
  }
);

