// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
﻿define(["require", "DQX/Framework", "DQX/Msg", "DQX/Utils", "DQX/DocEl", "DQX/Controls", "DQX/SQL", "DQX/DataFetcher/DataFetchers"],
    function (require, Framework, Msg, DQX, DocEl, Controls, SQL, DataFetcher) {
        FindGeneControlModule = {

            /////////////////////////////////////////////////////////////////////////////////////////////
            // Implements a control that displays a 'find gene by keyword' GUI compound
            /////////////////////////////////////////////////////////////////////////////////////////////

            //Creates the control
            //args.database should contain the server database name with the genome annotation
            //args.annotationTableName should contain the server table name with the genome annotation
            Instance: function (iid, args) {
                var that = Controls.CompoundVert([]);
                that._myID = iid;
                DQX.requireMember(args, 'database');
                DQX.requireMember(args, 'annotationTableName');
                that.database = args.database;
                that.annotationTableName = args.annotationTableName;
                that._currentSearchNr = 0;

                that.getFullID = function (extension) {
                    return this._myID + '_' + extension;
                }

                that._ajaxResponse_FindGene = function (resp) {
                    var keylist = DQX.parseResponse(resp); //unpack the response
                    if ("Error" in keylist) {
                        this.setSearchResultMessage(keylist.Error);
                        return;
                    }
                    var pattern = keylist['pattern'];
                    var vallistdecoder = require("DQX/DataDecoders").ValueListDecoder();
                    var genelist = vallistdecoder.doDecode(keylist['Hits']);
                    var chromidlist = vallistdecoder.doDecode(keylist['Chroms']);
                    var startlist = vallistdecoder.doDecode(keylist['Starts']);
                    var endlist = vallistdecoder.doDecode(keylist['Ends']);
                    var ids = vallistdecoder.doDecode(keylist['IDs']);
                    var descrs = vallistdecoder.doDecode(keylist['Descrs']);
                    if (ids.length == 0) {
                        this.setSearchResultMessage('<b>No hits were found</b>');
                        this.resultList.setItems([], '');
                        this._hasValidGeneList = false;
                    }
                    else {
                        this.idMap = {};
                        var items = [];
                        for (var i = 0; i < descrs.length; i++) {
                            var txt = descrs[i];
                            txt = txt.replace(/;/g, '; ');
                            txt = DQX.highlightText(txt, pattern);
                            var descr = txt + ' <span style="color:rgb(160,140,110)">({id}; {chrom}:{p1}-{p2})</span>'.DQXformat({ id: ids[i], chrom: chromidlist[i], p1: startlist[i], p2: endlist[i] });
                            descr = '<span style="word-wrap:break-word">'+descr+'</span>'
                            items.push({ id: 'id' + i, content: descr });
                            this.idMap['id' + i] = ids[i];
                        }
                        this.resultList.setItems(items, 'id0');
                        this._hasValidGeneList = true;
                    }
                }

                that.findMatchingGenes = function () {
                    this._hasValidGeneList = false;
                    this.resultList.setItems([], '');
                    var txt = this.searchText.getValue();
                    this._currentSearchNr++;
                    var thisSearchNr = this._currentSearchNr;
                    if (txt.length == 0) {
                        this.setSearchResultMessage('No search text provided');
                        return;
                    }
                    if (txt.length < 2) {
                        this.setSearchResultMessage('Search text too short');
                        return;
                    }
                    var myurl = DQX.Url(serverUrl);
                    myurl.addUrlQueryItem('datatype', 'findgene');
                    myurl.addUrlQueryItem('pattern', txt);
                    myurl.addUrlQueryItem('count', 100);
                    myurl.addUrlQueryItem('reportall', 1);
                    myurl.addUrlQueryItem('database', this.database);
                    myurl.addUrlQueryItem('table', this.annotationTableName);
                    this.setSearchResultMessage('Fetching search hits...');
                    $.ajax({
                        url: myurl.toString(),
                        success: function (resp) {
                            if (thisSearchNr == that._currentSearchNr) $.proxy(that._ajaxResponse_FindGene, that)(resp);
                        },
                        error: function (resp) { that.setSearchResultMessage("<b>Failed to fetch gene information</b>"); }
                    });
                }

                that.setSearchResultMessage = function (msg) {
                    this.resultList.getJQElement('').html('<i> ' + msg + '</i>');
                }

                that.getValue = function () {
                    var id = this.resultList.getValue();
                    if (!id) return '';
                    return this.idMap[id];
                }

                that.setHasDefaultFocus = function () {
                    this.searchText.setHasDefaultFocus();
                    return this;
                }

                that.getHasValidGeneList = function () {
                    return that._hasValidGeneList;
                }


                that.searchText = Controls.Edit(that.getFullID('SearchText'), { size: 50 }).setHasDefaultFocus();
                that.searchText.setOnChanged($.proxy(that.findMatchingGenes, that));
                that.resultList = Controls.List(that.getFullID('SearchResultList'), { width: -1, height: 235 });
                if (args.notifyEnter) {
                    that.searchText.setNotifyEnter(args.notifyEnter);
                    that.resultList.setOnDoubleClick(args.notifyEnter);
                }

                that.addControl(Controls.Static('Enter a keyword or partial keyword:<br>(This text will be searched in the gene name and description fields)').makeComment());
                that.addControl(that.searchText);
                that.addControl(Controls.Static('<br>Select a gene from the list of matches:').makeComment());
                that.addControl(that.resultList);

                return that;
            },

            end: true
        };
        return FindGeneControlModule;
    });