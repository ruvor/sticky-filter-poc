CKEDITOR.plugins.add( 'tablestickyfilter', {
    requires: 'tabletools,dialog,contextmenu',
    init: function( editor ) {
        editor.addCommand( 'enableFilter', {
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
        editor.addCommand( 'stickRow', {
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
        if ( editor.contextMenu ) {
            editor.addMenuItem( 'enableFilter', {
                label: 'Включить фильтр',
                command: 'enableFilter',
                group: 'tablecolumn'
            });
            editor.addMenuItem( 'disableFilter', {
                label: 'Выключить фильтр',
                command: 'disableFilter',
                group: 'tablecolumn'
            });
            editor.addMenuItem( 'stickRow', {
                label: 'Закрепить строку',
                command: 'stickRow',
                group: 'tablerow'
            });
            editor.addMenuItem( 'unstickRow', {
                label: 'Открепить строку',
                command: 'unstickRow',
                group: 'tablerow'
            });
            var tablecolumnMenuItem = editor.getMenuItem("tablecolumn");
            var originalTablecolumnMenuItemGetItems = tablecolumnMenuItem.getItems;
            var tablerowMenuItem = editor.getMenuItem("tablerow");
            var originalTablerowMenuItemGetItems = tablerowMenuItem.getItems;
            editor.contextMenu.addListener( function( element ) {
                //console.dir(element);
                if ( element.getAscendant( { th: 1, td: 1 }, true ) ) {
                    /*return {
                        enableFilter: CKEDITOR.TRISTATE_OFF,
                        disableFilter: CKEDITOR.TRISTATE_OFF,
                        stickRow: CKEDITOR.TRISTATE_OFF,
                        unstickRow: CKEDITOR.TRISTATE_OFF
                    }*/
                    var tablecolumnSubmenuItems = originalTablecolumnMenuItemGetItems();
                    if (columnHasFilter(element)) {
                        tablecolumnSubmenuItems.disableFilter = CKEDITOR.TRISTATE_OFF;
                    }
                    else {
                        tablecolumnSubmenuItems.enableFilter = CKEDITOR.TRISTATE_OFF;
                    }
                    tablecolumnMenuItem.getItems = function () {
                        return tablecolumnSubmenuItems;
                    };
                    var tablerowSubmenuItems = originalTablerowMenuItemGetItems();
                    if (rowIsSticky(element)) {
                        tablerowSubmenuItems.unstickRow = CKEDITOR.TRISTATE_OFF;
                    }
                    else {
                        tablerowSubmenuItems.stickRow = CKEDITOR.TRISTATE_OFF;
                    }
                    tablerowMenuItem.getItems = function () {
                        return tablerowSubmenuItems;
                    };
                }
            });
        }
    }
});

function columnHasFilter(element) {
    return true;
}

function rowIsSticky(element) {
    return true;
}