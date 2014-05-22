
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
        easel: "Externals/createjs-2013.05.14.min",
        tween: "Externals/Tween",
        datastream: "DQX/Externals/DataStream"
    },
    shim: {
        d3: {
            exports: 'd3'
        },
        handlebars: {
            exports: 'Handlebars'
        },
        easel: {
          exports: 'createjs'
        },
        tween: {
          exports: 'TWEEN'
        },
        datastream: {
          exports: 'DataStream'
        }
    },
    waitSeconds: 15,
    urlArgs: "version="+versionString
});


require([
    "_", "jquery", "DQX/Application", "DQX/Framework", "DQX/Msg", "DQX/Utils", "DQX/SQL", "DQX/Popup", "DQX/PopupFrame", "DQX/DataFetcher/DataFetchers",
    "MetaData",
    "Utils/Initialise", "Views/Intro", "Views/GenomeBrowser", "Views/TableViewer", "Views/Genotypes/Genotypes",
    "InfoPopups/GenePopup", "InfoPopups/ItemPopup", "InfoPopups/DataItemTablePopup", "InfoPopups/DataItemPlotPopup",
    "Wizards/PromptWorkspace", "Wizards/PromptDataSet", "Wizards/FindGene", "Wizards/FindDataItem",
    "Utils/Serialise", "Utils/ButtonChoiceBox", "Plots/PlotStarter"
],
    function (
        _, $, Application, Framework, Msg, DQX, SQL, Popup, PopupFrame, DataFetchers,
        MetaData,
        Initialise, Intro, GenomeBrowser, TableViewer, Genotypes,
        GenePopup, ItemPopup, DataItemTablePopup, DataItemPlotPopup,
        PromptWorkspace, PromptDataSet, FindGene, FindDataItem,
        Serialise, ButtonChoiceBox, PlotStarter
        ) {
        $(function () {


            function Start_Part0() {
                PopupFrame.setHasThumbNails();
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'serverstatus', {}, function(resp) {
                    if ('issue' in resp) {
                        var issueText = resp.issue;
                        issueText = issueText.replace(/\n/g, "<br>");
                        var content = '<div style="margin:30px"><p><h2>Server configuration problem</h2><p>' + issueText + '</div>';
                        Popup.create('Fatal error', content, null, {canClose: false});
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
                    });

                var getter = DataFetchers.ServerDataGetter();
                getter.addTable('tablecatalog',['id','name','primkey', 'IsPositionOnGenome', 'settings'],'ordr');
                getter.addTable('customdatacatalog',['tableid','sourceid', 'settings'],'tableid');
                getter.addTable('2D_tablecatalog',['id','name','col_table', 'row_table', 'first_dimension', 'settings'],'ordr');
                getter.addTable('settings',['id','content'],'id');
                getter.execute(MetaData.serverUrl,MetaData.database,
                    function() { // Upon completion of data fetching
                        MetaData.tableCatalog = getter.getTableRecords('tablecatalog');
                        var customDataCatalog = getter.getTableRecords('customdatacatalog');
                        MetaData.twoDTableCatalog = getter.getTableRecords('2D_tablecatalog');
                        MetaData.generalSettings = {};
                        $.each(getter.getTableRecords('settings'), function(idx,sett) {
                            if (sett.content=='False')
                                sett.content = false;
                            MetaData.generalSettings[sett.id] = sett.content;
                        });
                        MetaData.mapTableCatalog = {};
                        $.each(MetaData.tableCatalog, function(idx, table) {
                            Initialise.parseTableSettings(table);
                            mapExtraTableSettings(table, customDataCatalog);
                            Initialise.augmentTableInfo(table);
                            MetaData.mapTableCatalog[table.id] = table;
                        });
                        MetaData.map2DTableCatalog = {};
                        $.each(MetaData.twoDTableCatalog, function(idx, table) {
                            Initialise.augment2DTableInfo(table);
                            MetaData.map2DTableCatalog[table.id] = table;
                        });

                        GenePopup.init();
                        ItemPopup.init();
                        DataItemTablePopup.init();
                        DataItemPlotPopup.init();
                        FindGene.init();



                        // Initialise all the views in the application
                        Intro.init();
                        $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                            TableViewer.init(tableInfo.id);
                            tableInfo.tableViewId = 'table_'+tableInfo.id;
                        })

                        if (MetaData.generalSettings.hasGenomeBrowser) {
                            GenomeBrowser.init();
                        }

                        if (MetaData.hasTable('SMP') && MetaData.hasTable('SNP'))
                          Genotypes.init();

                        Application.showViewsAsTabs();

                        // Create a custom 'navigation button' that will appear in the right part of the app header
                        Application.addNavigationButton('Find...','Bitmaps/Find.png', 80, function(){
                            var actions = [];

                            if (MetaData.generalSettings.hasGenomeBrowser) {
                                actions.push( { content:'Find gene...', bitmap:'Bitmaps/GenomeBrowser.png', handler:function() {
                                    FindGene.execute()
                                }
                                });
                            }

                            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                                actions.push( { content:'Find '+tableInfo.tableNameSingle+'...', bitmap:'Bitmaps/datagrid2.png', handler:function() {
                                    FindDataItem.execute(tableInfo.id);
                                }
                                });
                            });

                            ButtonChoiceBox.create('Find item','', [actions]);
                        });

                        // Create a custom 'navigation button' that will appear in the right part of the app header
                        Application.addNavigationButton('Get link...',DQX.BMP("Icons/Small/Link.png"), 80, function(){
                            Serialise.createLink();
                        });


                        //Define the header content (visible in the top-left corner of the window)
                        var headerContent = '<div id="PanoptesAppHeader"><img class="PanoptesLogoBox" src="Bitmaps/PanoptesLogoSmall2.png" alt="Panoptes logo" align="top" style="border:0px;margin:3px"/><div style="display:inline-block"><div class="PnTitleBox">{datasetname}</div><div class="DQXThumbNailBox"></div></div></div>'.DQXformat({
                            datasetname: MetaData.generalSettings.Name
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
                            getter.execute(MetaData.serverUrl,MetaData.database,
                                function() { // Upon completion of data fetching
                                    MetaData.externalLinks = getter.getTableRecords('externallinks');
                                    MetaData.summaryValues = getter.getTableRecords('summaryvalues');
                                    MetaData.customProperties = getter.getTableRecords('propertycatalog');
                                    MetaData.twoDProperties = getter.getTableRecords('2D_propertycatalog');
                                    MetaData.map2DProperties = DQX.attrMap(MetaData.twoDProperties, 'id');
                                    MetaData.tableBasedSummaryValues = getter.getTableRecords('tablebasedsummaryvalues');
                                    Initialise.parseSummaryValues();
                                    Initialise.parseCustomProperties();
                                    Initialise.parse2DProperties();
                                    Initialise.parseTableBasedSummaryValues();
                                    Initialise.parseRelations(getter.getTableRecords('relations'));
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
                    window.open('main.html');
                }
                });
                actions.push( { content:'Open admin page', bitmap:'Bitmaps/Icons/Small/tools.png', handler:function() {
//                    var hostname=window.location.hostname;
//                    var pathname=window.location.pathname;
//                    var protocol=window.location.protocol;
//                    var url='{protocol}//{hostname}{pathname}'.DQXformat({
//                        protocol:protocol,
//                        hostname:hostname,
//                        pathname:pathname
//                    });
                    window.open('admin.html');
                }
                });

                ButtonChoiceBox.create('Panoptes','', [actions]);
            }

            Start_Part0();


        });
    });
