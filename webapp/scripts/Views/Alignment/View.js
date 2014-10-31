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
        ctx.font = fontsize + 'px monospace';

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
          var i_cigar = 0;
          for ( r = 0; r < lens.length; r++) {
            len = lens[r], pos = poss[r];
            //Skip reads outside the display
            if (pos + len < start || pos > end || (c != 0 && pos < chunk.start)) {
              seq_start += len;
              while (!(cigars[i_cigar++] === -1 & cigars[i_cigar++] === -1)) {
              }
              continue;
            }
            row = rows[read];
            //TODO Fair Integer pixel allocation similar to genotypes
            var top = height - row * row_height - row_height
            var seq = seqs.slice(seq_start, seq_start + len);
            var ref_slice = ref.slice(pos - chunk.start, pos - chunk.start + len*2);
            var i_seq = 0;
            var i_ref =0;
            var i;
            var type, c_len;
            while (!( (type = cigars[i_cigar++]) == -1 & (c_len = cigars[i_cigar++]) == -1)) {
              if (type === 0 || type === 7 || type === 8) { //Align MATCH
                ctx.fillStyle = 'rgb(0,55,135)';
                ctx.fillRect(scale(pos), top, base_width * c_len, row_height);
                ctx.fillStyle = 'rgb(180,0,0)';
                for (i = 0; i < c_len; i++) {
                  if (seq[i_seq + i] !== 'N' && seq[i_seq + i] !== ref_slice[i_ref + i])
                    ctx.fillRect(Math.round(scale(pos + i)), top, Math.max(1, Math.round(base_width)), row_height);
                  else if (seq[i_seq + i] === 'N') {
                    ctx.fillStyle = 'rgb(40,40,40)';
                    ctx.fillRect(Math.round(scale(pos + i)), top, Math.max(1, Math.round(base_width)), row_height);
                    ctx.fillStyle = 'rgb(180,0,0)';
                  }
                }
                ctx.fillStyle = 'rgb(255,255,255)';
                if (fontsize >= 3) {
                  for (i = 0; i < c_len; i++, i_ref++)
                    ctx.fillText(seq[i_seq++], scale(pos++) + (base_width / 2), top + (row_height / 2));
                }
                else {
                  i_seq += c_len;
                  i_ref += c_len;
                  pos += c_len
                }
              } else if (type === 1) { //INS
                ctx.fillStyle = 'rgb(78,154,0)';
                ctx.beginPath();
                ctx.moveTo(scale(pos) - base_width, top);
                ctx.lineTo(scale(pos) + base_width, top);
                ctx.lineTo(scale(pos), top+(row_height/2));
                ctx.closePath();
                ctx.fill();
                i_seq += c_len;
              } else if (type === 2) { //DEL
                ctx.fillStyle = 'rgb(40,40,40)';
                ctx.fillRect(Math.round(scale(pos)), top + (row_height/3), Math.max(1, Math.round(base_width * c_len)), row_height/3);
                pos += c_len;
                i_ref += c_len;
              } else if (type === 3) { //REF_SKIP
                pos += c_len;
                i_ref += c_len;
              } else if (type === 4) { //SOFT CLIP
                i_seq += c_len;
              } else if (type === 5) { //HARD CLIP
              } else if (type === 6) { //PAD
              }
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
