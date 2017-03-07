CKEDITOR.plugins.add( 'tablestickyfilter', {
    requires: 'tabletools,dialog,contextmenu',
    init: function( editor ) {
        var scriptElement = document.createElement("script");
        scriptElement.src = this.path + "sticky-filter.js";
        document.querySelector("head").insertAdjacentElement("beforeEnd", scriptElement);

        editor.addCommand( 'enableFilter', {
            exec: function( editor ) {
                var now = new Date();
                editor.insertHtml( 'The current date and time is: <em>' + now.toString() + '</em>' );
            }
        });
        editor.addCommand( 'enableFilters', {
            exec: function( editor ) {
                var now = new Date();
                editor.insertHtml( 'The current date and time is: <em>' + now.toString() + '</em>' );
            }
        });
        editor.addCommand( 'disableFilter', {
            exec: function( editor ) {
                var now = new Date();
                editor.insertHtml( 'The current date and time is: <em>' + now.toString() + '</em>' );
            }
        });
        editor.addCommand( 'disableFilters', {
            exec: function( editor ) {
                var now = new Date();
                editor.insertHtml( 'The current date and time is: <em>' + now.toString() + '</em>' );
            }
        });
        editor.addCommand( 'stickRow', {
            exec: function( editor ) {
                var now = new Date();
                editor.insertHtml( 'The current date and time is: <em>' + now.toString() + '</em>' );
            }
        });
        editor.addCommand( 'stickRows', {
            exec: function( editor ) {
                var now = new Date();
                editor.insertHtml( 'The current date and time is: <em>' + now.toString() + '</em>' );
            }
        });
        editor.addCommand( 'unstickRow', {
            exec: function( editor ) {
                var now = new Date();
                editor.insertHtml( 'The current date and time is: <em>' + now.toString() + '</em>' );
            }
        });
        editor.addCommand( 'unstickRows', {
            exec: function( editor ) {
                var now = new Date();
                editor.insertHtml( 'The current date and time is: <em>' + now.toString() + '</em>' );
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

                    var selection = editor.getSelection();
                    var range = selection.getRanges()[0];

                    //фильтрация
                    var startCell = range.startContainer.getAscendant("tr", true);
                    var endCell = range.endContainer.getAscendant("tr", true);
                    if (StickyFilter.colsAllCanFilter(startCell.$, endCell.$)) {
                        //столбцы выбранных ячеек все могут фильтроваться (или таковой один и может)
                        var tablecolumnSubmenuItems = originalTablecolumnMenuItemGetItems();
                        if (startCell.equals(endCell)) {
                            //выбрана одна ячейка
                            if (StickyFilter.columnHasFilter(startCell.$)) {
                                //и её столбец уже фильтруется
                                tablecolumnSubmenuItems.disableFilter = CKEDITOR.TRISTATE_OFF;
                            }
                            else {
                                //и её столбец не фильтруется
                                tablecolumnSubmenuItems.enableFilter = CKEDITOR.TRISTATE_OFF;
                            }
                        }
                        else {
                            //выбранны несколько ячеек и, соответственно, столбцов
                            if (StickyFilter.colsHasFilters(startCell.$, endCell.$)) {
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
                    var startRow = range.startContainer.getAscendant("tr", true);
                    var endRow = range.endContainer.getAscendant("tr", true);
                    if (StickyFilter.rowsAllCanStick(startRow.$, endRow.$)) {
                        //выбранные строки могут совместно закрепляться (или таковая одна и может)
                        var tablerowSubmenuItems = originalTablerowMenuItemGetItems();
                        if (startRow.equals(endRow)) {
                            //выбрана одна строка
                            if (StickyFilter.rowIsSticky(startRow.$)) {
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
                            if (StickyFilter.rangeHasStickyRows(startRow.$, endRow.$)) {
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
    }
});