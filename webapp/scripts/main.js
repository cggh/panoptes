// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

//Versionstring is supposed to be defined in main.html
//It is used to differentiate different versions, preventing them from being cached
if (typeof versionString == 'undefined')
    alert('Fatal error: versionString is missing');

//Configuration of require.js
require.config({
    baseUrl: "scripts",
    paths: {
        jquery: "DQX/Externals/jquery",
        d3: "DQX/Externals/d3",
        handlebars: "DQX/Externals/handlebars",
        markdown: "DQX/Externals/markdown",
        DQX: "DQX",
        _:"DQX/Externals/lodash",
        tween: "Externals/Tween",
        datastream: "DQX/Externals/DataStream",
        blob: "DQX/Externals/Blob",
        filesaver: "DQX/Externals/FileSaver",
        lzstring: "DQX/Externals/lz-string"

    },
    shim: {
        d3: {
            exports: 'd3'
        },
        handlebars: {
            exports: 'Handlebars'
        },
        tween: {
          exports: 'TWEEN'
        },
        datastream: {
          exports: 'DataStream'
        },
        blob: {
          exports: 'Blob'
        },
        filesaver: {
          exports: 'saveAs'
        },
        lzstring: {
          exports: 'LZString'
        }
    },
    waitSeconds: 15,
    urlArgs: "version="+versionString
});


require([
    "_", "jquery", "DQX/Application", "DQX/Framework", "DQX/Msg", "DQX/Utils", "DQX/Controls", "DQX/SQL", "DQX/Popup", "DQX/PopupFrame", "DQX/DataFetcher/DataFetchers",
    "MetaData",
    "Utils/Initialise", "Views/Intro", "Views/GenomeBrowser",  "Views/TableViewer","Views/ListViewer",
    "InfoPopups/GenePopup", "InfoPopups/ItemPopup", "InfoPopups/DataItemTablePopup", "InfoPopups/DataItemPlotPopup", "InfoPopups/PropInfoPopup",
    "Wizards/PromptWorkspace", "Wizards/PromptDataSet", "Wizards/FindGene", "Wizards/FindDataItem", "Wizards/FindNote",
    "Utils/Serialise", "Utils/ButtonChoiceBox", "Plots/PlotStarter"
],
    function (
        _, $, Application, Framework, Msg, DQX, Controls, SQL, Popup, PopupFrame, DataFetchers,
        MetaData,
        Initialise, Intro, GenomeBrowser, TableViewer, ListViewer,
        GenePopup, ItemPopup, DataItemTablePopup, DataItemPlotPopup, PropInfoPopup,
        PromptWorkspace, PromptDataSet, FindGene, FindDataItem, FindNote,
        Serialise, ButtonChoiceBox, PlotStarter
        ) {
        $(function () {


            $(document).ajaxStart(function () {
                $('.PanoptesLogoBox').addClass('fa-spin');
            });
            $(document).ajaxStop(function () {
                $('.PanoptesLogoBox').removeClass('fa-spin');
            });

            function Start_Part0() {
                $(document).on('click', '.doclink', function() {
                    var target = $(this).attr('href');
                    Msg.send({ type: 'OpenDoc'}, { target: target});
                    return false;
                });
                PopupFrame.setHasThumbNails();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'serverstatus', {}, function(resp) {
                    if ('issue' in resp) {
                        var issueText = resp.issue;
                        issueText = issueText.replace(/\n/g, "<br>");
                        var content = '<div style="margin:30px"><p><h2>Server configuration problem</h2><p>' + issueText;
                        var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon: 'fa-arrow-circle-right', content: 'Proceed anyway', width:120, height:35 }).setOnChanged(function() {
                            Popup.closeIfNeeded(popupid);
                            Start_Part1();
                        });
                        content += '<p><span style="color:red"><b>The software will not work correctly!</b></span></p>'
                        content += '<br>' + bt.renderHtml();
                        content += '</div>';
                        var popupid = Popup.create('Fatal error', content, null, {canClose: false});
                        return;
                    }
                    MetaData.userId = resp.userid;
                    Start_Part1();
                });
            };

            function Start_Part1() {
                PromptDataSet.execute(function() {
                    var getter = DataFetchers.ServerDataGetter();
                    getter.addTable('chromosomes',['id','len'],null);
                    getter.execute(MetaData.serverUrl,MetaData.database,
                        function() { // Upon completion of data fetching
                            MetaData.chromosomes = getter.getTableRecords('chromosomes');
                            $.each(MetaData.chromosomes, function (idx, chr) { chr.name = chr.id; });
                            Start_Part2();
                        });
                });
            }


            // adds extra settings from a custom data source to the table settings
            var mapExtraTableSettings = function(tableInfo, customDataCatalog) {
                var tokensList = ['DataItemViews', 'PropertyGroups']; //List of all settings tokens for which this mechanism applies
                $.each(customDataCatalog, function(idx, customData) {
                    if (customData.tableid == tableInfo.id) {
                        var customSettings = JSON.parse(customData.settings);
                        $.each(tokensList, function(idx2, token) {
                            if (customSettings[token]) {
                                if (!tableInfo.settings[token]) {
                                    tableInfo.settings[token] = customSettings[token];
                                }
                                else {
                                    $.each(customSettings[token], function(idx3, extraItem) {
                                        tableInfo.settings[token].push(extraItem);
                                    });
                                }
                            }
                        });
                    }
                });
            }



            function Start_Part2() {
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'datasetinfo', {
                    database: MetaData.database
                }, function(resp) {
                    if (resp.manager)
                        MetaData.isManager = true;

                    var showError = function(tpe) {
                        var content = '<div style="padding:10px">';
                        content += '<span class="fa fa-exclamation-triangle" style="font-size: 36px; color:rgb(150,0,0);float:left;padding:10px"></span>'
                        content += 'The database schema of this dataset is outdated.<br>Please actualise it by running a <b>{tpe}</b>.<p>The application is aborted.'.DQXformat({
                            tpe:tpe
                        });
                        var bt = Controls.Button(null, {content: 'Open admin section'});
                        bt.setOnChanged(function() {
                            window.open("admin.html","_self")
                        });
                        content += bt.renderHtml();
                        content += '</div>';
                        Popup.create('Fatal error', content, null, {canClose: false});
                    }

                    if (resp.needfullreload) {
                        showError('full data reload import');
                        return;
                    }
                    if (resp.needconfigreload) {
                        showError('config update import');
                        return;
                    }
                    Start_Part3();
                });
            }

            function Start_Part3() {

                var getter = DataFetchers.ServerDataGetter();
                getter.addTable('tablecatalog',['id','name','primkey', 'IsPositionOnGenome', 'defaultQuery', 'settings'],'ordr');
                getter.addTable('customdatacatalog',['tableid','sourceid', 'settings'],'tableid');
                getter.addTable('2D_tablecatalog',['id','name','col_table', 'row_table', 'first_dimension', 'settings'],'ordr');
                getter.addTable('settings',['id','content'],'id');
                getter.addTable('graphs',['graphid','tableid', 'tpe', 'dispname', 'crosslnk'],'graphid');
                getter.execute(MetaData.serverUrl,MetaData.database,
                    function() { // Upon completion of data fetching
                        MetaData.tableCatalog = getter.getTableRecords('tablecatalog');
                        var customDataCatalog = getter.getTableRecords('customdatacatalog');
                        MetaData.twoDTableCatalog = getter.getTableRecords('2D_tablecatalog');
                        MetaData.generalSettings = {};
                        $.each(getter.getTableRecords('settings'), function(idx,sett) {
                            if (sett.content=='False')
                                sett.content = false;
                            if (sett.id == 'IntroSections') {
                                sett.content = JSON.parse(sett.content);
                            }
                            MetaData.generalSettings[sett.id] = sett.content;
                        });

                        //Load google analytics if we have an ID
                        if (MetaData.generalSettings['GoogleAnalyticsId']) {
                            (function (window, document, tag, url, obj_name, a, m) {
                                window['GoogleAnalyticsObject'] = obj_name;
                                window[obj_name] = window[obj_name] || function () {
                                    (window[obj_name].q = window[obj_name].q || []).push(arguments)
                                }, window[obj_name].l = 1 * new Date();
                                a = document.createElement(tag),
                                    m = document.getElementsByTagName(tag)[0];
                                a.async = 1;
                                a.src = url;
                                m.parentNode.insertBefore(a, m)
                            })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
                            ga('create', MetaData.generalSettings['GoogleAnalyticsId'],'auto');
                            ga('set', {
                               'appName': MetaData.database
                            });
                            ga('send', 'pageview');
                            ga('send', 'screenview', {screenName: 'loading'});
                        } else {
                            window.ga = function() {};
                        }

                        MetaData.mapTableCatalog = {};
                        $.each(MetaData.tableCatalog, function(idx, table) {
                            Initialise.parseTableSettings(table);
                            mapExtraTableSettings(table, customDataCatalog);
                            Initialise.augmentTableInfo(table);
                            MetaData.mapTableCatalog[table.id] = table;
                        });
                        Initialise.createLetterCodes();
                        MetaData.map2DTableCatalog = {};
                        $.each(MetaData.twoDTableCatalog, function(idx, table) {
                            Initialise.augment2DTableInfo(table);
                            MetaData.map2DTableCatalog[table.id] = table;
                        });
                        //parse graph info
                        $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                            tableInfo.trees = [];
                        });
                        $.each(getter.getTableRecords('graphs'), function(idx, graphInfo) {
                            if (graphInfo.tpe=='tree') {
                                MetaData.mapTableCatalog[graphInfo.tableid].trees.push({
                                    id: graphInfo.graphid,
                                    name: graphInfo.dispname,
                                    crossLink: graphInfo.crosslnk
                                });
                            }
                        });


                        GenePopup.init();
                        ItemPopup.init();
                        DataItemTablePopup.init();
                        DataItemPlotPopup.init();
                        FindGene.init();
                        PropInfoPopup.init();



                        // Initialise all the views in the application
                        Intro.init();

                        if (MetaData.generalSettings.hasGenomeBrowser) {
                            GenomeBrowser.init();
                        }

                        $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                            if (tableInfo.settings.ListView) {
                                ListViewer.init(tableInfo.id);
                                tableInfo.listViewId = 'list_' + tableInfo.id;
                            } else {
                                TableViewer.init(tableInfo.id);
                                tableInfo.tableViewId = 'table_'+tableInfo.id;
                            }
                        })

                        Application.showViewsAsTabs();

                        // Create a custom 'navigation button' that will appear in the right part of the app header
                        Application.addNavigationButton('Find','fa-search', 70, function(){
                            var actions = [];

                            var hasNotes = false;
                            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                                if (!tableInfo.settings.DisableNotes)
                                    hasNotes = true;
                            });
                            if (hasNotes) {
                                actions.push( { content:'Find note', icon:'fa-comment', handler:function() {
                                    FindNote.execute();
                                }
                                });
                            }

                            if (MetaData.generalSettings.hasGenomeBrowser) {
                                actions.push( { content:'Find gene', bitmap:'Bitmaps/GenomeBrowserSmall.png', handler:function() {
                                    FindGene.execute();
                                }
                                });
                                actions.push( { content:'Find genomic region', bitmap:'Bitmaps/GenomeBrowserSmall.png', handler:function() {
                                    FindGene.findRegion();
                                }
                                });
                            }

                            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                                var canPerformSearch = false;
                                $.each(MetaData.customProperties, function(idx, propInfo) {
                                    if (propInfo.tableid == tableInfo.id) {
                                        if ( (propInfo.settings.Search) && (propInfo.settings.Search != 'None') )
                                            canPerformSearch = true;
                                    }
                                });
                                if (canPerformSearch) {
                                    var content = '';
                                    content += 'Find '+tableInfo.tableNameSingle;
                                    actions.push( {
                                        content:content,
                                        icon: tableInfo.settings.Icon?tableInfo.settings.Icon:'fa-table',
                                        handler:function() {
                                        FindDataItem.execute(tableInfo.id);
                                    }
                                    });
                                }
                            });
                            var actionRows = [];
                            var rowCnt = 99;
                            $.each(actions, function(idx, action) {
                                if (rowCnt>=3) {
                                    actionRows.push([]);
                                    rowCnt = 0;
                                }
                                actionRows[actionRows.length-1].push(action);
                                rowCnt++;
                            });
                            ButtonChoiceBox.create('Find item','Please select what kind of element you want to search for:', actionRows);
                        });

                        // Create a custom 'navigation button' that will appear in the right part of the app header
                        Application.addNavigationButton('Get link','fa-link', 70, function(){
                            Serialise.createLink();
                        });


                        //Define the header content (visible in the top-left corner of the window)
                        var headerContent = '<div id="PanoptesAppHeader"><img class="PanoptesLogoBox" src="Bitmaps/PanoptesLogoSmall2.png" alt="Panoptes logo" align="top" style="border:0px;margin:3px"/><div style="display:inline-block"><div class="PnTitleBox">{datasetname}</div><div class="DQXThumbNailBox"></div></div></div>'.DQXformat({
                            datasetname: MetaData.generalSettings.NameBanner || MetaData.generalSettings.Name
                        });
                        Application.setHeaderHeight(48);
                        Application.setHeader(headerContent);


                        //Provide a hook to fetch some data upfront from the server. Upon completion, 'proceedFunction' should be called;
                        Application.customInitFunction = function(proceedFunction) {
                            var getter = DataFetchers.ServerDataGetter();//Instantiate the fetcher object

                            var appProceedFunction = function() {
                                proceedFunction();
                                Serialise.checkLoadView(Application.postLoadAction);
                            };

                            // Execute the fetching
                            getter.execute(
                                MetaData.serverUrl,
                                MetaData.database,
                                function() {
                                    PromptWorkspace.execute(appProceedFunction);
                                }
                            );
                        }

                        //Initialise the application
                        Application.init('Panoptes');

                        Application.getChannelInfo = function(proceedFunction) {
                            var getter = DataFetchers.ServerDataGetter();
                            getter.addTable('propertycatalog',['propid','datatype','tableid','source','name', 'settings'],'ordr',
                                SQL.WhereClause.OR([SQL.WhereClause.CompareFixed('workspaceid','=',MetaData.workspaceid),SQL.WhereClause.CompareFixed('workspaceid','=','')])
                            );
                            getter.addTable('2D_propertycatalog',['id','tableid', 'col_table', 'row_table', 'name', 'dtype', 'settings'],'ordr',
                                SQL.WhereClause.Trivial()
                            );
                            getter.addTable('summaryvalues',['propid','name','minval','maxval','minblocksize','tableid','settings'],'ordr',
                                SQL.WhereClause.AND([
                                    SQL.WhereClause.OR([SQL.WhereClause.CompareFixed('workspaceid','=',MetaData.workspaceid),SQL.WhereClause.CompareFixed('workspaceid','=','')]),
                                    SQL.WhereClause.CompareFixed('tableid','<>','')
                                ])
                            );
                            getter.addTable('tablebasedsummaryvalues',['tableid', 'trackid', 'trackname','minval','maxval','minblocksize','settings'],'ordr',
                                SQL.WhereClause.Trivial()
                            );
                            getter.addTable('relations',['childtableid', 'childpropid', 'parenttableid','parentpropid','forwardname','reversename'],'childtableid',
                                SQL.WhereClause.Trivial()
                            );

                            getter.addTable('externallinks',['linktype','linkname','linkurl'],'linkname');

                            getter.addTable('storedsubsets',['subsetid','name', 'tableid'], 'name', SQL.WhereClause.CompareFixed('workspaceid', '=', MetaData.workspaceid));

                            getter.execute(MetaData.serverUrl,MetaData.database,
                                function() { // Upon completion of data fetching
                                    MetaData.externalLinks = getter.getTableRecords('externallinks');
                                    MetaData.summaryValues = getter.getTableRecords('summaryvalues');
                                    MetaData.customProperties = getter.getTableRecords('propertycatalog');
                                    MetaData.twoDProperties = getter.getTableRecords('2D_propertycatalog');
                                    MetaData.tableBasedSummaryValues = getter.getTableRecords('tablebasedsummaryvalues');
                                    Initialise.parseSummaryValues();
                                    Initialise.parseCustomProperties();
                                    Initialise.parse2DProperties();
                                    Initialise.parseTableBasedSummaryValues();
                                    Initialise.parseRelations(getter.getTableRecords('relations'));
                                    Initialise.parseStoredSubsets(getter.getTableRecords('storedsubsets'));
                                    if (proceedFunction)
                                        Initialise.waitForCompletion(proceedFunction);
                                }
                            );
                        }


                    });
            } // End Start_Part2


            Application.postLoadAction = function() {
                $.each(Application.getViewList(), function(idx, view) {
                    view.viewIsLoaded = true;
                    if (view.postLoadAction)
                        view.postLoadAction();
                });
                $(".PanoptesLogoBox").click(PanoptesActions);
            }

            function PanoptesActions() {
                var actions = [];
                actions.push( { content:'Documentation', bitmap:'Bitmaps/Icons/Small/documentation.png', handler:function() {
                    window.open('http://panoptes.readthedocs.org/en/latest/');
                }
                });
                actions.push( { content:'Load new instance', bitmap:'Bitmaps/actionbuttons/reload.png', handler:function() {
                    window.open('index.html');
                }
                });
                if (MetaData.isManager) {
                    actions.push( { content:'Open admin page', bitmap:'Bitmaps/Icons/Small/tools.png', handler:function() {
                    window.open('admin.html');
                }
                });
                }

                ButtonChoiceBox.create('Panoptes','', [actions]);
            }

            Start_Part0();


        });
    });
