define(["lodash", "d3", "MetaData", "DQX/SVG"],
  function (_, d3, MetaData, SVG) {
    return function SNPCache(providers, update_callback, position_update_callback, samples) {


      var UNFETCHED = 0;
      var FETCHING = 1;
      var FETCHED = 2;
      var CHUNK_SIZE = 2000;

      var that = {};
      that.genotype_provider = providers.genotype;
      that.position_provider = providers.position;
      that.update_callback = update_callback;
      that.position_update_callback = position_update_callback;

      that.samples = samples;
      that.snp_positions_by_chrom = {};
      that.snp_positions = [];
      that.snps_by_chrom = {};
      that.snps = [];
      //Genotypes by chrom then sample then call type
      that.genotypes_by_chrom = {};
      that.genotypes = undefined;
      //Fetch state by chrom
      that.fetch_state_by_chrom = {};
      that.fetch_state = [];

      that.provider_queue = [];
      that.current_provider_requests = 0;
      that.fetching_positions = false;

      that.colour_table = [];
      that.colour_table_r = new Uint8Array(256);
      that.colour_table_g = new Uint8Array(256);
      that.colour_table_b = new Uint8Array(256);

      for (var l = 0; l < 16; ++l)
        for (var h = 0; h < 16; ++h) {
          var col = SVG.hsl_to_rgb(
            Math.round(240 + ((h/16) * 120)),
            100,
            Math.round(100 - ((l/16)*50)));
          that.colour_table[l + (16 * h)] = DQX.getRGB(col.r, col.g, col.b);
          that.colour_table_r[l + (16 * h)] = col.r;
          that.colour_table_g[l + (16 * h)] = col.g;
          that.colour_table_b[l + (16 * h)] = col.b;
        }

      that.snp_col_index = function(ref, alt) {
        var tot = ref + alt;
        var light_index = Math.floor((Math.min(tot, 10) / 10) * 15);
        var hue_index = tot > 0 ? Math.floor((alt/tot) * 15) : 0;
        return light_index + 16 * hue_index;
      };



      that.set_samples = function(samples) {
        //Clear out everything
        that.samples = samples;
        that.genotypes_by_chrom = {};
        _(that.fetch_state_by_chrom).forEach(function (fetch_state, chrom){
          that.fetch_state_by_chrom[chrom] = new Uint8Array(fetch_state.length);
        });
        that.provider_queue = [];
        //Then call set chrom to set the data we expose
        that.set_chrom(that.chrom);
      };

      that.set_chrom = function(chrom) {
        that.chrom = chrom;
        //Insert arrays for this chrom
        that.snp_positions_by_chrom[chrom] || (that.snp_positions_by_chrom[chrom] = []);
        that.snps_by_chrom[chrom] || (that.snps_by_chrom[chrom] = {});
        that.fetch_state_by_chrom[chrom] || (that.fetch_state_by_chrom[chrom] = []);

        //Set the data to be this chrom
        that.snp_positions = that.snp_positions_by_chrom[chrom];
        that.snps = that.snps_by_chrom[chrom];
        that.genotypes = that.genotypes_by_chrom[chrom];
        that.fetch_state = that.fetch_state_by_chrom[chrom];

        if (that.snp_positions.length == 0 && !that.fetching_positions) {
          //Request the snp index
          that.fetching_positions = true;
          that.current_provider_requests += 1;
          that.position_provider(chrom, function(positions) {
            if (positions) {
              that.snp_positions_by_chrom[chrom] = positions;
              that.fetch_state_by_chrom[chrom] = new Uint8Array(Math.ceil(positions.length / CHUNK_SIZE));
              that.snps_by_chrom[chrom].alt = new Uint16Array(positions.length);
              that.snps_by_chrom[chrom].ref = new Uint16Array(positions.length);
              that.snps_by_chrom[chrom].alt_total = new Uint32Array(positions.length);
              that.snps_by_chrom[chrom].ref_total = new Uint32Array(positions.length);
              that.fetching_positions = false;
              //Call again to set the data to the chrom again as we changed it and get an update_callback run.
              that.set_chrom(chrom);
              that.position_update_callback();
              console.log('Positions loaded '+ chrom);
            }
            else {
              console.log('Error in snp position fetch '+ chrom);
              that.fetching_positions = false;
              that.snp_positions_by_chrom[chrom] = [];
            }
            that.current_provider_requests -= 1;
          })
        }
        that.update_callback();
      };

      that.retrieve_by_index = function (start, end) {
        if (!that.chrom) return;
        start = Math.max(0, Math.floor(start));
        end = Math.max(0,Math.ceil(end));
        //Convert to nearest chunk boundaries
        start = Math.floor(start / CHUNK_SIZE);
        end = Math.ceil(end / CHUNK_SIZE);
        that.last_request = [start,end];
        for (var i = start; i < end; ++i)
          that._add_to_provider_queue_or_promote(that.chrom, i)
      };

      that.posToIndex = function (pos) {
        return _(that.snp_positions).sortedIndex(pos);
      };

      that.indexToPos = function (index) {
        index = Math.max(0, Math.floor(index));
        if (index < that.snp_positions.length)
          return that.snp_positions[index];
        else
          return _(that.snp_positions).last();
      };

      that._insert_received_data = function (chunk, samples, buffer) {
        if (samples && !_.isEqual(samples, that.samples)) return;
        var chrom = chunk.chrom;
        chunk = chunk.chunk;
        var start_index = chunk * CHUNK_SIZE;
        if (that.fetch_state_by_chrom[chrom][chunk] !== FETCHING) {
          console.log("Got data for chunk that was not fetching", chunk);
          return;
        }
        if (buffer) {
          that.fetch_state_by_chrom[chrom][chunk] = FETCHED;
          var num_snps = that.snp_positions_by_chrom[chrom].length;
          var num_samples = that.samples.length;
          that.snps_by_chrom[chrom] || (that.snps_by_chrom[chrom] = {});
          var snps = that.snps_by_chrom[chrom];
          that.genotypes_by_chrom[chrom] || (that.genotypes_by_chrom[chrom] = []);
          var genotypes = that.genotypes_by_chrom[chrom];

          _(that.samples).forEach(function (sample,i) {
            genotypes[i] || (genotypes[i] = {});
            var sample_gt = genotypes[i];
            sample_gt || (sample_gt = {});
            sample_gt.alt || (sample_gt.alt = new Uint16Array(num_snps));
            sample_gt.ref || (sample_gt.ref = new Uint16Array(num_snps));
            sample_gt.col || (sample_gt.col = new Uint8Array(num_snps));
            sample_gt.gt || (sample_gt.gt = new Uint8Array(num_snps));
          });
          var data = new Uint8Array(buffer);
          var d = 0;
          for (var i = start_index, ref = start_index+CHUNK_SIZE; i < ref; i++, d++)
            snps.ref[i] = data[d];
          for (i = start_index, ref = start_index+CHUNK_SIZE; i < ref; i++, d++)
            snps.alt[i] = data[d];
          data = new Uint16Array(buffer, d);
          d = 0;
          _(that.samples).forEach(function (sample,j) {
            var sample_gt = genotypes[j];
            //COMMENTED OUT AS OUR VCFs HAVE NO GENOTYPES!!!
//              for (var i = start_index, ref = start_index+CHUNK_SIZE; i < ref; i++, d++)
//                sample_gt.gt[i] = data[d];
            for (i = start_index, ref = start_index+CHUNK_SIZE; i < ref; i++, d++)
              sample_gt.ref[i] = data[d];
            for (i = start_index, ref = start_index+CHUNK_SIZE; i < ref; i++, d++)
              sample_gt.alt[i] = data[d];
            for (i = start_index, ref = start_index+CHUNK_SIZE; i < ref; i++) {
              var r = sample_gt.ref[i];
              var a = sample_gt.alt[i];
              var tot = r + a;
              //Inline of that.snp_col_index.... firefox is slow at function calls.
              sample_gt.col[i] =  Math.floor((Math.min(tot, 10) / 10) * 15) + 16 * (tot > 0 ? Math.floor((a/tot) * 15) : 0);
              //SET THE GENOTYPE AS IT DOES NOT COME FROM THE VCF
              sample_gt.gt[i] = a >= r ? (a >= 5 ? 1 : 0) : 0;
              if (sample_gt.gt[i])
                snps.alt_total[i] += 1;
              else
                snps.ref_total[i] += 1;

            }
          });
        } else {
          console.log("no data on genotype call");
          that.fetch_state_by_chrom[chrom][chunk] = UNFETCHED;
        }
        //Set chrom to update the exposed data
        that.set_chrom(that.chrom);
        return that.update_callback();
      };

      that._add_to_provider_queue_or_promote = function (chrom, chunk) {
        var queue_entry = {chrom: chrom, chunk: chunk};
        if (_.detect(that.provider_queue, queue_entry)) {
          //All ready in the queue so remove it and add the end
          that.provider_queue = _.reject(that.provider_queue, queue_entry);
          that.provider_queue.push(queue_entry);
        } else {
          //Not in queue
          if (that.fetch_state_by_chrom[chrom][chunk] == UNFETCHED && chunk < that.fetch_state_by_chrom[chrom].length) {
            that.fetch_state_by_chrom[chrom][chunk] = FETCHING;
            that.provider_queue.push(queue_entry);
            //If we just added the first one then we need to start the processing
            if (that.provider_queue.length == 1) {
              that._process_provider_queue()
            }
          }
        }
      };

      that._process_provider_queue = function () {
        if (that.current_provider_requests < 4 && that.provider_queue.length > 0) {
          var chunk = that.provider_queue.pop();
          var start = chunk.chunk * CHUNK_SIZE;
          var end = Math.min(that.snp_positions_by_chrom[chunk.chrom].length-1, (chunk.chunk + 1) * CHUNK_SIZE);
          console.log('fetch ' + start +':'+ end + ' ' + that.snp_positions_by_chrom[chunk.chrom][start] + ':' + that.snp_positions_by_chrom[chunk.chrom][end]);
          that.genotype_provider(chunk.chrom,
            that.snp_positions_by_chrom[chunk.chrom][start],
            that.snp_positions_by_chrom[chunk.chrom][end],
            _.map(that.samples, DQX.attr('ID')),
            function (data) {
              that.current_provider_requests -= 1;
              //Clone as otherwise these can change
              that._insert_received_data(_.clone(chunk), _.clone(that.samples), data);
            });
          that.current_provider_requests += 1;
        }
        if (that.provider_queue.length > 0) {
          setTimeout(that._process_provider_queue, 100);
        }
      };

      that.intervals_being_fetched = function() {
        var being_fetched = [];
        _(that.fetch_state).forEach(function (chunk_state, i) {
          if (chunk_state == FETCHING)
            being_fetched.push({start: that.indexToPos(i*CHUNK_SIZE),
                                end: that.indexToPos((i+1)*CHUNK_SIZE)})
        });
        return being_fetched;
      };
      return that;
    }
  }
);
