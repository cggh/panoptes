// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/Utils"],
    function (require, DQX) {

        var treeCreator = function() {
            var that = {};

            that.load = function(settings, data) {
                that.root = null;
                try {
                    that.loadNewick(data);
                }
                catch(err) {
                    DQX.reportError(err);
                }
                if (!that.root)
                    return;
                that.layout();
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
//                    console.log('stripping'+data.charAt(range.start)+data.charAt(range.end));
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

                    var branch = {
                        children: [],
                        parent: null,
                        itemid: null,
                        distance: 0
                    };

                    var debugReport = function(str) {
//                        for (var i=0; i<level; i++) {
//                            str = '|  ' + str;
//                        }
//                        console.log(str);
                    }

                    var getSubRanges = function(sepChar) {//returns a set of subranges separated by a character, at the current level
                        var splitpoints = [range.start-1];
                        for (var i=range.start; i<=range.end; i++)
                            if ((levels[i]==level) && (data.charAt(i)==sepChar))
                                splitpoints.push(i);
                        splitpoints.push(range.end+1);
                        var subranges = [];
                        for (var i=0; i<splitpoints.length-1; i++) {
                            subranges.push({
                                start:splitpoints[i]+1,
                                end:splitpoints[i+1]-1
                            });
                        }
                        return subranges;
                    }

                    debugReport(getRange(range));
                    //Determine if distance indication is present (:distance)
                    var subr = getSubRanges(':');
                    if (subr.length>1) {
                        range = subr[0];
                        distrange = subr[1];
                        stripBracketsFromRange(distrange);
                        branch.distance = parseFloat(getRange(distrange));
                    }

                    stripBracketsFromRange(range);
                    level += 1;

                    //figure out if this token is an enumeration of comma separated subtokens
                    var subranges = getSubRanges(',');
                    if (subranges.length>1) {//parse subtokens
                        $.each(subranges, function(idx, subrange) {
                            var subBranch = parse(subrange, level);
                            subBranch.parent = branch;
                            branch.children.push(subBranch);
                        });
                    }
                    else {//parse endpoint
                        stripBracketsFromRange(range);
                        branch.itemid = getRange(range);
                    }

                    return branch;
                };

                var endPos = 0;
                while ((endPos<data.length) && ((data.charAt(endPos)!=')') || (levels[endPos]>0)) )
                    endPos++;
                var globalRange = {start: 0, end: endPos};
                that.root = parse(globalRange, 0);
            }


            that.layout = function() {
                var countItems = function(branch) {
                    var cnt = 0;
                    $.each(branch.children, function(idx, child) {
                        cnt += countItems(child);
                    });
                    if (branch.itemid)
                        cnt += 1;
                    branch.itemCount = cnt;
                    return cnt;
                }
                countItems(that.root);
                debugger;
            }


            return that;
        }

        return treeCreator;
    });


