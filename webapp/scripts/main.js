
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
        _:"DQX/Externals/lodash"
    },
    shim: {
        d3: {
            exports: 'd3'
        },
        handlebars: {
            exports: 'Handlebars'
        }
    },
    waitSeconds: 15,
    urlArgs: "version="+versionString
});





require(["_", "jquery", "DQX/Application", "DQX/Framework", "DQX/Msg", "DQX/Utils", "DQX/SQL", "DQX/DataFetcher/DataFetchers", "MetaData", "Utils/Initialise", "Views/Intro", "Views/GenomeBrowser", "Views/TableViewer", "Views/Genotypes", "InfoPopups/GenePopup", "InfoPopups/ItemPopup", "Wizards/PromptWorkspace", "Wizards/PromptDataSet", "Utils/Serialise" ],
    function (_, $, Application, Framework, Msg, DQX, SQL, DataFetchers, MetaData, Initialise, Intro, GenomeBrowser, TableViewer, Genotypes, GenePopup, ItemPopup, PromptWorkspace, PromptDataSet, Serialise) {
        $(function () {



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


            function Start_Part2() {

                var getter = DataFetchers.ServerDataGetter();
                getter.addTable('tablecatalog',['id','name','primkey', 'IsPositionOnGenome', 'settings'],'id');
                getter.addTable('settings',['id','content'],'id');
                getter.execute(MetaData.serverUrl,MetaData.database,
                    function() { // Upon completion of data fetching
                        MetaData.tableCatalog = getter.getTableRecords('tablecatalog');
                        MetaData.generalSettings = {};
                        $.each(getter.getTableRecords('settings'), function(idx,sett) {
                            MetaData.generalSettings[sett.id] = sett.content;
                        });
                        MetaData.mapTableCatalog = {};
                        $.each(MetaData.tableCatalog, function(idx, table) {
                            Initialise.augmentTableInfo(table);
                            MetaData.mapTableCatalog[table.id] = table;
                        });

                        GenePopup.init();
                        ItemPopup.init();

                        // Initialise all the views in the application
                        Intro.init();
                        $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                            TableViewer.init(tableInfo.id);
                            tableInfo.tableViewId = 'table_'+tableInfo.id;
                        })
                        GenomeBrowser.init();

                        Genotypes.init();

                        Application.showViewsAsTabs();

                        // Create a custom 'navigation button' that will appear in the right part of the app header
                        Application.addNavigationButton('Test','Bitmaps/Icons/Small/MagGlassG.png', 80, function(){
                            alert('Navigation button clicked');
                        });

                        // Create a custom 'navigation button' that will appear in the right part of the app header
                        Application.addNavigationButton('Get link',DQX.BMP("/Icons/Small/Link.png"), 80, function(){
                            Serialise.createLink();
                        });


                        //Define the header content (visible in the top-left corner of the window)
                        Application.setHeader('<a href="http://www.malariagen.net" target="_blank"><img src="Bitmaps/malariagen_logo.png" alt="MalariaGEN logo" align="top" style="border:0px;margin:7px"/></a>');


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
                            getter.addTable('summaryvalues',['propid','name','minval','maxval','minblocksize','tableid','settings'],'ordr',
                                SQL.WhereClause.OR([SQL.WhereClause.CompareFixed('workspaceid','=',MetaData.workspaceid),SQL.WhereClause.CompareFixed('workspaceid','=','')])
                            );
                            getter.addTable('tablebasedsummaryvalues',['tableid', 'trackid', 'trackname','minval','maxval','minblocksize','settings'],'trackid',
                                SQL.WhereClause.Trivial()
                            );

                            getter.addTable('externallinks',['linktype','linkname','linkurl'],'linkname');
                            getter.execute(MetaData.serverUrl,MetaData.database,
                                function() { // Upon completion of data fetching
                                    MetaData.externalLinks = getter.getTableRecords('externallinks');
                                    MetaData.summaryValues = getter.getTableRecords('summaryvalues');
                                    MetaData.customProperties = getter.getTableRecords('propertycatalog');
                                    MetaData.tableBasedSummaryValues = getter.getTableRecords('tablebasedsummaryvalues');
                                    Initialise.parseSummaryValues();
                                    Initialise.parseCustomProperties();
                                    Initialise.parseTableBasedSummaryValues();
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
            }

            Start_Part1();


        });
    });
