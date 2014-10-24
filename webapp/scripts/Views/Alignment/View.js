// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(['_', 'd3',
    "Views/Genotypes/Components/Container",
  ],
  function (_, d3, Container) {
    return function View(initial_params) {
      var that = {};
      that.init = function (initial_params) {
        that.height = 300;
        that.scale =  d3.scale.linear();

        //Vars set by params
        _.extend(that, initial_params);

      };

      that.update_params = function (view_params) {
        _.extend(that, view_params);
      };

      that.draw = function (ctx, ctx_left, clip, model) {
        ctx.clearRect(clip.l, clip.t, clip.r - clip.l, clip.b - clip.t);

        //Grab some stuff to make loops faster
        var chunks = model.chunks;
        var start = model.start;
        var end = model.end;
        that.scale.domain([start, end]).range([0,clip.r - clip.l]);
        ctx.save();
        var row_height = 5;//Math.floor(that.scale(1) - that.scale(0));
        ctx.font = "" + row_height + "px monospace";
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';
        ctx.strokeStyle = 'rgb(40,40,40)';
        ctx.fillStyle = 'rgb(140,140,140)';

        //First try to lay everything out so we know how high we are going to go.
        //This array keeps track of the point at which a row becomes free
        var row_reservations = [];
        for (var c = 0; c < chunks.length; c++) {
          var chunk = chunks[c], lens = chunks[c].len.array, poss = chunks[c].pos.array, seqs = chunks[c].seq.array[0];
          var seq_start = 0;
          for (var r = 0; r < lens.length; r++) {
            var len = lens[r], pos = poss[r];
            //Skip reads outside the display
            if (pos+len < start) {
              seq_start += len;
              continue;
            }
            //For chunks other than the first skip reads starting before the chunk
            if (c != 0 && pos < chunk.start) {
              seq_start += len;
              continue;
            }
            //Find the first slot that is empty
            var row = _.findIndex(row_reservations, function(row_taken_until) {
              return row_taken_until < pos;
            });
            if (row === -1)
              row = row_reservations.length;
            //Mark the row as reserved until we end
            row_reservations[row] = pos+len;
          //  ctx.fillText(seqs.slice(seq_start, seq_start+len), that.scale(pos), that.height - row*row_height);
            ctx.fillRect(that.scale(pos), that.height - row*row_height - row_height, that.scale(len)-that.scale(0), row_height);
            ctx.strokeRect(that.scale(pos), that.height - row*row_height - row_height, that.scale(len)-that.scale(0), row_height);
            seq_start += len;
          }
        }
        ctx.restore();
      };

      that.init(initial_params);
      return that
    };
  });
