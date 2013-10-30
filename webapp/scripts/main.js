
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





require(["_", "jquery", "DQX/Application", "DQX/Framework", "DQX/Msg", "DQX/Utils", "DQX/SQL", "DQX/DataFetcher/DataFetchers", "MetaData", "Views/Intro", "Views/GenomeBrowser", "Views/TableViewer", "InfoPopups/GenePopup", "InfoPopups/ItemPopup", "Wizards/PromptWorkspace", "Wizards/PromptDataSet" ],
    function (_, $, Application, Framework, Msg, DQX, SQL, DataFetchers, MetaData, Intro, GenomeBrowser, TableViewer, GenePopup, ItemPopup, PromptWorkspace, PromptDataSet) {
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
                            table.hasGenomePositions = table.IsPositionOnGenome=='1';
                            table.currentQuery = SQL.WhereClause.Trivial();
                            table.currentSelection = {};
                            if (table.hasGenomePositions)
                                table.genomeBrowserInfo = {};

                            var settings = { GenomeMaxViewportSizeX:50000 };
                            if (table.settings)
                                settings = $.extend(settings,JSON.parse(table.settings));
                            table.settings = settings;

                            table.isItemSelected = function(id) { return table.currentSelection[id]; }
                            table.selectItem = function(id, newState) {
                                if (newState)
                                    table.currentSelection[id] = true;
                                else
                                    delete table.currentSelection[id];
                            }
                            MetaData.mapTableCatalog[table.id] = table;
                        });

                        GenePopup.init();
                        ItemPopup.init();

                        // Initialise all the views in the application
                        Intro.init();
                        GenomeBrowser.init();
                        $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                            TableViewer.init(tableInfo.id);
                            tableInfo.tableViewId = 'table_'+tableInfo.id;
                        })

                        // Create a custom 'navigation button' that will appear in the right part of the app header
                        Application.addNavigationButton('Test','Bitmaps/Icons/Small/MagGlassG.png', 80, function(){
                            alert('Navigation button clicked');
                        });


                        //Define the header content (visible in the top-left corner of the window)
                        Application.setHeader('<a href="http://www.malariagen.net" target="_blank"><img src="Bitmaps/malariagen_logo.png" alt="MalariaGEN logo" align="top" style="border:0px;margin:7px"/></a>');


                        //Provide a hook to fetch some data upfront from the server. Upon completion, 'proceedFunction' should be called;
                        Application.customInitFunction = function(proceedFunction) {
                            // Here, we will fetch the full data of a couple of tables on the servers proactively
                            var getter = DataFetchers.ServerDataGetter();//Instantiate the fetcher object
                            // Declare a first table for fetching
                            /*                getter.addTable(
                             'customtracks',
                             [
                             'id',
                             'name'
                             ],
                             'name'
                             );*/

                            // Execute the fetching
                            getter.execute(
                                MetaData.serverUrl,
                                MetaData.database,
                                function() {
                                    PromptWorkspace.execute(proceedFunction);
                                    //MetaData.tracks = getter.getTableRecords('customtracks');
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
                            getter.addTable('externallinks',['linktype','linkname','linkurl'],'linkname');
                            getter.execute(MetaData.serverUrl,MetaData.database,
                                function() { // Upon completion of data fetching
                                    MetaData.externalLinks = getter.getTableRecords('externallinks');
                                    MetaData.summaryValues = getter.getTableRecords('summaryvalues');
                                    $.each(MetaData.summaryValues, function(idx, summaryValue) {
                                        if (summaryValue.minval)
                                            summaryValue.minval = parseFloat(summaryValue.minval);
                                        else
                                            summaryValue.minval = 0;
                                        if (summaryValue.maxval)
                                            summaryValue.maxval = parseFloat(summaryValue.maxval);
                                        else
                                            summaryValue.maxval = 0;
                                        summaryValue.minblocksize = parseFloat(summaryValue.minblocksize);
                                        summaryValue.isCustom = true;
                                        var settings = { channelColor:'rgb(0,0,180)' };
                                        if (summaryValue.settings)
                                            settings = $.extend(settings,JSON.parse(summaryValue.settings));
                                        summaryValue.settings = settings;
                                    });
                                    MetaData.customProperties = getter.getTableRecords('propertycatalog');
                                    $.each(MetaData.customProperties, function(idx, prop) {
                                        prop.isCustom = (prop.source=='custom');
                                        if (prop.datatype=='Value')
                                            prop.isFloat = true;
                                        if (prop.datatype=='Boolean')
                                            prop.isBoolean = true;
                                        if (!prop.name) prop.name = prop.propid;
                                        var settings = { showInTable: true, showInBrowser: false, channelName: '', channelColor:'rgb(0,0,0)', connectLines: false };
                                        if (prop.isFloat) {
                                            settings.showInBrowser = true;
                                            settings.minval = 0;
                                            settings.maxval = 1;
                                            settings.decimDigits = 2;
                                        };
                                        if (prop.propid == MetaData.mapTableCatalog[prop.tableid].primkey)
                                            prop.isPrimKey = true;
                                        if (prop.settings)
                                            settings = $.extend(settings,JSON.parse(prop.settings));
                                        prop.settings = settings;
                                        prop.toDisplayString = function(vl) { return vl; }
                                        if (prop.isFloat)
                                            prop.toDisplayString = function(vl) { return parseFloat(vl).toFixed(prop.settings.decimDigits); }
                                        if (prop.isBoolean)
                                            prop.toDisplayString = function(vl) { return parseInt(vl)?'Yes':'No'; }
                                        prop.category2Color = DQX.PersistentAssociator(DQX.standardColors.length);
                                    });
                                    if (proceedFunction) proceedFunction();
                                }
                            );
                        }


                    });
            } // End Start_Part2


            Start_Part1();


        });
    });
