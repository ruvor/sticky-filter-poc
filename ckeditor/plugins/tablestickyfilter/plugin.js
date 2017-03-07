CKEDITOR.plugins.add( 'tablestickyfilter', {
    requires: 'tabletools,dialog,contextmenu',
    init: function( editor ) {
        var scriptElement = document.createElement("script");
        scriptElement.src = this.path + "sticky-filter.js";
        document.querySelector("head").insertAdjacentElement("beforeEnd", scriptElement);

        function getSelectionEdgeCells() {
            var selection = editor.getSelection();
            var range = selection.getRanges()[0];
            return {
                startCell: range.startContainer.getAscendant({ th: 1, td: 1 }, true),
                endCell: range.endContainer.getAscendant({ th: 1, td: 1 }, true)
            };
        }

        function getSelectionEdgeRows() {
            var selection = editor.getSelection();
            var range = selection.getRanges()[0];
            return {
                startRow: range.startContainer.getAscendant("tr", true),
                endRow: range.endContainer.getAscendant("tr", true)
            };
        }

        editor.addCommand( 'enableFilter', {
            exec: function( editor ) {
                StickyFilter.enableFilterForCol(getSelectionEdgeCells().startCell.$);
            }
        });
        editor.addCommand( 'enableFilters', {
            exec: function( editor ) {
                var edgeCells = getSelectionEdgeCells();
                StickyFilter.enableFiltersForCols(edgeCells.startCell.$, edgeCells.endCell.$);
            }
        });
        editor.addCommand( 'disableFilter', {
            exec: function( editor ) {
                StickyFilter.disableFilterForCol(getSelectionEdgeCells().startCell.$);
            }
        });
        editor.addCommand( 'disableFilters', {
            exec: function( editor ) {
                var edgeCells = getSelectionEdgeCells();
                StickyFilter.disableFiltersForCols(edgeCells.startCell.$, edgeCells.endCell.$);
            }
        });
        editor.addCommand( 'stickRow', {
            exec: function( editor ) {
                StickyFilter.stickRow(getSelectionEdgeRows().startRow.$);
            }
        });
        editor.addCommand( 'stickRows', {
            exec: function( editor ) {
                var edgeRows = getSelectionEdgeRows();
                StickyFilter.stickRows(edgeRows.startRow.$, edgeRows.endRow.$);
            }
        });
        editor.addCommand( 'unstickRow', {
            exec: function( editor ) {
                StickyFilter.unstickRow(getSelectionEdgeRows().startRow.$);
            }
        });
        editor.addCommand( 'unstickRows', {
            exec: function( editor ) {
                var edgeRows = getSelectionEdgeRows();
                StickyFilter.unstickRows(edgeRows.startRow.$, edgeRows.endRow.$);
            }
        });
        if ( editor.contextMenu ) {
            editor.addMenuItem( 'enableFilter', {
                label: 'Включить фильтр',
                command: 'enableFilter',
                group: 'tablecolumn'
            });
            editor.addMenuItem( 'enableFilters', {
                label: 'Включить фильтр',
                command: 'enableFilters',
                group: 'tablecolumn'
            });
            editor.addMenuItem( 'disableFilter', {
                label: 'Выключить фильтр',
                command: 'disableFilter',
                group: 'tablecolumn'
            });
            editor.addMenuItem( 'disableFilters', {
                label: 'Выключить фильтр',
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
            var tablecolumnMenuItem = editor.getMenuItem("tablecolumn");
            var originalTablecolumnMenuItemGetItems = tablecolumnMenuItem.getItems;
            var tablerowMenuItem = editor.getMenuItem("tablerow");
            var originalTablerowMenuItemGetItems = tablerowMenuItem.getItems;
            editor.contextMenu.addListener( function( element ) {
                if (!StickyFilter) return; //на случай, если объект ещё не загружен
                //console.dir(element); //debug
                if ( element.getAscendant( { th: 1, td: 1 }, true ) ) {
                    /*return {
                        enableFilter: CKEDITOR.TRISTATE_OFF,
                        disableFilter: CKEDITOR.TRISTATE_OFF,
                        stickRow: CKEDITOR.TRISTATE_OFF,
                        unstickRow: CKEDITOR.TRISTATE_OFF
                    }*/

                    //фильтрация
                    var edgeCells = getSelectionEdgeCells();
                    if (StickyFilter.colsAllCanFilter(edgeCells.startCell.$, edgeCells.endCell.$)) {
                        //столбцы выбранных ячеек все могут фильтроваться (или таковой один и может)
                        var tablecolumnSubmenuItems = originalTablecolumnMenuItemGetItems();
                        if (edgeCells.startCell.equals(edgeCells.endCell)) {
                            //выбрана одна ячейка
                            if (StickyFilter.columnHasFilter(edgeCells.startCell.$)) {
                                //и её столбец уже фильтруется
                                tablecolumnSubmenuItems.disableFilter = CKEDITOR.TRISTATE_OFF;
                            }
                            else {
                                //и её столбец не фильтруется
                                tablecolumnSubmenuItems.enableFilter = CKEDITOR.TRISTATE_OFF;
                            }
                        }
                        else {
                            //выбраны несколько ячеек и, соответственно, столбцов
                            if (StickyFilter.colsHasFilters(edgeCells.startCell.$, edgeCells.endCell.$)) {
                                //и среди них есть уже фильтрующиеся
                                tablecolumnSubmenuItems.disableFilters = CKEDITOR.TRISTATE_OFF;
                            }
                            else {
                                //и среди них нет фильтрующихся
                                tablecolumnSubmenuItems.enableFilters = CKEDITOR.TRISTATE_OFF;
                            }
                        }
                        tablecolumnMenuItem.getItems = function () {
                            return tablecolumnSubmenuItems;
                        };
                    }

                    //закрепление
                    var edgeRows = getSelectionEdgeRows();
                    if (StickyFilter.rowsAllCanStick(edgeRows.startRow.$, edgeRows.endRow.$)) {
                        //выбранные строки могут совместно закрепляться (или таковая одна и может)
                        var tablerowSubmenuItems = originalTablerowMenuItemGetItems();
                        if (edgeRows.startRow.equals(edgeRows.endRow)) {
                            //выбрана одна строка
                            if (StickyFilter.rowIsSticky(edgeRows.startRow.$)) {
                                //и эта строка закреплена
                                tablerowSubmenuItems.unstickRow = CKEDITOR.TRISTATE_OFF;
                            }
                            else {
                                //и эта строка не закреплена
                                tablerowSubmenuItems.stickRow = CKEDITOR.TRISTATE_OFF;
                            }
                        }
                        else {
                            //выбраны несколько строк
                            if (StickyFilter.rangeHasStickyRows(edgeRows.startRow.$, edgeRows.endRow.$)) {
                                //и среди них есть закреплённые
                                tablerowSubmenuItems.unstickRows = CKEDITOR.TRISTATE_OFF;
                            }
                            else {
                                //и среди них нет закреплённых
                                tablerowSubmenuItems.stickRows = CKEDITOR.TRISTATE_OFF;
                            }
                        }
                        tablerowMenuItem.getItems = function () {
                            return tablerowSubmenuItems;
                        };
                    }
                }
            });
        }
    },
    onLoad: function() {
        CKEDITOR.addCss(" \n\
            .row-filter td, .row-filter th { \n\
                background: #feeeff; \n\
            } \n\
            .row-sticky td, .row-sticky th { \n\
                background: #eefeff; \n\
            } \n\
        ");
    }
});