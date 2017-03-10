//TODO: добавить JSDocов
//TODO: добавить метод sanitizeTable и звать его после меняния закрпеления и через ACF
CKEDITOR.plugins.add( 'tablestickyfilter', {
    requires: 'tabletools,dialog,contextmenu',
    init: function( editor ) {
        var scriptElement = document.createElement("script");
        scriptElement.src = this.path + "sticky-filter.js";
        document.querySelector("head").insertAdjacentElement("beforeEnd", scriptElement);

        function getSelectionEdgeCells() {
            //рассматриваются выделенные ячейки только одной строки, строки ячейки начала
            //выбранного диапазона, потому что весьма сомнительно, что кому-то понадобится
            //включать фильтры для столбцов ячеек, выделенных в нескольких строках, а код при
            //таком предположении значительно упрощается, кроме того, сам фильтр по условиям
            //задачи располагается на одной строке
            var selection = editor.getSelection();
            var range = selection.getRanges()[0];
            var startCell = range.startContainer.getAscendant({ th: 1, td: 1 }, true);
            var startCellRow = startCell.getParent();
            var endCell = range.endContainer.getAscendant({ th: 1, td: 1 }, true);
            var endCellRow = endCell.getParent();
            if (!startCellRow.equals(endCellRow)) {
                //выбраны несколько строк, такая ситуация считается равнозначной выбору одной ячейки
                endCell = startCell;
            }
            var startCellNode = startCell.$, endCellNode = endCell.$;
            var table = startCellRow.getAscendant({ table: 1 }, true);
            var filterRow = StickyFilter.getFilterRow(table.$);
            if (!filterRow) {
                //в таблице ещё нет фильтровальных ячеек
                filterRow = startCellRow.$;
            }
            else if (filterRow !== startCellRow.$) {
                //в таблице уже есть фильтровальные ячейки, и они располагаются не на текущей строке
                startCellNode = StickyFilter.findCounterpart(filterRow, startCell.$);
                endCellNode = StickyFilter.findCounterpart(filterRow, endCell.$);
            }
            return {
                filterRow: filterRow,
                startCell: startCellNode,
                endCell: endCellNode
            };
        }

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
                endRow: endRow.$.parentElement.rows[endRow.$.rowIndex + maxRowSpan - 1]
            };
        }

        // команды
            editor.addCommand( 'enableFilter', {
                exec: function( editor ) {
                    var edgeCells = getSelectionEdgeCells();
                    StickyFilter.enableFilterForCol(edgeCells.startCell);
                }
            });
            editor.addCommand( 'enableFilters', {
                exec: function( editor ) {
                    var edgeCells = getSelectionEdgeCells();
                    StickyFilter.enableFiltersForCols(edgeCells.startCell, edgeCells.endCell);
                }
            });
            editor.addCommand( 'disableFilter', {
                exec: function( editor ) {
                    var edgeCells = getSelectionEdgeCells();
                    StickyFilter.disableFilterForCol(edgeCells.startCell);
                }
            });
            editor.addCommand( 'disableFilters', {
                exec: function( editor ) {
                    var edgeCells = getSelectionEdgeCells();
                    StickyFilter.disableFiltersForCols(edgeCells.startCell, edgeCells.endCell);
                }
            });
            editor.addCommand( 'stickRow', {
                exec: function( editor ) {
                    StickyFilter.stickRow(getSelectionEdgeRows().startRow);
                }
            });
            editor.addCommand( 'stickRows', {
                exec: function( editor ) {
                    var edgeRows = getSelectionEdgeRows();
                    StickyFilter.stickRows(edgeRows.startRow, edgeRows.endRow);
                }
            });
            editor.addCommand( 'unstickRow', {
                exec: function( editor ) {
                    StickyFilter.unstickRow(getSelectionEdgeRows().startRow);
                }
            });
            editor.addCommand( 'unstickRows', {
                exec: function( editor ) {
                    var edgeRows = getSelectionEdgeRows();
                    StickyFilter.unstickRows(edgeRows.startRow, edgeRows.endRow);
                }
            });
        // /команды

        if ( editor.contextMenu ) {
            // пункты меню
                editor.addMenuItem( 'enableFilter', {
                    label: 'Включить фильтр',
                    command: 'enableFilter',
                    group: 'tablecolumn'
                });
                editor.addMenuItem( 'enableFilters', {
                    label: 'Включить фильтры',
                    command: 'enableFilters',
                    group: 'tablecolumn'
                });
                editor.addMenuItem( 'disableFilter', {
                    label: 'Выключить фильтр',
                    command: 'disableFilter',
                    group: 'tablecolumn'
                });
                editor.addMenuItem( 'disableFilters', {
                    label: 'Выключить фильтры',
                    command: 'disableFilters',
                    group: 'tablecolumn'
                });
                editor.addMenuItem( 'stickRow', {
                    label: 'Закрепить строку',
                    command: 'stickRow',
                    group: 'tablerow'
                });
                editor.addMenuItem( 'stickRows', {
                    label: 'Закрепить строки',
                    command: 'stickRows',
                    group: 'tablerow'
                });
                editor.addMenuItem( 'unstickRow', {
                    label: 'Открепить строку',
                    command: 'unstickRow',
                    group: 'tablerow'
                });
                editor.addMenuItem( 'unstickRows', {
                    label: 'Открепить строки',
                    command: 'unstickRows',
                    group: 'tablerow'
                });
            // /пункты меню

            //объект, обеспечивающий внедрение пунктов меню в подменю плагина tabletools
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

            editor.contextMenu.addListener( function( element ) {
                if (!StickyFilter) return; //на случай, если объект ещё не загружен
                if (!element.getAscendant( { th: 1, td: 1 }, true )) return; //если меню вызывается не на ячейке

                tabletoolsMenuInjector.clear();

                //активация пунктов меню, относящихся к фильтрации
                var edgeCells = getSelectionEdgeCells();
                if (edgeCells.startCell === edgeCells.endCell) {
                    //выбран один столбец
                    var cell = edgeCells.startCell;
                    if (StickyFilter.colCanFilter(edgeCells.filterRow, cell)) {
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
                    if (StickyFilter.colsAllCanFilter(edgeCells.filterRow, edgeCells.startCell, edgeCells.endCell)) {
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
    },
    onLoad: function() {
        CKEDITOR.addCss(" \n\
            td.column-filter, th.column-filter { \n\
                background: #feeeff; \n\
                position: relative; \n\
            } \n\
            td.column-filter:hover, th.column-filter:hover { \n\
                background: #f0e0fa; \n\
            } \n\
            td.column-filter:hover::after, th.column-filter:hover::after { \n\
                content: 'С фильтром'; \n\
                position: absolute; \n\
                z-index: 1; \n\
                top: -10px; \n\
                left: 90%; \n\
                white-space: nowrap; \n\
                border-radius: 5px; \n\
                background: wheat; \n\
                padding: 2px 5px; \n\
                opacity: .5; \n\
            } \n\
            .row-sticky td, .row-sticky th { \n\
                background: #eefeff; \n\
            } \n\
        ");
    }
});