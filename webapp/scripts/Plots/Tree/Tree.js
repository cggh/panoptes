// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require"],
    function (require) {

        var treeCreator = function() {
            var that = {};

            that.load = function(settings, data) {
                try {
                    that.loadNewick(data);
                }
                catch(err) {
                    DQX.reportError(err);
                }
            }

            that.loadNewick = function(data) {
                var levels = [];
                var currentLevel = 0;
                for (var i=0; i<data.length; i++) {
                    if (data.charAt(i) == '(')
                        currentLevel ++;
                    if (data.charAt(i) == ')')
                        currentLevel --;
                    levels.push(currentLevel);
                }

                var stripBracketsFromRange = function(range) {
                    //Strip any leading & trailing spaces, and remove surrounding () if present
                    while ((range.start<range.end) && (data.charAt(range.start)==' '))
                        range.start++;
                    while ((range.start<range.end) && (data.charAt(range.end)==' '))
                        range.end--;
                    console.log('stripping'+data.charAt(range.start)+data.charAt(range.end));
                    if ((data.charAt(range.start)=='(') && (data.charAt(range.end)==')')) {
                        range.start++;
                        range.end--;
                    }
                }

                var getRange = function(range) {
                    var str = '';for (var i=range.start; i<=range.end; i++) str+=data.charAt(i);
                    return str;
                };


                var parse = function(range, level) {
                    stripBracketsFromRange(range);
                    //debug
                    console.log(getRange(range));
                    //enddebug
                    //figure out if this token is an enumeration of comma separated subtokens
                    var splitpoints = [];
                    for (var i=range.start; i<=range.end; i++)
                        if ((levels[i]==level) && (data.charAt(i)==','))
                            splitpoints.push(i);
                    if (splitpoints.length>0) {//parse subtokens
                        for (var i=0; i<=splitpoints.length; i++) {
                            var subrange = {
                                start:(i>0)?(splitpoints[i-1]+1):range.start,
                                end:(i<splitpoints.length)?(splitpoints[i]-1):range.end
                            }
                            parse(subrange, level+1);
                        }
                    }
                    else {//parse endpoint

                    }
                };

                var endPos = 0;
                while ((endPos<data.length) && ((data.charAt(endPos)!=')') || (levels[endPos]>0)) )
                    endPos++;
                var globalRange = {start: 0, end: endPos};
                console.log(getRange(globalRange));
                parse(globalRange, 1);
            }

            return that;
        }

        return treeCreator;
    });


