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
    "Utils/Serialise", "Utils/ButtonChoiceBox", "Plots/PlotStarter", "DQX/DocEl", "DQX/HistoryManager"
],
    function (
        _, $, Application, Framework, Msg, DQX, Controls, SQL, Popup, PopupFrame, DataFetchers,
        MetaData,
        Initialise, Intro, GenomeBrowser, TableViewer, ListViewer,
        GenePopup, ItemPopup, DataItemTablePopup, DataItemPlotPopup, PropInfoPopup,
        PromptWorkspace, PromptDataSet, FindGene, FindDataItem, FindNote,
        Serialise, ButtonChoiceBox, PlotStarter, DocEl, HistoryManager
        ) {
        $(function () {

            //Override for panoptes style
            Application._createNavigationButton = function (id, parentDiv, bitmap, content, styleClass, width, handlerFunction) {
                if (bitmap.indexOf('fa-') === 0)
                    var bt = Controls.Button(id, { icon: bitmap, content: content, buttonClass: styleClass, width: width, height: 22 });
                else
                    var bt = Controls.Button(id, { bitmap: bitmap, content: content, buttonClass: styleClass, width: width, height: 22 });
                bt.setOnChanged(handlerFunction);
                parentDiv.addElem(bt.renderHtml());
            };

            Application._createNavigationSection = function () {
                var navSectionDiv = DocEl.Div();
                navSectionDiv.addStyle("position", "absolute");
                navSectionDiv.addStyle("right", "0px");
                navSectionDiv.addStyle("top", "0px");
                navSectionDiv.addStyle("padding-top", "0px");
                navSectionDiv.addStyle("padding-right", "0px");
                //this._createNavigationButton("HeaderPrevious", navSectionDiv, DQX.BMP("/Icons/Small/Back.png"), "Previous<br>view", "DQXToolButton3", 100, function () { Msg.send({ type: 'Back' }) });
                //this._createNavigationButton("HeaderHome", navSectionDiv, 'fa-home', "Start", "DQXToolButton3", 70, function () { Msg.send({ type: 'Home' }) });
                this._createNavigationButton("HeaderHelp", navSectionDiv, 'fa-question-circle', "", "PnTopLevelNav", 22, function () { Msg.send({ type: 'Home' }) });

                // Create custom navigation buttons
                $.each(Application._customNavigationButtons, function(idx, buttonInfo) {
                    Application._createNavigationButton("", navSectionDiv, buttonInfo.bitmap, buttonInfo.name, "PnTopLevelNav", 22/*buttonInfo.width*/, buttonInfo.handler);
                });

                $('#Div1').append(navSectionDiv.toString());
                DQX.ExecPostCreateHtml();

                Msg.listen('', { type: 'Home' }, function () {
                    PopupFrame.minimiseAll();
                    HistoryManager.setState(Application._views[0].getStateKeys());
                });
                Msg.listen('', { type: 'Back' }, function () {
                    HistoryManager.back();
                });

            };
            Framework.FrameGroupTab = function (iid, isizeweight) {
                return Framework.Frame(iid, 'Tab', isizeweight).setFrameClassClient('DQXForm').setMarginsIndividual(0,0,0,0);
            };

            $(document).ajaxStart(
              function () {
                  d3.select('.PanoptesLogoBox')
                    .transition()
                    .duration(1000)
                    .attr('style', 'opacity: 1')
              }
            );

            $(document).ajaxStop(
              function () {
                  d3.select('.PanoptesLogoBox')
                    .transition()
                    .duration(1000)
                    .attr('style', 'opacity: 0')
              }
            );

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
                        Application.addNavigationButton('','fa-search', 35, function(){
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
                        Application.addNavigationButton('','fa-link', 35, function(){
                            Serialise.createLink();
                        });


                        //Define the header content (visible in the top-left corner of the window)
                        var headerContent = '<div id="PanoptesAppHeader">' +
                          ('<div class="PanoptesLogoPlaceholder"></div>' +
                            '<img class="PanoptesLogoBox" src="Bitmaps/PanoptesLogoSmall2.png" alt="Panoptes logo" align="top"/>' +
                          '<div style="display:inline-block"><div class="PnTitleBox">{datasetname}</div>' +
                          '' +
                          '<div class="DQXThumbNailBox"></div></div>' +
                          '<img class="OrgLogoBox" src=\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 367.76001 70.879997" height="40" width="200" xml:space="preserve" version="1.1"><g transform="matrix(1.3333333,0,0,-1.3333333,0,70.88)" id="g10">    <g transform="scale(0.1)">        <path style="fill:#292c78;" d="M 2.65625,523.289 H 156.016 L 205.996,317.5 h 0.977 l 49.98,205.789 H 410.312 V 173.457 H 308.398 v 224.402 h -0.976 L 246.672,173.457 H 166.301 L 105.547,397.859 H 104.57 V 173.457 H 2.65625 v 349.832"/>        <path style="fill:#292c78;" d="m 599.473,287.605 c -11.746,-5.867 -24.981,-9.304 -38.211,-12.234 -21.555,-4.91 -32.824,-10.305 -32.824,-27.441 0,-11.758 12.734,-23.528 30.378,-23.528 22.051,0 39.192,13.235 40.657,39.692 z m 93.105,-57.312 c 0,-19.109 0.969,-40.684 11.758,-56.836 h -98.977 c -2.449,6.848 -3.921,17.148 -3.433,24.004 h -0.969 C 580.371,173.945 550.48,167.07 519.121,167.07 c -48.992,0 -89.656,23.535 -89.656,76.934 0,80.351 94.07,77.422 143.555,86.719 13.23,2.461 26.453,6.379 26.453,22.547 0,17.152 -16.161,23.527 -31.836,23.527 -29.895,0 -35.782,-15.195 -36.27,-25.977 h -90.156 c 2.949,71.543 70.559,83.301 130.82,83.301 121.516,0 120.547,-50.48 120.547,-99.473 V 230.293"/>        <path style="fill:#292c78;" d="m 726.406,173.457 h 97.0117 V 523.289 H 726.406 Z"/>        <path style="fill:#292c78;" d="m 1014.02,287.605 c -11.75,-5.867 -24.977,-9.304 -38.208,-12.234 -21.554,-4.91 -32.824,-10.305 -32.824,-27.441 0,-11.758 12.735,-23.528 30.379,-23.528 22.055,0 39.193,13.235 40.653,39.692 z m 93.11,-57.312 c 0,-19.109 0.97,-40.684 11.76,-56.836 h -98.98 c -2.45,6.848 -3.92,17.148 -3.44,24.004 h -0.96 c -20.588,-23.516 -50.483,-30.391 -81.838,-30.391 -48.992,0 -89.656,23.535 -89.656,76.934 0,80.351 94.07,77.422 143.55,86.719 13.234,2.461 26.454,6.379 26.454,22.547 0,17.152 -16.161,23.527 -31.84,23.527 -29.883,0 -35.774,-15.195 -36.262,-25.977 h -90.156 c 2.949,71.543 70.554,83.301 130.82,83.301 121.518,0 120.548,-50.48 120.548,-99.473 V 230.293"/>        <path style="fill:#292c78;" d="m 1136.24,427.742 h 93.1 v -40.664 h 0.97 c 15.69,30.371 36.27,47.043 71.55,47.043 9.79,0 19.1,-1.476 28.41,-3.926 v -85.742 c -9.79,3.43 -18.62,6.367 -38.21,6.367 -38.22,0 -58.8,-22.539 -58.8,-76.925 V 173.457 h -97.02 v 254.285"/>        <path style="fill:#292c78;" d="m 1338.93,427.742 h 97.02 V 173.457 h -97.02 z m 97.02,27.453 h -97.02 v 68.094 h 97.02 v -68.094"/>        <path style="fill:#292c78;" d="m 1626.55,287.605 c -11.76,-5.867 -25,-9.304 -38.22,-12.234 -21.56,-4.91 -32.83,-10.305 -32.83,-27.441 0,-11.758 12.74,-23.528 30.39,-23.528 22.05,0 39.2,13.235 40.66,39.692 z m 93.1,-57.312 c 0,-19.109 0.98,-40.684 11.76,-56.836 h -98.98 c -2.45,6.848 -3.91,17.148 -3.44,24.004 h -0.96 c -20.6,-23.516 -50.48,-30.391 -81.84,-30.391 -48.99,0 -89.66,23.535 -89.66,76.934 0,80.351 94.07,77.422 143.56,86.719 13.23,2.461 26.46,6.379 26.46,22.547 0,17.152 -16.18,23.527 -31.84,23.527 -29.91,0 -35.78,-15.195 -36.26,-25.977 h -90.16 c 2.94,71.543 70.55,83.301 130.82,83.301 121.52,0 120.54,-50.48 120.54,-99.473 V 230.293"/>        <path style="fill:#f78f11;" d="m 2009.25,209.219 c -24.01,-30.879 -61.25,-44.09 -99.46,-44.09 -103.39,0 -167.08,80.348 -167.08,179.812 0,133.282 93.58,186.68 172.47,186.68 89.18,0 145.52,-48.508 161.2,-130.82 H 1973 c -3.93,25.476 -25.49,43.601 -50.97,43.601 -73.98,0 -71.53,-77.91 -71.53,-101.914 0,-32.832 13.23,-90.152 78.88,-90.152 25,0 50.47,12.73 55.86,38.711 h -47.53 v 74.961 h 143.08 V 173.457 h -68.11 l -3.43,35.762"/>        <path style="fill:#f78f11;" d="m 2114.63,523.289 h 289.58 v -89.664 h -181.8 V 390.02 h 165.14 v -83.293 h -165.14 v -43.614 h 187.19 v -89.656 h -294.97 v 349.832"/>        <path style="fill:#f78f11;" d="m 2440.5,523.289 h 110.23 l 101.93,-187.168 h 0.96 v 187.168 h 101.93 V 173.457 h -104.86 l -107.3,191.086 h -1 V 173.457 H 2440.5 v 349.832"/>            </g></g></svg>\' alt="MalariaGEN"/>' +
                          '</div>').DQXformat({
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
                var query = window.location.search.substring(1);
                var vars = query.split('&');
                for (var i = 0; i < vars.length; i++) {
                    var pair = vars[i].split('=');
                    if (decodeURIComponent(pair[0]) == 'genome_region') {
                        var str = decodeURIComponent(pair[1]);
                        var chrom = str.split(':')[0];
                        if (!_.contains(_.pluck(MetaData.chromosomes,'id'), chrom))
                            DQX.reportError("Unknown chrom in URL");
                        var pos = str.split(':')[1];
                        if (pos) {
                            var start = pos.split('-')[0];
                            var stop = pos.split('-')[1];
                            if (start && stop) {
                                Msg.send({type: 'FindGenomeRegion'}, {
                                    chromosome: chrom,
                                    start: parseInt(start),
                                    end: parseInt(stop),
                                    buttonShowRegion: true
                                });
                            }
                        }
                    }
                }
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
