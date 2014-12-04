// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Msg", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/Popup", "DQX/DocEl", "DQX/Utils", "DQX/FrameTree", "DQX/FrameList", "DQX/DataFetcher/DataFetchers", "DQX/SQL", "MetaData", "Utils/IntroViews", "Wizards/FindGene", "InfoPopups/DocPopup"],
    function (require, Base64, Msg, Application, Framework, Controls, Msg, Popup, DocEl, DQX, FrameTree, FrameList, DataFetchers, SQL, MetaData, IntroViews, FindGene, DocPopup) {

        ////////////// Utilities for async server communication in case of lengthy operations



        var IntroModule = {

            init: function () {
                // Instantiate the view object
                var that = Application.View(
                    'start',        // View ID
                    'Start'    // View title
                );

                //This function is called during the initialisation. Create the frame structure of the view here
                that.createFrames = function(rootFrame) {
                    rootFrame.makeGroupHor();
                    rootFrame.setSeparatorSize(7);

                    var rightPanelFraction = parseFloat(MetaData.generalSettings.IntroRightPanelFrac || 0.35);
                    that.hasRightPanel = rightPanelFraction > 0;

                    //Figure out if we have some sections in the right panel
                    that.rightPanelHasSections = false;
                    if (MetaData.generalSettings.IntroSections) {
                        $.each(MetaData.generalSettings.IntroSections, function(idx, sectInfo) {
                            if (sectInfo.RightPanel)
                                that.rightPanelHasSections = true;
                        });
                    }
                    if (that.rightPanelHasSections && (!that.hasRightPanel))
                        DQX.reportError('Sections are defined in the right intro panel, but the panel is not defined');


                    this.frameIntroLeft = rootFrame.addMemberFrame(Framework.FrameFinal('', 1-rightPanelFraction));
                    this.frameIntroLeft.setMargins(0);
                    if (that.hasRightPanel) {
                        this.frameIntroRight = rootFrame.addMemberFrame(Framework.FrameFinal('', rightPanelFraction))/*.setFixedSize(Framework.dimX, 400)*/;
                        this.frameIntroRight.setMargins(0);
                    }
                    //this.frameCalculations = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.5)).setDisplayTitle("Server calculations");
                }

                // This function is called during the initialisation. Create the panels that will populate the frames here
                that.createPanels = function() {
                    if (that.hasRightPanel) {
                        this.panelIntroRight = Framework.Form(this.frameIntroRight);
                        this.panelIntroRight.setPadding(0);
                    }
                    this.panelIntroLeft = Framework.Form(this.frameIntroLeft);
                    this.panelIntroLeft.setPadding(0);

                    Msg.listen('', {type: 'LoadIntroViews'}, function() {
                        IntroViews.loadIntroViews();
                    });

                    that.storedViewsLeft = Controls.Html(null,'', '___');

                    this.panelIntroLeft.addControl(Controls.CompoundVert([
                        //Controls.Static('<small>Workspace ID: '+MetaData.workspaceid+'</small>')
                        Controls.Wrapper(
                            Controls.CompoundVert([
                                Controls.Static('<div style="font-weight:bold;font-size:17px;">'+MetaData.generalSettings.Name+'</div><p>'),
                                Controls.Static(MetaData.generalSettings.Description||'<i>No description</i>'),
                                //Controls.VerticalSeparator(20),
                                //Controls.CompoundVert(miscButtonList).setTreatAsBlock(),
                                //Controls.VerticalSeparator(5)
                            ]).setMargin(0)
                            ,'IntroPanelInfo'),
                        that.storedViewsLeft
                    ])).setMargin(0);

                    if ((!that.rightPanelHasSections) && (that.hasRightPanel))
                        that.createDefaultRightPanel();

                    if (that.rightPanelHasSections) {
                        that.storedViewsRight = Controls.Html(null,'', '___');
                        this.panelIntroRight.addControl(that.storedViewsRight);
                    }

                    IntroViews.setContainer(that.storedViewsLeft, that.storedViewsRight);
                    IntroViews.loadIntroViews();

                }

                that.createDefaultRightPanel = function() {
                    var miscButtonList = [];

                    var tableButtons = [];
                    tableButtons.push(Controls.VerticalSeparator(10));

                    if (MetaData.generalSettings.hasGenomeBrowser) {
                        var browserButton = Application.getView('genomebrowser').createActivationButton({
                            content: "Genome browser",
                            buttonClass: "DQXToolButton2",
                            bitmap: 'Bitmaps/GenomeBrowserSmall.png',
                            width:90
                        });

                        var findGeneButton = Controls.Button(null,
                            {
                                buttonClass: 'DQXToolButton2',
                                content: "Find gene...",
                                icon: 'fa-search',
                                width:100, height:35
                            });
                        findGeneButton.setOnChanged(function() {
                            FindGene.execute()
                        })

                        var descr = MetaData.generalSettings.GenomeBrowserDescr||'<i>No description</i>';

                        var grp = Controls.CompoundVert([
                            Controls.Static(descr),
                            Controls.CompoundHor([browserButton, findGeneButton])
//                            browserButton
                        ]);
                        tableButtons.push(Controls.Section(grp, {
                            title: "Genome browser",
                            headerStyleClass: 'IntroButtonsSectionHeader',
                            bodyStyleClass: 'ControlsSectionBodyIntro',
                            canCollapse: false
                        }));

                    }

                    $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                        if (!tableInfo.settings.IsHidden) {
                            if (tableInfo.settings.ListView) {
                                var tableViewerButton = Application.getView('list_' + tableInfo.id).createActivationButton({
                                    content: "Show list",
                                    icon: 'fa-list',
                                    width:85
                                });
                            } else {
                                var tableViewerButton = Application.getView('table_' + tableInfo.id).createActivationButton({
                                    content: "Show table",
                                    icon: 'fa-table',
                                    width:85
                                });
                            }

                            if (!tableInfo.settings.DisablePlots) {
                                var button_Showplots = Controls.Button(null, {content: 'Create plot...', buttonClass: 'DQXToolButton2', width:85, height:35, icon:'fa-bar-chart-o'}).setOnChanged(function() {
                                    Msg.send({type: 'CreateDataItemPlot'}, { query: null , tableid: tableInfo.id });
                                });
                            }
                            else {
                                var button_Showplots = Controls.HorizontalSeparator(100);
                            }

                            var descr = '';
                            descr += tableInfo.settings.Description||'<i>No description</i>';
                            var info = Controls.Static(descr);
                            var grp = Controls.CompoundVert([
                                info,
                                Controls.CompoundHor([
                                    Controls.Static(tableInfo.createIcon({floatLeft: false})),
                                    Controls.HorizontalSeparator(12),
                                    Controls.CompoundVert([
                                        Controls.VerticalSeparator(5),
                                        Controls.CompoundHor([
                                            tableViewerButton,
                                            button_Showplots
                                        ])
                                    ]).setTreatAsBlock().setMargin(0)
                                ]),
                                Controls.Static('')
                            ]);;
                            tableButtons.push(Controls.Section(grp, {
                                title: tableInfo.tableCapNamePlural,
                                headerStyleClass: 'IntroButtonsSectionHeader',
                                bodyStyleClass: 'ControlsSectionBodyIntro',
                                canCollapse: false
                            }));
                        }
                    })


                    this.panelIntroRight.addControl(Controls.CompoundVert([
                        Controls.CompoundVert(tableButtons)
                    ]));

                }

                that.onBecomeVisible = function() {
                    ga('send', 'screenview', {screenName: that._myID});
                }


                return that;
            }

        };

        return IntroModule;
    });