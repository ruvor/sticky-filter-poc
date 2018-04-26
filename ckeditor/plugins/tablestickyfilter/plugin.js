CKEDITOR.plugins.add('tablestickyfilter', {
    requires: 'tabletools,dialog,contextmenu',
    init: function (editor) {
        var scriptElement = document.createElement("script");
        scriptElement.src = this.path + "sticky-filter.js";
        document.querySelector("head").appendChild(scriptElement);

        /** Возвращает краевые ячейки (нативные объекты HTMLElement), соответствующие столбцам текущего выделения. */
        function getSelectionEdgeCells() {
            //рассматриваются выделенные ячейки только одной строки, потому что весьма сомнительно,
            //что кому-то понадобится включать фильтры для столбцов ячеек, выделенных в нескольких
            //строках, а код при таком предположении значительно упрощается, кроме того, сам фильтр
            //по условиям задачи располагается на одной строке; в ситуации, когда выбраны ячейки сразу
            //нескольких строк, принимается, что была выбрана одна ячейка (начальная ячейка диапазона)
            var selection = editor.getSelection();
            var range = selection.getRanges()[0];
            var startCell = range.startContainer.getAscendant({th: 1, td: 1}, true);
            var startCellRow = startCell.getParent();
            var endCell = range.endContainer.getAscendant({th: 1, td: 1}, true);
            var endCellRow = endCell.getParent();
            if (!startCellRow.equals(endCellRow)) {
                //выбраны несколько строк
                endCell = startCell;
            }
            var startCellNode, endCellNode; //переменные для нативных объектов ячеек
            var table = startCellRow.getAscendant({table: 1}, true);
            var filterRow = StickyFilter.getFilterRow(table.$);
            if (filterRow && filterRow !== startCellRow.$) {
                //в таблице уже есть фильтровальные ячейки, и они располагаются не в текущей строке,
                //в этом случае находятся ячейки, соответствующие выбранным, в строке с фильтрами
                startCellNode = StickyFilter.findCounterpart(filterRow, startCell.$);
                endCellNode = StickyFilter.findCounterpart(filterRow, endCell.$);
            }
            else {
                //в таблице ещё нет фильтровальных ячеек или они располагаются в текущей строке
                startCellNode = startCell.$;
                endCellNode = endCell.$;
            }
            return {
                startCell: startCellNode,
                endCell: endCellNode
            };
        }

        /** Возвращает краевые строки (нативные объекты HTMLElement), соответствующие текущему выделению. */
        function getSelectionEdgeRows() {
            var selection = editor.getSelection();
            var range = selection.getRanges()[0];
            var startRow = range.startContainer.getAscendant("tr", true);
            var endRow = range.endContainer.getAscendant("tr", true);
            var endRowCells = endRow.$.cells;
            var maxRowSpan = 1;
            for (var i = 0; i < endRowCells.length; i++) {
                var cell = endRowCells[i];
                if (cell.rowSpan > maxRowSpan) maxRowSpan = cell.rowSpan;
            }
            return {
                startRow: startRow.$,
                endRow: endRow.getAscendant("table").$.rows[endRow.$.rowIndex + maxRowSpan - 1]
            };
        }

        // команды
            editor.addCommand('enableFilter', {
                exec: function (editor) {
                    var edgeCells = getSelectionEdgeCells();
                    StickyFilter.enableFilterForCol(edgeCells.startCell);
                }
            });
            editor.addCommand('enableFilters', {
                exec: function (editor) {
                    var edgeCells = getSelectionEdgeCells();
                    StickyFilter.enableFiltersForCols(edgeCells.startCell, edgeCells.endCell);
                }
            });
            editor.addCommand('disableFilter', {
                exec: function (editor) {
                    var edgeCells = getSelectionEdgeCells();
                    StickyFilter.disableFilterForCol(edgeCells.startCell);
                }
            });
            editor.addCommand('disableFilters', {
                exec: function (editor) {
                    var edgeCells = getSelectionEdgeCells();
                    StickyFilter.disableFiltersForCols(edgeCells.startCell, edgeCells.endCell);
                }
            });
            editor.addCommand('stickRow', {
                exec: function (editor) {
                    var edgeRows = getSelectionEdgeRows();
                    StickyFilter.stickRow(edgeRows.startRow);
                }
            });
            editor.addCommand('stickRows', {
                exec: function (editor) {
                    var edgeRows = getSelectionEdgeRows();
                    StickyFilter.stickRows(edgeRows.startRow, edgeRows.endRow);
                }
            });
            editor.addCommand('unstickRow', {
                exec: function (editor) {
                    var edgeRows = getSelectionEdgeRows();
                    StickyFilter.unstickRow(edgeRows.startRow);
                }
            });
            editor.addCommand('unstickRows', {
                exec: function (editor) {
                    var edgeRows = getSelectionEdgeRows();
                    StickyFilter.unstickRows(edgeRows.startRow, edgeRows.endRow);
                }
            });
        // /команды

        if (editor.contextMenu) {
            // пункты меню
                editor.addMenuItem('enableFilter', {
                    label: 'Включить фильтр',
                    command: 'enableFilter',
                    group: 'tablecolumn'
                });
                editor.addMenuItem('enableFilters', {
                    label: 'Включить фильтры',
                    command: 'enableFilters',
                    group: 'tablecolumn'
                });
                editor.addMenuItem('disableFilter', {
                    label: 'Выключить фильтр',
                    command: 'disableFilter',
                    group: 'tablecolumn'
                });
                editor.addMenuItem('disableFilters', {
                    label: 'Выключить фильтры',
                    command: 'disableFilters',
                    group: 'tablecolumn'
                });
                editor.addMenuItem('stickRow', {
                    label: 'Закрепить строку',
                    command: 'stickRow',
                    group: 'tablerow'
                });
                editor.addMenuItem('stickRows', {
                    label: 'Закрепить строки',
                    command: 'stickRows',
                    group: 'tablerow'
                });
                editor.addMenuItem('unstickRow', {
                    label: 'Открепить строку',
                    command: 'unstickRow',
                    group: 'tablerow'
                });
                editor.addMenuItem('unstickRows', {
                    label: 'Открепить строки',
                    command: 'unstickRows',
                    group: 'tablerow'
                });
            // /пункты меню

            /** Объект, обеспечивающий внедрение пунктов меню в подменю плагина tabletools. */
            var tabletoolsMenuInjector = {
                tablecolumnMenuItem: undefined,
                originalTablecolumnMenuItemGetItems: undefined,
                tablecolumnSubmenuItems: undefined,
                tablerowMenuItem: undefined,
                originalTablerowMenuItemGetItems: undefined,
                tablerowSubmenuItems: undefined,

                init: function () {
                    this.tablecolumnMenuItem = editor.getMenuItem("tablecolumn");
                    this.originalTablecolumnMenuItemGetItems = this.tablecolumnMenuItem.getItems;
                    this.tablerowMenuItem = editor.getMenuItem("tablerow");
                    this.originalTablerowMenuItemGetItems = this.tablerowMenuItem.getItems;
                },

                clear: function () {
                    this.tablecolumnSubmenuItems = this.originalTablecolumnMenuItemGetItems();
                    this.tablerowSubmenuItems = this.originalTablerowMenuItemGetItems();
                },

                injectTablecolumnSubmenuItem: function (menuItem, state) {
                    this.tablecolumnSubmenuItems[menuItem] = state;
                },

                injectTablerowSubmenuItem: function (menuItem, state) {
                    this.tablerowSubmenuItems[menuItem] = state;
                },

                apply: function () {
                    var self = this;
                    this.tablecolumnMenuItem.getItems = function () {
                        return self.tablecolumnSubmenuItems;
                    };
                    this.tablerowMenuItem.getItems = function () {
                        return self.tablerowSubmenuItems;
                    };
                }
            };
            tabletoolsMenuInjector.init();

            editor.contextMenu.addListener(function (element) {
                if (!window.StickyFilter) return; //на случай, если объект ещё не загружен
                if (!element.getAscendant({th: 1, td: 1}, true)) return; //если меню вызывается не на ячейке

                tabletoolsMenuInjector.clear();

                //активация пунктов меню, относящихся к фильтрации
                var edgeCells = getSelectionEdgeCells();
                if (edgeCells.startCell === null || edgeCells.endCell === null) {
                    //не удалось определить одну или обе границы-ячейки выбранного диапазона
                    //столбцов (такое возможно при наличии вертикально объединённых ячеек в
                    //строке, содержащей фильтры, это нормальная ситуация, когда такие строки
                    //закреплены)
                    tabletoolsMenuInjector.injectTablecolumnSubmenuItem("enableFilter", CKEDITOR.TRISTATE_DISABLED);
                }
                else if (edgeCells.startCell === edgeCells.endCell) {
                    //выбран один столбец
                    var cell = edgeCells.startCell;
                    if (StickyFilter.colCanFilter(cell)) {
                        //и он может фильтроваться
                        if (StickyFilter.colHasFilter(cell)) {
                            //и он уже фильтруется
                            tabletoolsMenuInjector.injectTablecolumnSubmenuItem("disableFilter", CKEDITOR.TRISTATE_OFF);
                        }
                        else {
                            //и он пока не фильтруется
                            tabletoolsMenuInjector.injectTablecolumnSubmenuItem("enableFilter", CKEDITOR.TRISTATE_OFF);
                        }
                    }
                    else {
                        //и он не может фильтроваться
                        if (StickyFilter.colHasFilter(cell)) {
                            //но он фильтруется (возможно, после включения фильтра менялись объединения ячеек)
                            tabletoolsMenuInjector.injectTablecolumnSubmenuItem("disableFilter", CKEDITOR.TRISTATE_OFF);
                        }
                        else {
                            //и он не фильтруется
                            tabletoolsMenuInjector.injectTablecolumnSubmenuItem("enableFilter", CKEDITOR.TRISTATE_DISABLED);
                        }
                    }
                }
                else {
                    //выбраны несколько столбцов
                    if (StickyFilter.colsAllCanFilter(edgeCells.startCell, edgeCells.endCell)) {
                        //и они все могут фильтроваться
                        if (StickyFilter.colsHasFilters(edgeCells.startCell, edgeCells.endCell)) {
                            //и среди них есть уже фильтрующиеся
                            tabletoolsMenuInjector.injectTablecolumnSubmenuItem("disableFilters", CKEDITOR.TRISTATE_OFF);
                        }
                        else {
                            //и среди них нет уже фильтрующихся
                            tabletoolsMenuInjector.injectTablecolumnSubmenuItem("enableFilters", CKEDITOR.TRISTATE_OFF);
                        }
                    }
                    else {
                        //но они не все могут фильтроваться
                        if (StickyFilter.colsHasFilters(edgeCells.startCell, edgeCells.endCell)) {
                            //и при этом среди них есть уже фильтрующиеся
                            tabletoolsMenuInjector.injectTablecolumnSubmenuItem("disableFilters", CKEDITOR.TRISTATE_OFF);
                        }
                        else {
                            //и среди них нет уже фильтрующихся
                            tabletoolsMenuInjector.injectTablecolumnSubmenuItem("enableFilters", CKEDITOR.TRISTATE_DISABLED);
                        }
                    }
                }

                //активация пунктов меню, относящихся к закреплению
                var edgeRows = getSelectionEdgeRows(); //начальная и конечная строки диапазона текущего выделения
                if (edgeRows.startRow === edgeRows.endRow) {
                    //выбрана одна строка
                    var row = edgeRows.startRow;
                    if (StickyFilter.rowCanStick(row)) {
                        //и она может закрепляться
                        if (StickyFilter.rowIsSticky(row)) {
                            //и она закреплена
                            tabletoolsMenuInjector.injectTablerowSubmenuItem("unstickRow", CKEDITOR.TRISTATE_OFF);
                        }
                        else {
                            //и она не закреплена
                            tabletoolsMenuInjector.injectTablerowSubmenuItem("stickRow", CKEDITOR.TRISTATE_OFF);
                        }
                    }
                    else {
                        //и она не может закрепляться
                        if (StickyFilter.rowIsSticky(row)) {
                            //но она закреплена
                            tabletoolsMenuInjector.injectTablerowSubmenuItem("unstickRow", CKEDITOR.TRISTATE_DISABLED);
                            //нельзя позволять откреплять её, так как это может разорвать допустимый
                            //закреплённый диапазон с объединёнными ячейками
                        }
                        else {
                            //и она не закреплена
                            tabletoolsMenuInjector.injectTablerowSubmenuItem("stickRow", CKEDITOR.TRISTATE_DISABLED);
                        }
                    }
                }
                else {
                    //выбраны несколько строк
                    if (StickyFilter.rowsAllCanStick(edgeRows.startRow, edgeRows.endRow)) {
                        //и они могут совместно закрепляться

                        if (StickyFilter.rangeIsAllSticky(edgeRows.startRow, edgeRows.endRow)) {
                            //и они все закреплённые
                            tabletoolsMenuInjector.injectTablerowSubmenuItem("unstickRows", CKEDITOR.TRISTATE_OFF);
                        }
                        else {
                            //но пока все не закреплены
                            tabletoolsMenuInjector.injectTablerowSubmenuItem("stickRows", CKEDITOR.TRISTATE_OFF);
                        } //один вариант показа пунктов меню

                        /*if (StickyFilter.rangeHasStickyRows(edgeRows.startRow, edgeRows.endRow)) {
                            //и среди них есть закреплённые
                            tabletoolsMenuInjector.injectTablerowSubmenuItem("unstickRows", CKEDITOR.TRISTATE_OFF);
                        }
                        else {
                            //и среди них нет закреплённых
                            tabletoolsMenuInjector.injectTablerowSubmenuItem("stickRows", CKEDITOR.TRISTATE_OFF);
                        }*/ //другой вариант показа пунктов меню
                    }
                    else {
                        //и они не могут совместно закрепляться
                        if (StickyFilter.rangeHasStickyRows(edgeRows.startRow, edgeRows.endRow)) {
                            //но среди них есть закреплённые
                            tabletoolsMenuInjector.injectTablerowSubmenuItem("unstickRows", CKEDITOR.TRISTATE_DISABLED);
                            //нельзя позволять откреплять их, так как это может разорвать допустимый
                            //закреплённый диапазон с объединёнными ячейками
                        }
                        else {
                            //и среди них нет закреплённых
                            tabletoolsMenuInjector.injectTablerowSubmenuItem("stickRows", CKEDITOR.TRISTATE_DISABLED);
                        }
                    }
                }

                tabletoolsMenuInjector.apply();
            });
        }

        editor.on("getData", function (evt) {
            if (!window.StickyFilter) return; //на случай, если объект ещё не загружен
            var tempDiv = document.createElement("div");
            tempDiv.innerHTML = evt.data.dataValue;
            var tables = tempDiv.querySelectorAll("table");
            var someTableHasBeenChanged = false;
            for (var i = 0; i < tables.length; i++) {
                if (StickyFilter.sanitizeTable(tables[i])) {
                    someTableHasBeenChanged = true;
                }
            }
            if (someTableHasBeenChanged) {
                evt.data.dataValue = tempDiv.innerHTML;
            }
        });

        editor.filter.addFeature({
            name: "tableWithStickyFilter",
            allowedContent: "tr th td(*)"
        });
    },
    onLoad: function () {
        //стили оформления закреплённых строк и фильтровальных ячеек при редактировании контента
        CKEDITOR.addCss(" \n\
            tr.row-sticky td, tr.row-sticky th { \n\
                background: #eefeff; \n\
                transition: background .1s ease; \n\
            } \n\
            tr.row-sticky:hover td, tr.row-sticky:hover th { \n\
                background: #e0f9f9; \n\
                transition: background .1s ease; \n\
            } \n\
            td.column-filter, th.column-filter { \n\
                background: #feeeff; \n\
            } \n\
            td.column-filter:hover, th.column-filter:hover { \n\
                background: #fde0fa; \n\
            } \n\
            tr.row-sticky td.column-filter, tr.row-sticky th.column-filter { \n\
                background: #f0e0fa; \n\
            } \n\
            tr.row-sticky:hover td.column-filter, tr.row-sticky:hover th.column-filter { \n\
                background: #e5d5f4; \n\
            } \n\
            td.column-filter, th.column-filter,\n\
            tr.row-sticky td, tr.row-sticky th {\n\
                position: relative; \n\
            } \n\
            td.column-filter:hover::after, th.column-filter:hover::after,\n\
            tr.row-sticky td:hover::after, tr.row-sticky th:hover::after {\n\
                position: absolute; \n\
                z-index: 1; \n\
                top: -10px; \n\
                left: 90%; \n\
                border-radius: 5px; \n\
                background: white; \n\
                padding: 0 3px; \n\
                white-space: pre; \n\
                font-size: 12px; \n\
                line-height: 12px; \n\
                opacity: .9; \n\
                box-shadow: 0 0 5px 5px white, 3px 3px 5px 5px rgba(0, 0, 0, .1); \n\
            } \n\
            td.column-filter:hover::after, th.column-filter:hover::after { \n\
                content: 'Ячейка с фильтром'; \n\
            } \n\
            tr.row-sticky td:hover::after, tr.row-sticky th:hover::after { \n\
                content: 'Строка закреплена'; \n\
            } \n\
            tr.row-sticky td.column-filter:hover::after, tr.row-sticky th.column-filter:hover::after { \n\
                content: 'Ячейка с фильтром\\00000aСтрока закреплена'; \n\
            } \n\
        ");
    }
});