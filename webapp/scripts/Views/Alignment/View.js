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
        that.height = 200;
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
        var scale = that.scale;
        var height = that.height;
        that.scale.domain([start-0.5, end-0.5]).range([0,clip.r - clip.l]);

        //First try to lay everything out so we know how high we are going to go.
        //This array keeps track of the point at which a row becomes free
        var row_reservations = [];
        //Store the final row position of each read.
        var rows = [];
        for (var c = 0; c < chunks.length; c++) {
          var chunk = chunks[c], lens = chunks[c].len.array, poss = chunks[c].pos.array
          for (var r = 0; r < lens.length; r++) {
            var len = lens[r], pos = poss[r];
            //Skip reads outside the display and For chunks other than the first skip reads starting before the chunk
            if (pos+len < start || pos > end || (c != 0 && pos < chunk.start))
              continue;
            //Find the first slot that is empty
            var row = _.findIndex(row_reservations, function(row_taken_until) {
              return row_taken_until < pos;
            });
            if (row === -1)
              row = row_reservations.length;
            //Mark the row as reserved until we end
            row_reservations[row] = pos+len;
            rows.push(row);
          }
        }
        //Now we know how many rows we need we can set the row height
        var row_height = Math.min(Math.floor(that.height/row_reservations.length), 20);
        var base_width = scale(1) - scale(0);
        var fontsize = Math.max(1, Math.floor(Math.min(row_height, base_width/0.5))-2);

        ctx.save();
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgb(40,40,40)';
        ctx.fillStyle = 'rgb(140,140,140)';

        var read = 0;
        //Loop again to draw
        for (var c = 0; c < chunks.length; c++) {
          chunk = chunks[c], lens = chunks[c].len.array, poss = chunks[c].pos.array;
          var cigars = chunks[c].cigar.array;
          var ref = chunks[c].ref_seq;
          var seqs = chunks[c].seq.array[0];
          var seq_start = 0;
          for ( r = 0; r < lens.length; r++) {
            len = lens[r], pos = poss[r];
            var cigar = cigars[r];
            //Skip reads outside the display
            if (pos + len < start || pos > end || (c != 0 && pos < chunk.start)) {
              seq_start += len;
              continue;
            }
            row = rows[read];
            //TODO Fair Integer pixel allocation similar to genotypes
            ctx.fillStyle = 'rgb(0,55,135)';
            ctx.fillRect(scale(pos), height - row * row_height - row_height, scale(len) - scale(0), row_height);
            var seq = seqs.slice(seq_start, seq_start + len);
            var ref_slice = ref.slice(pos - chunk.start, pos - chunk.start + len);
            ctx.fillStyle = 'rgb(180,0,0)';
            for (var s = 0; s < seq.length; s++)
              if (seq[s] != ref_slice[s])
                ctx.fillRect(Math.round(scale(pos + s)), height - row * row_height - row_height, Math.round(base_width), row_height);
            ctx.fillStyle = 'rgb(40,40,40)';
            for (var s = 0; s < seq.length; s++)
              if (seq[s] === 'N')
                ctx.fillRect(Math.round(scale(pos + s)), height - row * row_height - row_height, Math.round(base_width), row_height);

            if (fontsize >= 3) {
              ctx.font = fontsize + 'px monospace';
              ctx.fillStyle = 'rgb(255,255,255)';
              for (var s = 0; s < seq.length; s++)
                ctx.fillText(seq[s], scale(pos + s) + (base_width / 2), that.height - row * row_height - row_height / 2);
            }
            seq_start += len;
            read++
          }
        }

        ctx.restore();
      };

      that.init(initial_params);
      return that
    };
  });
