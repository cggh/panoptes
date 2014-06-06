// This file is part of Panoptes - © Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "DQX/HistoryManager",
    "Wizards/EditQuery", "MetaData", "Plots/GenericPlot", "InfoPopups/ItemPopup"
],
    function (
        require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, HistoryManager,
        EditQuery, MetaData, GenericPlot, ItemPopup
        ) {

        var IntroViews = {};


        IntroViews.setContainer = function(storedViewsContainer) {
            IntroViews.storedViewsContainer = storedViewsContainer;
        }

        IntroViews.loadIntroViews = function() {
            var getter = DataFetchers.ServerDataGetter();
            getter.addTable('introviews',['id','name','section', 'description', 'url'], 'ordr',
                SQL.WhereClause.CompareFixed('workspaceid','=',MetaData.workspaceid)
            );
            getter.execute(MetaData.serverUrl,MetaData.database,
                function() { // Upon completion of data fetching
                    var group = Controls.CompoundVert([]).setMargin(0);
                    var sectionMapper = {};

                    var getSectionGroup = function(sectionName) {
                        if (sectionMapper[sectionName])
                            return sectionMapper[sectionName];
                        var sectionGroup = Controls.CompoundVert([]).setMargin(0);
                        if (sectionName) {
                            var sect = Controls.Section(Controls.Wrapper(sectionGroup, 'IntroViewSection'), { title: sectionName/*, headerStyleClass:'GenomeBrowserMainSectionHeader'*/ })
                            group.addControl(sect);
                        }
                        else
                            group.addControl(sectionGroup);
                        sectionMapper[sectionName] = sectionGroup;
                        return sectionGroup;
                    };

                    var introviews = getter.getTableRecords('introviews');
                    $.each(introviews, function(idx, introview) {
                        if (!introview.description)
                            introview.description = '';
                        var content = '';
                        content += '<img class="IntroViewItemImage" SRC="{bmp}"/>'.DQXformat({bmp:'Bitmaps/actionbuttons/open.png'});
                        if (MetaData.isManager) {
                            content += '<img class="IntroViewItemEdit" SRC="{bmp}"/>'.DQXformat({bmp:'Bitmaps/actionbuttons/edit.png'});
                            content += '<img class="IntroViewItemDelete" SRC="{bmp}"/>'.DQXformat({bmp:'Bitmaps/actionbuttons/delete.png'});
                        }

                        content += '<div class="DQXLarge">'+introview.name+'</div>'+introview.description;
                        var ctrl = Controls.Html(null, content, 'IntroViewItem');
                        getSectionGroup(introview.section).addControl(ctrl);
                        introview.divid = ctrl.getID();
                    });
                    var st = group.renderHtml();
                    IntroViews.storedViewsContainer.modifyValue(st);
                    group.postCreateHtml();
                    $.each(introviews, function(idx, introview) {
                        $('#' + introview.divid).click(function() {
                            window.location.replace(Base64.decode(introview.url));
                        });
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
                        }
                    });
                });
        }


        IntroViews.editIntroView = function(introview) {
            var str='';

            str += '<b>Name:</b><br>';
            var edt_name = Controls.Textarea('', { size:60, linecount:1, value: introview.name}).setHasDefaultFocus();
            str += edt_name.renderHtml();

            str += '<p><b>Section:</b><br>';
            var edt_section = Controls.Textarea('', { size:60, linecount:1, value: introview.section});
            str += edt_section.renderHtml();

            str += '<p><b>Description:</b><br>';
            var edt_descr = Controls.Textarea('', { size:60, linecount:4, value: introview.description});
            str += edt_descr.renderHtml();

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
                        description: edt_descr.getValue()
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


        IntroViews.createIntroView = function(url, storeid, viewstate) {
            var str='';

            str += '<b>Name:</b><br>';
            var edt_name = Controls.Textarea('', { size:60, linecount:1, value: ''}).setHasDefaultFocus();
            str += edt_name.renderHtml();

            str += '<p><b>Section:</b><br>';
            var edt_section = Controls.Textarea('', { size:60, linecount:1, value: 'Predefined views'});
            str += edt_section.renderHtml();

            str += '<p><b>Description:</b><br>';
            var edt_descr = Controls.Textarea('', { size:60, linecount:4, value: ''});
            str += edt_descr.renderHtml();

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
                        url: Base64.encode(url),
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

            var popupid = Popup.create('Add view to start page',str);
        };



        return IntroViews;
    });


