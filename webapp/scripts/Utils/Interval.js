// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([],
  function () {
    function Interval(start, end) {
      this.start = start;
      this.end = end;
      this.pages = {};
      this.fetching = [];
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

    Interval.prototype.has_fetched = function (page) {
      return _(this.pages).keys().contains(page.toString());
    };

    Interval.prototype.is_fetching = function (page) {
      return _(this.fetching).contains(page);
    };

    return Interval;
  }
);