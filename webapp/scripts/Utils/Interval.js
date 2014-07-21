// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([],
  function () {
    function Interval(start, end) {
      this.start = start;
      this.end = end;
      if (end < start) {
        DQX.reportError('Negative interval created')
      }
    }

    Interval.prototype.length = function() {
      return this.end - this.start
    };

    Interval.prototype.overlaps = function (interval) {
      return this.start <= interval.end && interval.start <= this.end;
    };

    Interval.prototype.equals = function (interval) {
      return this.start === interval.start && interval.end === this.end;
    };

    return Interval;
  }
);