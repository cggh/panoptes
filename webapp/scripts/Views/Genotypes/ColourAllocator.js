// This file is part of Panoptes - © Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["_"],
  function (_) {
    return function ColourAllocator() {
      var that = {};
      that.colours = [0x800000, 0xFF0000, 0xFFFF00, 0x808000, 0x00FF00,	0x008000,	0x00FFFF,
        0x008080,	0x0000FF,	0x000080,	0xFF00FF, 0x800080];
      that.used_count = _(that.colours).map(function(col) {return {col:col, count:0}});
      that.get = _.memoize(function(){
        var col = that.used_count.min('count').value();
        col.count += 1;
        return col.col;
      });

      return that;
    }
  });
