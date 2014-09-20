// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable,
              Wizard, Popup, PopupFrame,
              MetaData, GetFullDataItemInfo, MiscUtils
        ) {

        var ButtonChoiceBox = {};





        ButtonChoiceBox.create = function(title, header, buttonsMatrix) {
            var content = '<p>' + header + '<p>';

            $.each(buttonsMatrix, function(idx, buttonsRow) {
                if (idx>0)
                    content += '<br>';
                $.each(buttonsRow, function(idx, button) {
                    var bt = Controls.Button(null, {
                        buttonClass: 'DQXToolButton2',
                        content: button.content,
                        bitmap:button.bitmap,
                        bitmapHeight:button.bitmapHeight,
                        icon:button.icon,
                        width:140,
                        height:50
                    }).setOnChanged(function() {
                        Popup.closeIfNeeded(popupid);
                        button.handler();
                    });
                    content += bt.renderHtml();
                });
            });

            var popupid = Popup.create(title, content);

        }



        ButtonChoiceBox.createPlotItemSelectionOptions = function(thePlot, tableInfo, title, header, newQueryInfo, selectionListGenerator) {

            var choices = [];

            if (selectionListGenerator) {
                var choicesRow = [];

                choicesRow.push( { content:'Select<br>(REPLACE)', bitmap:'Bitmaps/venn2.png', bitmapHeight:15, handler:function() {
                    var lst = selectionListGenerator();
                    tableInfo.currentSelection = {};
                    $.each(lst, function(idx,id) {
                        tableInfo.selectItem(id, true);
                    });
                    Msg.broadcast({type:'SelectionUpdated'}, tableInfo.id);
                }
                });

                choicesRow.push( { content:'Select<br>(ADD)', bitmap:'Bitmaps/venn3.png', bitmapHeight:15, handler:function() {
                    var lst = selectionListGenerator();
                    $.each(lst, function(idx,id) {
                        tableInfo.selectItem(id, true);
                    });
                    Msg.broadcast({type:'SelectionUpdated'}, tableInfo.id);
                }
                });

                choicesRow.push( { content:'Select<br>(RESTRICT)', bitmap:'Bitmaps/venn1.png', bitmapHeight:15, handler:function() {
                    var curSelList = tableInfo.getSelectedList();
                    var newSelList = selectionListGenerator();
                    var newSelMap = {};
                    $.each(newSelList, function(idx,id) {
                        newSelMap[id] = true;
                    });
                    $.each(curSelList, function(idx,id) {
                        if (!newSelMap[id])
                            tableInfo.selectItem(id, false);
                    });
                    Msg.broadcast({type:'SelectionUpdated'}, tableInfo.id);
                }
                });

                choicesRow.push( { content:'Select<br>(EXCLUDE)', bitmap:'Bitmaps/venn4.png', bitmapHeight:15, handler:function() {
                    var curSelList = tableInfo.getSelectedList();
                    var newSelList = selectionListGenerator();
                    var newSelMap = {};
                    $.each(newSelList, function(idx,id) {
                        newSelMap[id] = true;
                    });
                    $.each(curSelList, function(idx,id) {
                        if (newSelMap[id])
                            tableInfo.selectItem(id, false);
                    });
                    Msg.broadcast({type:'SelectionUpdated'}, tableInfo.id);
                }
                });

                choices.push(choicesRow);
            }


            if (newQueryInfo) {
                var choicesRow = [];
                choicesRow.push( { content:'Show items in query', icon: 'fa-table', handler: function() {
                    Msg.send({type: 'DataItemTablePopup'}, {
                        tableid: tableInfo.id,
                        query: newQueryInfo.query,
                        subSamplingOptions: newQueryInfo.subSamplingOptions,
                        title: title + ' (' + tableInfo.tableCapNamePlural+ ')'
                    });
                }
                } );
                choicesRow.push( { content:'Restrict plot query', icon: 'fa-filter', handler: function() {
                    thePlot.theQuery.modify(newQueryInfo.query);
                }
                } );
                choices.push(choicesRow);
            }

            ButtonChoiceBox.create(title, header, choices);
        }



        ButtonChoiceBox.createQuerySelectionOptions = function(tableInfo, theQueryObject) {

            var choices = [];

            var choicesRow = [];

            choicesRow.push( { content:'REPLACE', bitmap:'Bitmaps/venn2.png', bitmapHeight:15, handler:function() {
                MiscUtils.selectQuery(tableInfo, theQueryObject, 'replace');
            }
            });

            choicesRow.push( { content:'ADD', bitmap:'Bitmaps/venn3.png', bitmapHeight:15, handler:function() {
                MiscUtils.selectQuery(tableInfo, theQueryObject, 'add');
            }
            });

            choicesRow.push( { content:'RESTRICT', bitmap:'Bitmaps/venn1.png', bitmapHeight:15, handler:function() {
                MiscUtils.selectQuery(tableInfo, theQueryObject, 'restrict');
            }
            });

            choicesRow.push( { content:'EXCLUDE', bitmap:'Bitmaps/venn4.png', bitmapHeight:15, handler:function() {
                MiscUtils.selectQuery(tableInfo, theQueryObject, 'exclude');
            }
            });

            choices.push(choicesRow);

            var txt = tableInfo.tableViewer.getQueryDescription(theQueryObject.get());
            txt += '<p>Select the {names} in this query:<br>'.DQXformat({names:tableInfo.tableNamePlural});

            ButtonChoiceBox.create('Select '+tableInfo.tableNamePlural, txt, choices);
        }



        return ButtonChoiceBox;
    });


