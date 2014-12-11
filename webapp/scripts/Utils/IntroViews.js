// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "DQX/HistoryManager",
    "Wizards/EditQuery", "MetaData", "Plots/GenericPlot", "InfoPopups/ItemPopup", "Wizards/FindGene", "Wizards/FindDataItem"
],
    function (
        require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, HistoryManager,
        EditQuery, MetaData, GenericPlot, ItemPopup, FindGene, FindDataItem
        ) {

        var IntroViews = {};


        IntroViews.setContainer = function(storedViewsContainerLeft, storedViewsContainerRight) {
            IntroViews.storedViewsContainerLeft = storedViewsContainerLeft;
            IntroViews.storedViewsContainerRight = storedViewsContainerRight;
        }

        IntroViews.loadIntroViews = function() {
            var getter = DataFetchers.ServerDataGetter();
            getter.addTable('introviews',['id','name','section', 'description', 'viewicon', 'url', 'storedviewid'], 'ordr',
                SQL.WhereClause.CompareFixed('workspaceid','=',MetaData.workspaceid)
            );
            getter.execute(MetaData.serverUrl,MetaData.database,
                function() { // Upon completion of data fetching
                    var controlsGroupLeft = Controls.CompoundVert([]).setMargin(0);
                    if (IntroViews.storedViewsContainerRight)
                        var controlsGroupRight = Controls.CompoundVert([]).setMargin(0);
                    var sectionMapper = {};
                    var predefSectionMapper = {};


                    var getSectionGroup = function(sectionName, sectionContent, inRightPanel) {
                        if (predefSectionMapper[sectionName])
                            return predefSectionMapper[sectionName].group;
                        if (sectionMapper[sectionName])
                            return sectionMapper[sectionName];
                        var sectionGroup = Controls.CompoundHor([]);
                        var sectionGroupWrapper = sectionGroup;
                        if (sectionContent) {
                            sectionGroupWrapper = Controls.CompoundVert([
                                Controls.Html(null,sectionContent),
                                Controls.VerticalSeparator(4),
                                sectionGroup
                            ]);
                        }
                        var controlsGroup = inRightPanel?controlsGroupRight:controlsGroupLeft;
                        if (sectionName) {
                            var sect = Controls.Section(Controls.Wrapper(sectionGroupWrapper, 'IntroViewSection'), { title: sectionName, headerStyleClass:'IntroButtonsSectionHeader', canCollapse:false })
                            controlsGroup.addControl(sect);
                        }
                        else
                            cntrolsGroup.addControl(sectionGroup);
                        sectionMapper[sectionName] = sectionGroup;
                        return sectionGroup;
                    };



                    if (MetaData.generalSettings.IntroSections) {
                        $.each(MetaData.generalSettings.IntroSections, function(idx, sectInfo) {
                            predefSectionMapper[sectInfo.Id] = sectInfo;
                            sectInfo.group = getSectionGroup(sectInfo.Name, sectInfo.Content, sectInfo.RightPanel);
                        });
                    }

                    var introviews = getter.getTableRecords('introviews');
                    $.each(introviews, function(idx, introview) {
                        if (!introview.description)
                            introview.description = '';
                        var viewbitmap = null;
                        var viewicon = introview.viewicon;
                        if (!viewicon)
                            viewicon = 'fa-angle-right';
                        if (viewicon.indexOf('fa-')!=0) {
                            viewbitmap = 'Bitmaps/CustomButtonBitmaps/' + viewicon+'.png';
                            viewicon = null;
                        }
                        var theButton = Controls.Button(null, { content: introview.name, buttonClass: 'PnButtonGrid', width:180, height:50, icon:viewicon, bitmap:viewbitmap });
                        content = theButton.renderHtml();
                        if (MetaData.isManager /*&& false*/) {
                            content += '<img class="IntroViewItemEdit" SRC="{bmp}"/>'.DQXformat({bmp:'Bitmaps/actionbuttons/edit.png'});
                            content += '<img class="IntroViewItemDelete" SRC="{bmp}"/>'.DQXformat({bmp:'Bitmaps/actionbuttons/delete.png'});
                        }
                        if (introview.description)
                            content += '<img class="IntroViewItemInfo" style="height:20px" SRC="{bmp}"/>'.DQXformat({bmp:'Bitmaps/actionbuttons/info3.png'});
                        var ctrl = Controls.Html(null, content, 'IntroViewItem');
                        getSectionGroup(introview.section).addControl(ctrl);
                        introview.divid = ctrl.getID();

                        introview.theButton = theButton;
                        theButton.setOnChanged(function() {
                            var handled = false;
                            if (introview.url=='plot') {
                                Msg.send({type:'LoadStoredPlot'}, introview.storedviewid);
                                handled = true;
                            }
                            if (introview.url=='dataitem') {
                                Msg.send({type:'LoadStoredDataItem'}, introview.storedviewid);
                                handled = true;
                            }
                            if (introview.url=='itemtable') {
                                Msg.send({type:'LoadStoredItemTable'}, introview.storedviewid);
                                handled = true;
                            }
                            if (introview.url=='view') {
                                Msg.send({type:'LoadStoredView'}, introview.storedviewid);
                                handled = true;
                            }
                            if (introview.url=='find:_gene_') {
                                FindGene.execute();
                                handled = true;
                            }
                            if (introview.url=='find:_genomicregion_') {
                                FindGene.findRegion();
                                handled = true;
                            }
                            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                                if (introview.url=='find:'+tableInfo.id) {
                                    handled = true;
                                    FindDataItem.execute(tableInfo.id)
                                }
                            });
                            if (!handled)
                                window.location.href = Base64.decode(introview.url);
                        });
                    });
                    IntroViews.storedViewsContainerLeft.modifyValue(controlsGroupLeft.renderHtml());
                    controlsGroupLeft.postCreateHtml();
                    if (IntroViews.storedViewsContainerRight) {
                        IntroViews.storedViewsContainerRight.modifyValue('<p></p>'+controlsGroupRight.renderHtml());
                        controlsGroupRight.postCreateHtml();
                    }

                    $.each(introviews, function(idx, introview) {
                        if (MetaData.isManager) {
                            $('#' + introview.divid).find('.IntroViewItemDelete').click(function(ev) {
                                ev.preventDefault();
                                ev.stopPropagation();
                                if (confirm('Are you sure you want to delete the stored view "'+introview.name+'"?')) {
                                    DQX.customRequest(MetaData.serverUrl,PnServerModule,'view_intro_del',
                                        {
                                            database: MetaData.database,
                                            id: introview.id
                                        },
                                        function(resp) {
                                            IntroViews.loadIntroViews();
                                        });
                                }
                            });
                            $('#' + introview.divid).find('.IntroViewItemEdit').click(function(ev) {
                                ev.preventDefault();
                                ev.stopPropagation();
                                IntroViews.editIntroView(introview);
                            });
                            $('#' + introview.divid).find('.IntroViewItemInfo').click(function(ev) {
                                ev.preventDefault();
                                ev.stopPropagation();
                                var content = '<div style="padding:10px;max-width:450px">';
                                content += '<p></p>';
                                content += '<b>'+introview.name+'</b>';
                                content += '<p></p>';
                                content += introview.description;
                                content += '<p></p>';
                                var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon:'fa-arrow-circle-right', content: 'Show', width:90, height:30});
                                bt.setOnChanged(function() {
                                    Popup.closeIfNeeded(popupid);
                                    introview.theButton.onChanged();
                                });
                                content += bt.renderHtml();
                                content += '</div>';
                                var popupid = Popup.create('', content);
                            });
                        }
                    });
                });
        }


        IntroViews.editIntroView = function(introview) {
            var str='';

            str += '<b>Name:</b><br>';
            var edt_name = Controls.Textarea('', { size:60, linecount:2, value: introview.name}).setHasDefaultFocus();
            str += edt_name.renderHtml();

            str += '<p><b>Section:</b><br>';
            var edt_section = Controls.Textarea('', { size:60, linecount:2, value: introview.section});
            str += edt_section.renderHtml();

            str += '<p><b>Description:</b><br>';
            var edt_descr = Controls.Textarea('', { size:60, linecount:4, value: introview.description});
            str += edt_descr.renderHtml();

            str += '<p><b>Icon:</b> (<a href="http://panoptes.readthedocs.org/en/latest/Misc/StartPageButtons.html" target="_blank">list</a>)<br>';
            var edt_icon = Controls.Textarea('', { size:60, linecount:1, value: introview.viewicon?introview.viewicon:''});
            str += edt_icon.renderHtml();

            var btOpen = Controls.Button(null, {  content: 'Update' }).setOnChanged(function() {
                if (!edt_name.getValue()) {
                    alert('No name provided');
                    return;
                }
                if (!edt_section.getValue()) {
                    alert('No section provided');
                    return;
                }
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'view_intro_updateinfo',
                    {
                        database: MetaData.database,
                        id:introview.id,
                        name: edt_name.getValue(),
                        section: edt_section.getValue(),
                        description: edt_descr.getValue(),
                        viewicon: edt_icon.getValue()
                    },
                    function(resp) {
                        Msg.send({ type: 'LoadIntroViews' }, {} );
                    });
                Popup.closeIfNeeded(popupid);
            });
            str += '<p>';
            str += btOpen.renderHtml();

            str += '&nbsp;&nbsp;&nbsp;';
            var btMoveBottom = Controls.Button(null, {  content: 'Move to bottom' }).setOnChanged(function() {
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'view_intro_move',
                    {
                        database: MetaData.database,
                        workspaceid:MetaData.workspaceid,
                        id:introview.id,
                        tpe:'down'
                    },
                    function(resp) {
                        Msg.send({ type: 'LoadIntroViews' }, {} );
                    });
            });
            str += btMoveBottom.renderHtml();


            str += '<p>';

            var popupid = Popup.create('Edit view',str);

        }


        IntroViews.createIntroView = function(encodedUrl, storeid, viewstate, title) {
            var str='';

            str += '<b>Name:</b><br>';
            var edt_name = Controls.Textarea('', { size:60, linecount:2, value: ''}).setHasDefaultFocus();
            str += edt_name.renderHtml();

            str += '<p><b>Section:</b><br>';
            var edt_section = Controls.Textarea('', { size:60, linecount:2, value: 'Predefined views'});
            str += edt_section.renderHtml();

            str += '<p><b>Description:</b><br>';
            var edt_descr = Controls.Textarea('', { size:60, linecount:4, value: ''});
            str += edt_descr.renderHtml();

            str += '<p><b>Icon:</b> (<a href="http://panoptes.readthedocs.org/en/latest/Misc/StartPageButtons.html" target="_blank">list</a>)<br>';
            var edt_icon = Controls.Textarea('', { size:60, linecount:1, value: ''});
            str += edt_icon.renderHtml();

            var btOpen = Controls.Button(null, {  content: 'Save to intro page' }).setOnChanged(function() {
                if (!edt_name.getValue()) {
                    alert('No name provided');
                    return;
                }
                if (!edt_section.getValue()) {
                    alert('No section provided');
                    return;
                }
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'view_intro_create',
                    {
                        database: MetaData.database,
                        workspaceid:MetaData.workspaceid,
                        name: edt_name.getValue(),
                        section: edt_section.getValue(),
                        description: edt_descr.getValue(),
                        viewicon: edt_icon.getValue(),
                        url: encodedUrl,
                        storeid: storeid,
                        viewstate: viewstate
                    },
                    function(resp) {
                        Msg.send({ type: 'LoadIntroViews' }, {} );
                    });
                Popup.closeIfNeeded(popupid);
            });
            str += '<p>';
            str += btOpen.renderHtml();
            str += '<p>';

            var popupid = Popup.create(title, str);
        };



        return IntroViews;
    });


