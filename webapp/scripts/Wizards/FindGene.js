// This file is part of Panoptes - Copyright (C) 2014 CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
﻿define([
    "require", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Popup", "DQX/Wizard", "DQX/DataFetcher/DataFetchers",
    "Wizards/FindGeneControl",
    "MetaData"],
    function (
        require, Framework, Controls, Msg, SQL, DocEl, Popup, Wizard, DataFetcher,
        FindGeneControl,
        MetaData
        ) {

        var FindGene  = {};

        FindGene.theWizard = null;

        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Implements the "Find Gene" wizard
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        FindGene.init = function() {
            if (FindGene.theWizard)
                return;
            FindGene.theWizard = Wizard.Create("FindGeneWizard");

            FindGene.theWizard._currentSearchNr = 0;

            FindGene.theWizard._recentList = [];

            //Adds a new gene to the list of recently found genes
            FindGene.theWizard.addGeneHit = function (id) {
                var isPresent = false;
                for (var i = 0; i < FindGene.theWizard._recentList.length; i++)
                    if (FindGene.theWizard._recentList[i] == id)
                        isPresent = true;
                if (!isPresent)
                    FindGene.theWizard._recentList.unshift(id);
            }

            //Thif function sets the resulting gene after the wizard was run
            FindGene.theWizard.setResult = function (id) {
                FindGene.theWizard.addGeneHit(id);
                FindGene.theWizard.resultGeneID = id;
            }

            FindGene.theWizard.setTitle("Find Gene");

            /////// First page: buttons with the search options /////////////////////////////////

            var searchOptions = [
                { id: 'choice1', name: 'Name or description' },
                { id: 'choice3', name: 'Genomic region' }
            ];
            var buttonList = [Controls.Static('Search for a gene by:').makeComment()];
            for (var i = 0; i < searchOptions.length; i++) {
                var bt = Controls.Button(searchOptions[i].id, { width: 500, content: searchOptions[i].name, fastTouch: true })
                    .setOnChanged(function (id) { FindGene.theWizard.jumpToPage(id); });
                buttonList.push(bt);
            }

            FindGene.theWizard.addPage({
                id: 'init',
                //helpUrl: 'Doc/FindGene.theWizard/Help.htm',
                form: Controls.CompoundVert([Controls.CompoundVert(buttonList), Controls.CompoundHor([])]),
                hideNext: true
            });

            /////// Page: find keyword /////////////////////////////////

            FindGene.theWizard.controlFindByKeyword = FindGeneControl.Instance('FindByKeyword', {
                database: MetaData.database,
                annotationTableName: MetaData.tableAnnotation,
                notifyEnter: function () {
                    if (FindGene.theWizard.controlFindByKeyword.getHasValidGeneList())
                        FindGene.theWizard._onNext();
                }
            });
            FindGene.theWizard.controlFindByKeyword.setHasDefaultFocus();
            FindGene.theWizard.addPage({
                id: 'choice1',
                form: Controls.CompoundVert([FindGene.theWizard.controlFindByKeyword]),
                //helpUrl: 'Doc/FindGene.theWizard/Help.htm',
                reportValidationError: function () {
                    var id = FindGene.theWizard.controlFindByKeyword.getValue();
                    if (!id) return "There is no gene selected";
                },
                onFinish: function () {
                    FindGene.theWizard.setResult(FindGene.theWizard.controlFindByKeyword.getValue());
                }
            });


            /////// Page: search by position /////////////////////////////////

            FindGene.theWizard.searchChromosome = Controls.Combo('SearchRegionChromosome', { label: 'Chromosome:', value: 'NRAF', states: MetaData.chromosomes }).setHasDefaultFocus();
            FindGene.theWizard.searchStart = Controls.Edit('SearchRegionStart', { size: 10 });
            FindGene.theWizard.searchEnd = Controls.Edit('SearchRegionEnd', { size: 10 });
            var handleModifiedStart = function () { FindGene.theWizard.handleModifiedStart(); };
            var handleFindRegion = function () { FindGene.theWizard.findGenesInRegion(); };
            FindGene.theWizard.searchChromosome.setOnChanged(handleFindRegion);
            FindGene.theWizard.searchStart.setOnChanged(handleModifiedStart);
            FindGene.theWizard.searchEnd.setOnChanged(handleFindRegion);
            FindGene.theWizard.resultList_Region = Controls.List('SearchResultListRegion', { width: -1, height: 250 });
            FindGene.theWizard.searchRegionStatus = Controls.Html('SearchRegionStatus', '');
            FindGene.theWizard.addPage({
                id: 'choice3',
                //helpUrl: 'Doc/FindGene.theWizard/Help.htm',
                form: Controls.CompoundVert([
                    Controls.Static('Select a genomic region:').makeComment(),
                    Controls.CompoundHor([
                        FindGene.theWizard.searchChromosome,
                        Controls.Static('&nbsp;&nbsp;&nbsp; Start:&nbsp;'),
                        FindGene.theWizard.searchStart,
                        Controls.Static('&nbsp;bp'),
                        Controls.Static('&nbsp;&nbsp;&nbsp; End:&nbsp;'),
                        FindGene.theWizard.searchEnd,
                        Controls.Static('&nbsp;bp')
                    ]),
                    Controls.Static('<br>Select a gene from the list of matches:').makeComment(),
                    FindGene.theWizard.resultList_Region,
                    FindGene.theWizard.searchRegionStatus
                ]),
                reportValidationError: function () {
                    var id = FindGene.theWizard.getPage('choice3').form.findControl('SearchResultListRegion').getValue();
                    if (!id) return "There is no gene selected";
                },
                onFinish: function () {
                    FindGene.theWizard.setResult(FindGene.theWizard.findRegionIDMap[FindGene.theWizard.getPage('choice3').form.findControl('SearchResultListRegion').getValue()]);
                }
            });


            //Executes the wizard, providing a function that will be called upon successful completion
            FindGene.theWizard.execute = function (retFunction) {
                var recentList = FindGene.theWizard.getPage('init').form._controls[1];
                recentList.clear();
                if (FindGene.theWizard._recentList.length == 0)
                    recentList.addControl(Controls.Static(""));
                else
                    recentList.addControl(Controls.Static("<br/><br/>Recent hits:&nbsp;"));
                for (var i = 0; i < Math.min(10, FindGene.theWizard._recentList.length); i++) {
                    if (i > 0)
                        recentList.addControl(Controls.Static('&nbsp;&nbsp;&nbsp;'));
                    var link = Controls.Hyperlink('RecentHit_' + i, { content: FindGene.theWizard._recentList[i] });
                    link.geneid = FindGene.theWizard._recentList[i];
                    link.setOnChanged(function () {
                        FindGene.theWizard.setResult(this.geneid);
                        FindGene.theWizard.performFinish();
                    });
                    recentList.addControl(link);
                }

                FindGene.theWizard.run(retFunction);
            }



            //Sets a message on the find in region page
            FindGene.theWizard.setSearchResultMessage_Region = function (msg) {
                FindGene.theWizard.resultList_Region.getJQElement('').html('<i> ' + msg + '</i>');
            }

            //Internal: Callback that is executed when the search in region option returns data from the server
            FindGene.theWizard._respond_findGenesInRegion = function (data) {
                var chromid = FindGene.theWizard.searchChromosome.getValue();
                var descrs = data.descr;
                var startlist = data.fstart;
                var endlist = data.fstop;
                var ids = data.fid;
                var items = [];
                FindGene.theWizard.findRegionIDMap = {};
                for (var i = 0; i < descrs.length; i++) {
                    var descr = '<b>{chrom}:{p1}-{p2}</b><br>{id}; {descr}'.DQXformat({ id: ids[i], chrom: chromid, p1: startlist[i], p2: endlist[i], descr: descrs[i] });
                    items.push({ id: 'id' + i, content: descr });
                    FindGene.theWizard.findRegionIDMap['id' + i] = ids[i];
                }
                FindGene.theWizard.resultList_Region.setItems(items, 'id0');
                if (descrs.length > 200)
                    FindGene.theWizard.searchRegionStatus.modifyValue('<i>Result set limited to the first 100 hits</i>');
                else
                    FindGene.theWizard.searchRegionStatus.modifyValue('');
            }

            //Internal: called when the start position of the region search was modified
            FindGene.theWizard.handleModifiedStart = function () {
                var str_start = FindGene.theWizard.searchStart.getValue();
                var str_stop = FindGene.theWizard.searchEnd.getValue();
                if (str_start) {
                    var val_start = parseInt(str_start);
                    if (val_start > 0) {
                        var val_stop = parseInt(str_stop);
                        if ((!val_stop) || (val_stop < val_start))
                            FindGene.theWizard.searchEnd.modifyValue(str_start);
                        else
                            FindGene.theWizard.findGenesInRegion();
                    }
                }
            }

            //Internal: executes the find in region action
            FindGene.theWizard.findGenesInRegion = function () {
                FindGene.theWizard._currentSearchNr++;
                var thisSearchNr = FindGene.theWizard._currentSearchNr;
                FindGene.theWizard.resultList_Region.setItems([], '');
                var chromid = FindGene.theWizard.searchChromosome.getValue();
                var str_start = FindGene.theWizard.searchStart.getValue();
                var str_stop = FindGene.theWizard.searchEnd.getValue();
                if (str_start && str_stop) {
                    var val_start = parseInt(str_start);
                    var val_stop = parseInt(str_stop);
                    FindGene.theWizard.setSearchResultMessage_Region('Fetching search hits...');
                    var whc = SQL.WhereClause.AND([
                        SQL.WhereClause.CompareFixed('chromid', '=', chromid),
                        SQL.WhereClause.CompareFixed('fstop', '>=', str_start),
                        SQL.WhereClause.CompareFixed('fstart', '<=', str_stop),
                        SQL.WhereClause.CompareFixed('ftype', '=', 'gene'),
                    ]);
                    var fetcher = DataFetcher.RecordsetFetcher(serverUrl, MetaData.database, MetaData.tableAnnotation);
                    fetcher.setMaxResultCount(201);
                    fetcher.addColumn('fid', 'ST');
                    fetcher.addColumn('fname', 'ST');
                    fetcher.addColumn('descr', 'ST');
                    fetcher.addColumn('fstart', 'IN');
                    fetcher.addColumn('fstop', 'IN');
                    fetcher.getData(whc, "fstart",
                        function (data) { if (thisSearchNr == FindGene.theWizard._currentSearchNr) FindGene.theWizard._respond_findGenesInRegion(data) },
                        DQX.createMessageFailFunction()
                    );
                }
            }
        }


        FindGene.execute = function() {
            FindGene.theWizard.execute(function () {
                Msg.send({type:'GenePopup'}, FindGene.theWizard.resultGeneID);
            });

        }

        return FindGene;
    });

////Global function that can be called to execute the find gene wizard
//function executeFindGene.theWizard() {
//    FindGene.theWizard.execute(function () {
//        require("Common").showGenePopup(FindGene.theWizard.resultGeneID);
//    });
//}
