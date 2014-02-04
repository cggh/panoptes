define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame) {

        var ButtonChoiceBox = {};





        ButtonChoiceBox.create = function(title, header, buttonsMatrix) {
            var content = header + '<br>';

            $.each(buttonsMatrix, function(idx, buttonsRow) {
                if (idx>0)
                    content += '<br>';
                $.each(buttonsRow, function(idx, button) {
                    var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: button.content, bitmap:button.bitmap, width:140, height:50 }).setOnChanged(function() {
                        button.handler();
                        Popup.closeIfNeeded(popupid);
                    });
                    content += bt.renderHtml();
                });
            });

            var popupid = Popup.create(title, content);

        }



        ButtonChoiceBox.createPlotItemSelectionOptions = function(thePlot, tableInfo, title, header, newQuery, selectionListGenerator) {

            var choices = [];

            if (selectionListGenerator) {
                var choicesRow = [];

                choicesRow.push( { content:'Select<br>(REPLACE)', bitmap:'Bitmaps/venn2.png', handler:function() {
                    var lst = selectionListGenerator();
                    tableInfo.currentSelection = {};
                    $.each(lst, function(idx,id) {
                        tableInfo.selectItem(id, true);
                    });
                    Msg.broadcast({type:'SelectionUpdated'}, tableInfo.id);
                }
                });

                choicesRow.push( { content:'Select<br>(ADD)', bitmap:'Bitmaps/venn3.png', handler:function() {
                    var lst = selectionListGenerator();
                    $.each(lst, function(idx,id) {
                        tableInfo.selectItem(id, true);
                    });
                    Msg.broadcast({type:'SelectionUpdated'}, tableInfo.id);
                }
                });

                choicesRow.push( { content:'Select<br>(RESTRICT)', bitmap:'Bitmaps/venn1.png', handler:function() {
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

                choicesRow.push( { content:'Select<br>(EXCLUDE)', bitmap:'Bitmaps/venn4.png', handler:function() {
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


            if (newQuery) {
                var choicesRow = [];

                choicesRow.push( { content:'Restrict plot query', bitmap: DQX.BMP('filter1.png'), handler: function() {
                    thePlot.theQuery.modify(newQuery);
                }
                } );

                choicesRow.push( { content:'Show query in table', bitmap: 'Bitmaps/datagrid2.png', handler: function() {
                    Msg.send({type: 'DataItemTablePopup'}, {
                        tableid: tableInfo.id,
                        query: newQuery,
                        title: title
                    });
                }
                } );

                choices.push(choicesRow);
            }




            ButtonChoiceBox.create(title, header, choices);

        }



        return ButtonChoiceBox;
    });


