//закрепление следует использовать с таблицами без внешних границ
var StickyFilter = (function () {
    var TP_CLASS = "table-prcnt"; //CSS-класс, назначаемый "процентизованным" таблицам
    var TF_CLASS = "table-filter"; //CSS-класс, назначаемый таблицам с фильтром
    var RF_CLASS = "row-filter"; //CSS-класс, назначаемый строкам с фильтром
    var CF_CLASS = "column-filter"; //CSS-класс ячеек, используемый как признак необходимости фильтрации по столбцам, содержащим эти ячейки
    var TS_CLASS = "table-sticky"; //CSS-класс, назначаемый таблицам с закреплёнными строками
    var RS_CLASS = "row-sticky"; //CSS-класс, назначаемый закреплённым строкам
    var WRAPPER_CLASS = "sticky-wrapper";

    var stickyTables;
    var isFiltering = false;
    var isSticky = false;

    //несколько полифиллов
        if (!Element.prototype.matches) {
            Element.prototype.matches = Element.prototype.matchesSelector ||
            Element.prototype.webkitMatchesSelector ||
            Element.prototype.mozMatchesSelector ||
            Element.prototype.msMatchesSelector;
        }
        if (!Element.prototype.closest) {
            Element.prototype.closest = function(css) {
            var node = this;
            while (node) {
                if (node.matches(css)) return node;
                else node = node.parentElement;
            }
            return null;
            };
        }
        if (!Element.prototype.remove) {
            Element.prototype.remove = function() {
                this.parentElement.removeChild(this);
            }
    }
    // /несколько полифиллов

    function onTableFilterInput(e) {
        var peerInput = findPeerInput(e.target);
        if (peerInput) {
            peerInput.value = e.target.value;
        }
        filterTable(e.target.closest("table"));
    }

    function onStickyTableFilterInput(e) {
        if (!e.target.matches("." + CF_CLASS + " input[type=text]")) return;
        var peerInput = findPeerInput(e.target);
        peerInput.value = e.target.value;
        var event = document.createEvent("Event");
        event.initEvent("input", true, true);
        peerInput.dispatchEvent(event);
    }

    function onWindowScroll(e) {
        for (var i = 0; i < stickyTables.length; i++) {
            var table = stickyTables[i];
            var tableRect = table.getBoundingClientRect();
            var peer = table.peer;
            if (tableRect.top > 0 || tableRect.bottom <= 0) {
                peer.style.display = "none";
                continue;
            }
            peer.style.left = tableRect.left + "px";
            peer.style.width = table.offsetWidth + "px";
            peer.style.visibility = "hidden";
            peer.style.display = "table";
            var peerRows = peer.querySelectorAll("tr");
            var peerRosHeights = [];
            for (var j = 0; j < peerRows.length; j++) {
                peerRows[j].style.display = "table-row";
                peerRosHeights[j] = peerRows[j].offsetHeight;
                peerRows[j].style.display = "none";
            }
            peer.style.visibility = "visible";

            var stickyRows = table.querySelectorAll("tr." + RS_CLASS + ", tr." + RF_CLASS);
            var acc = 0;
            for (var k = 0; k < stickyRows.length; k++) {
                var stickyRow = stickyRows[k];
                var rowRect = stickyRow.getBoundingClientRect();
                if (rowRect.top < acc) {
                    peerRows[k].style.display = "table-row";
                    acc += peerRosHeights[k];
                }
            }
            var diff = tableRect.bottom - peer.offsetHeight;
            if (diff < 0) {
                peer.style.top = diff + "px";
            }
            else {
                peer.style.top = 0;
            }
        }
    }

    function percentizeTable(table) {
        if (table.matches("." + TP_CLASS)) return;
        var firstRow = table.querySelector("tr");
        var rowWidth = firstRow.offsetWidth;
        var firstRowCells = firstRow.children;
        var cellWidths = [];
        for (var j = 0; j < firstRowCells.length; j++) {
            var cell = firstRowCells[j];
            cell.style.boxSizing = "border-box";
            cellWidths[j] = cell.offsetWidth;
        }
        var colgroup = table.querySelector("colgroup");
        if (colgroup) colgroup.remove();
        colgroup = document.createElement("colgroup");
        for (j = 0; j < firstRowCells.length; j++) {
            cell = firstRowCells[j];
            var col = document.createElement("col");
            col.style.width = (cellWidths[j] / rowWidth * 100) + "%";
            colgroup.appendChild(col);
        }
        table.insertBefore(colgroup, table.firstChild);
        table.style.tableLayout = "fixed";
        table.className += " " + TP_CLASS;
    }

    function enableTableFiltering() {
        if (isFiltering) return;
        var allTables = document.querySelectorAll("table");
        for (var i = 0; i < allTables.length; i++) {
            var table = allTables[i];
            //if (table.matches("." + TF_CLASS)) continue; //из-за проверки isFiltering теперь не нужно
            var allFilteringCells = table.querySelectorAll("th." + CF_CLASS + ", td." + CF_CLASS);
            //предполагается, что такие ячейки будут в одной строке таблицы
            if (allFilteringCells.length == 0) continue; //если в таблице нет фильтровальных ячеек
            percentizeTable(table);
            var filteringRow = allFilteringCells[0].closest("tr");
            var filteringCells = filteringRow.querySelectorAll("th." + CF_CLASS + ", td." + CF_CLASS);
            for (var j = 0; j < filteringCells.length; j++) {
                cell = filteringCells[j];
                var filterInput = document.createElement("input");
                filterInput.setAttribute("type", "text");
                filterInput.addEventListener("input", onTableFilterInput);
                filteringCells[j].appendChild(filterInput);
            }
            filteringRow.className += " " + RF_CLASS;
            table.className += " " + TF_CLASS;
        }
        if (isSticky) {
            disableTableSticking();
            enableTableSticking();
        }
        isFiltering = true;
    }

    function disableTableFiltering() {
        if (!isFiltering) return;
        var filteredTables = document.querySelectorAll("table." + TF_CLASS);
        for (var i = 0; i < filteredTables.length; i++) {
            var table = filteredTables[i];
            var filteringRow = table.querySelector("." + RF_CLASS);
            filteringRow.className = filteringRow.className.replace(" " + RF_CLASS, "");
            var filteringCells = filteringRow.querySelectorAll("th." + CF_CLASS + ", td." + CF_CLASS);
            for (var j = 0; j < filteringCells.length; j++) {
                filteringCells[j].querySelector("input[type=text]").remove();
            }
            unfilterTable(table);
            table.className = table.className.replace(" " + TF_CLASS, "");
        }
        if (isSticky) {
            disableTableSticking();
            enableTableSticking();
        }
        isFiltering = false;
    }

    function filterTable(table) {
        var filterRow = table.querySelector("tr." + RF_CLASS);
        var rows = table.querySelectorAll("tr:not(." + RF_CLASS + "):not(." + RS_CLASS + ")");
        if (!filterRow || rows.length == 0) return;
        var filterValues = {};
        var filterCells = filterRow.querySelectorAll("th, td");
        for (var i = 0; i < filterCells.length; i++) {
            var filterInput = filterCells[i].querySelector("." + CF_CLASS + " input[type=text]");
            if (filterInput && filterInput.value) {
                filterValues[i] = filterInput.value.toLowerCase();
            }
        }
        var rowsToHide = [];
        var rowsToShow = [];
        for (var j = 0; j < rows.length; j++) {
            var row = rows[j];
            var hideRow = false;
            var cols = row.querySelectorAll("th, td");
            for (var filteringColIndex in filterValues) {
                if (cols[filteringColIndex].textContent.toLowerCase().indexOf(filterValues[filteringColIndex]) < 0) {
                    hideRow = true;
                    break;
                }
            }
            if (hideRow) rowsToHide.push(row);
            else rowsToShow.push(row);
        }
        for (i = 0; i < rowsToHide.length; i++) rowsToHide[i].style.display = "none";
        for (i = 0; i < rowsToShow.length; i++) rowsToShow[i].style.display = "table-row";
    }

    function unfilterTable(table) {
        var rows = table.querySelectorAll("tr:not(." + RF_CLASS + "):not(." + RS_CLASS + ")");
        for (var j = 0; j < rows.length; j++) {
            var row = rows[j];
            row.style.display = "table-row";
        }
    }

    function enableTableSticking() {
        if (isSticky) return;
        /*var wrapper = document.querySelector("." + WRAPPER_CLASS);
        if (!wrapper) {
            wrapper = document.createElement("div");
            wrapper.className = WRAPPER_CLASS;
            document.body.appendChild(wrapper);
            stickyTables = [];
        }*/ //из-за проверки isSticky теперь можно проще
        var wrapper = document.createElement("div");
        wrapper.className = WRAPPER_CLASS;
        document.body.appendChild(wrapper);
        stickyTables = [];
        var allTables = document.querySelectorAll("table");
        for (var i = 0; i < allTables.length; i++) {
            var table = allTables[i];
            //if (table.matches("." + TS_CLASS)) continue; //из-за проверки isSticky теперь не нужно
            var stickyRows = table.querySelectorAll("tr." + RS_CLASS + ", tr." + RF_CLASS);
            if (stickyRows.length == 0) continue; //в таблице нет строк для закрепления
            percentizeTable(table);
            var peer = table.cloneNode(true);
            peer.style.display = "none";
            wrapper.appendChild(peer);
            table.peer = peer;
            peer.peer = table;
            var peerRowsToDelete = peer.querySelectorAll("tr:not(." + RF_CLASS + "):not(." + RS_CLASS + ")");
            for (var j = 0; j < peerRowsToDelete.length; j++) {
                peerRowsToDelete[j].remove();
            }
            table.className += " " + TS_CLASS;
            stickyTables.push(table);
        }
        window.addEventListener("scroll", onWindowScroll);
        wrapper.addEventListener("input", onStickyTableFilterInput);
        isSticky = true;
    }

    function disableTableSticking() {
        if (!isSticky) return;
        var stickyTables = document.querySelectorAll("table." + TS_CLASS);
        for (var i = 0; i < stickyTables.length; i++) {
            var table = stickyTables[i];
            table.className = table.className.replace(" " + TS_CLASS, "");
        }
        window.removeEventListener("scroll", onWindowScroll);
        stickyTables = undefined;
        var wrapper = document.querySelector("." + WRAPPER_CLASS);
        if (wrapper) wrapper.remove();
        isSticky = false;
    }

    function findPeerInput(origInput) {
        var num;
        var origTable = origInput.closest("table");
        var peerTable = origTable.peer;
        if (!peerTable) return null;
        var inputs = origTable.querySelectorAll("." + CF_CLASS + " input[type=text]");
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i] == origInput) {
                num = i;
                break;
            }
        }
        var peerInput = peerTable.querySelectorAll("." + CF_CLASS + " input[type=text]")[num];
        return peerInput;
    }

    /*function showHideRows(table, show) {//надо?
        var rows = table.querySelectorAll("tr");
        for (var i = 0; i < rows.length; i++) {
            rows[i].style.display = show ? "table-row" : "none";
        }
    }
    function showRows(table) {
        showHideRows(table, true);
    }
    function hideRows(table) {
        showHideRows(table, false);
    }*/

    var requiredStyles = "\
        .table-filter input { \n\n\
            box-sizing: border-box; \n\
            width: 100%; \n\
        } \n\
        .sticky-wrapper { \n\
            position: fixed; \n\
            top: 0; \n\
            left: 0; \n\
            width: 100%; \n\
            height: 0; \n\
        } \n\
        .sticky-wrapper table { \n\
            background: white; \n\
            position: absolute; \n\
            min-width: 0; \n\
            max-width: none; \n\
        } \n\
    ";
    var styleElement = document.createElement("style");
    styleElement.textContent = requiredStyles;
    document.querySelector("head").insertAdjacentElement("beforeEnd", styleElement);

    var StickyFilter = {};
    StickyFilter.enableTableFiltering = enableTableFiltering;
    StickyFilter.disableTableFiltering = disableTableFiltering;
    StickyFilter.enableTableSticking = enableTableSticking;
    StickyFilter.disableTableSticking = disableTableSticking;
    Object.defineProperty(StickyFilter, "isFiltering", {
        get: function() {
            return isFiltering;
        }
    });
    Object.defineProperty(StickyFilter, "isSticky", {
        get: function() {
            return isSticky;
        }
    });
    return StickyFilter;
})();