//закрепление следует использовать с таблицами без внешних границ

if (window.StickyFilter === undefined) {

window.StickyFilter = (function () {
    // const
        var TP_CLASS = "table-prcnt"; //CSS-класс, назначаемый "процентизованным" таблицам
        var TF_CLASS = "table-filter"; //CSS-класс, назначаемый таблицам с фильтром при включении фильтрования
        var RF_CLASS = "row-filter"; //CSS-класс, назначаемый строкам с фильтром при включении фильтрования
        var CF_CLASS = "column-filter"; //CSS-класс ячеек, используемый как признак возможности фильтрации по столбцам, содержащим эти ячейки
        var TS_CLASS = "table-sticky"; //CSS-класс, назначаемый таблицам с закреплёнными строками при включении закрепления
        var RS_CLASS = "row-sticky"; //CSS-класс строк, используемый как признак их закрепляемости
        var WRAPPER_CLASS = "sticky-wrapper"; //CSS-класс обёртки закреплённых таблиц
    // /const

    var stickyTablesCache;
    var isFiltering = false;
    var isSticky = false;

    //TODO: убрать из прототипов, чтобы не засорять их
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

    // private methods

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

        function filterTable(table) {
            var filterRow = table.querySelector("tr." + RF_CLASS);
            var rows = table.querySelectorAll("tr:not(." + RF_CLASS + "):not(." + RS_CLASS + ")");
            if (!filterRow || rows.length == 0) return;
            var filterValues = {};
            var filterCells = filterRow.querySelectorAll("th." + CF_CLASS + ", td." + CF_CLASS);
            for (var i = 0; i < filterCells.length; i++) {
                var filterCell = filterCells[i];
                var filterInput = filterCell.querySelector("input[type=text]");
                if (filterInput && filterInput.value) {
                    filterValues[filterCell.colIndex] = filterInput.value.toLowerCase();
                }
            }
            var rowsToHide = [];
            var rowsToShow = [];
            for (var j = 0; j < rows.length; j++) {
                var row = rows[j];
                var hideRow = false;
                for (var filterColIndex in filterValues) {
                    if (getCellByColIndex(row, filterColIndex).textContent.toLowerCase().indexOf(filterValues[filterColIndex]) < 0) {
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

        function onWindowScroll(e) {
            for (var i = 0; i < stickyTablesCache.length; i++) {
                var table = stickyTablesCache[i];
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
                var peerRows = peer.rows;
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
            if (hasClass(table, TP_CLASS)) return;
            var firstRow = table.rows[0];
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
            addClass(table, TP_CLASS);
        }

        function countRowCols(row) {
            var cells = row.cells;
            var colsNum = 0;
            for (var i = 0; i < cells.length; i++) {
                colsNum += cells[i].colSpan;
            }
            return colsNum;
        }

        function countTableCols(table) {
            return countRowCols(table.rows[0]);
        }

        function hasClass(element, cssClass) {
            return new RegExp("\\b" + cssClass + "\\b").test(element.className);
        }

        function addClass(element, cssClass) {
            var oldClasses = element.className;
            if (hasClass(element, cssClass)) return;
            var newClasses = oldClasses;
            if (/\S$/.test(oldClasses)) newClasses += " ";
            newClasses += cssClass;
            element.className = newClasses;
        }

        function removeClass(element, cssClass) {
            var oldClasses = element.className;
            if (!hasClass(element, cssClass)) return;
            var newClasses = oldClasses;
            newClasses = oldClasses.replace(new RegExp("\\s?" + cssClass + "\\b"), "");
            if (/^\s*$/.test(newClasses)) element.removeAttribute("class");
            else element.className = newClasses;
        }

        function injectRequiredStyles() {
            var requiredStyles = "\
                ." + TF_CLASS + " input { \n\
                    box-sizing: border-box; \n\
                    display: block; \n\
                    width: 100%; \n\
                } \n\
                ." + WRAPPER_CLASS + " { \n\
                    position: fixed; \n\
                    top: 0; \n\
                    left: 0; \n\
                    width: 100%; \n\
                    height: 0; \n\
                } \n\
                ." + WRAPPER_CLASS + " table { \n\
                    position: absolute; \n\
                    min-width: 0; \n\
                    max-width: none; \n\
                } \n\
            ";
            var styleElement = document.createElement("style");
            styleElement.textContent = requiredStyles;
            document.querySelector("head").insertAdjacentElement("beforeEnd", styleElement);
        }

        function calcColIndexes(table, cells) {
            //переданным ячейкам добавляется свойство colIndex, отражающее индексы их столбцов
            var tableClone = table.cloneNode(true);
            var filterCellClones = [];
            for (var i = 0; i < cells.length; i++) {
                var filterCell = cells[i];
                filterCellClones.push(tableClone.rows[filterCell.parentElement.rowIndex].cells[filterCell.cellIndex]);
            }
            var rows = tableClone.rows;
            for (var j = 0; j < rows.length; j++) {
                var row = tableClone.rows[j];
                for (var k = 0; k < row.cells.length; k++) {
                    var cell = row.cells[k];
                    var cellSpan = cell.colSpan;
                    cell.colSpan = 1;
                    for (var l = 1; l < cellSpan; l++) {
                        var cellClone = cell.cloneNode(true);
                        row.cells[k + l - 1].insertAdjacentElement("afterEnd", cellClone);
                    }
                }
                for (k = 0; k < row.cells.length; k++) {
                    var cell = row.cells[k];
                    var rowSpan = cell.rowSpan;
                    cell.rowSpan = 1;
                    for (var m = 1; m < rowSpan; m++) {
                        var cellClone = cell.cloneNode(true);
                        if (k == 0) {
                            rows[j + m].insertAdjacentElement("afterBegin", cellClone);
                        }
                        else {
                            rows[j + m].cells[k - 1].insertAdjacentElement("afterEnd", cellClone);
                        }
                    }
                }
            }
            for (i = 0; i < cells.length; i++) {
                cells[i].colIndex = filterCellClones[i].cellIndex;
            }
        }
        window.calcColIndexes = calcColIndexes; //debug

        function checkRowFilterability(row, startColIndex, endColIndex) {
            //корректно работает для строк, не содержащих вертикально объединённых ячеек
            var currentColIndex = 0;
            for (var i = 0; i < row.cells.length; i++) {
                var cell = row.cells[i];
                if (cell.colSpan > 1) {
                    var spanRightEdgeColIndex = currentColIndex + cell.colSpan - 1;
                    if (currentColIndex <= endColIndex && spanRightEdgeColIndex >= startColIndex) return false;
                }
                currentColIndex += cell.colSpan;
            }
            return true;
        }

        function getCellByColIndex(row, colIndex) {
            //корректно работает для строк, не содержащих вертикально объединённых ячеек
            var currentColIndex = 0;
            for (var i = 0; i < row.cells.length; i++) {
                var cell = row.cells[i];
                if (currentColIndex == colIndex) return cell;
                currentColIndex += cell.colSpan;
            }
        }

        function applyForCellsInCols(startCell, endCell, action) {
            //корректно работает для строк, не содержащих вертикально объединённых ячеек
            //из-за использования getCellByColIndex
            var errorCellName;
            if (!startCell.hasOwnProperty("colIndex")) errorCellName = "startCell";
            if (!endCell.hasOwnProperty("colIndex")) errorCellName = "endCell";
            if (errorCellName) {
                throw new Error("Parameter '" + errorCellName + "' references a cell without 'colIndex' property. Consider calling 'colCanFilter', 'colsAllCanFilter' or 'calcColIndexes' for it first. ")
            }
            var row = startCell.parentElement;
            for (var i = startCell.colIndex; i <= endCell.colIndex; i++) {
                var cell = getCellByColIndex(row, i);
                if (action(cell) === false) return false;
            }
            return true;
        }

    // /private methods

    // public methods

        // методы для вызова при показе содержимого

            function enableTableFiltering() {
                if (isFiltering) return;
                var allTables = document.querySelectorAll("table");
                for (var i = 0; i < allTables.length; i++) {
                    var table = allTables[i];
                    var filterRow = getFilterRow(table)
                    //предполагается, что фильтровальные ячейки будут в одной строке таблицы
                    if (!filterRow) continue; //если в таблице нет фильтровальных ячеек
                    percentizeTable(table);
                    var filterCells = filterRow.querySelectorAll("th." + CF_CLASS + ", td." + CF_CLASS);
                    calcColIndexes(table, filterCells);
                    for (var j = 0; j < filterCells.length; j++) {
                        cell = filterCells[j];
                        var filterInput = document.createElement("input");
                        filterInput.setAttribute("type", "text");
                        filterInput.addEventListener("input", onTableFilterInput);
                        filterCells[j].appendChild(filterInput);
                    }
                    addClass(filterRow, RF_CLASS);
                    addClass(table, TF_CLASS);
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
                    var filterRow = table.querySelector("tr." + RF_CLASS);
                    removeClass(filterRow, RF_CLASS);
                    var filterCells = filterRow.querySelectorAll("th." + CF_CLASS + ", td." + CF_CLASS);
                    for (var j = 0; j < filterCells.length; j++) {
                        filterCells[j].querySelector("input[type=text]").remove();
                    }
                    unfilterTable(table);
                    removeClass(table, TF_CLASS);
                }
                if (isSticky) {
                    disableTableSticking();
                    enableTableSticking();
                }
                isFiltering = false;
            }

            function enableTableSticking() {
                if (isSticky) return;
                var wrapper = document.createElement("div");
                wrapper.className = WRAPPER_CLASS;
                stickyTablesCache = [];
                var allTables = document.querySelectorAll("table");
                for (var i = 0; i < allTables.length; i++) {
                    var table = allTables[i];
                    var stickyRows = table.querySelectorAll("tr." + RS_CLASS + ", tr." + RF_CLASS);
                    if (stickyRows.length == 0) continue; //в таблице нет строк для закрепления
                    percentizeTable(table);
                    addClass(table, TS_CLASS);
                    var peer = table.cloneNode(true);
                    peer.style.display = "none";
                    wrapper.appendChild(peer);
                    table.peer = peer;
                    peer.peer = table;
                    var peerRowsToDelete = peer.querySelectorAll("tr:not(." + RF_CLASS + "):not(." + RS_CLASS + ")");
                    for (var j = 0; j < peerRowsToDelete.length; j++) {
                        peerRowsToDelete[j].remove();
                    }
                    stickyTablesCache.push(table);
                }
                window.addEventListener("scroll", onWindowScroll);
                wrapper.addEventListener("input", onStickyTableFilterInput);
                document.body.appendChild(wrapper);
                isSticky = true;
            }

            function disableTableSticking() {
                if (!isSticky) return;
                window.removeEventListener("scroll", onWindowScroll);
                document.querySelector("." + WRAPPER_CLASS).remove();
                stickyTablesCache = undefined;
                var stickyTables = document.querySelectorAll("table." + TS_CLASS);
                for (var i = 0; i < stickyTables.length; i++) {
                    var table = stickyTables[i];
                    removeClass(table, TS_CLASS);
                }
                isSticky = false;
            }

        // /методы для вызова при показе содержимого

        // методы для вызова плагином при редактировании содержимого

            function tableCanFilter(table) {
                //таблицу разрешено фильтровать, если все её незакреплённые строки не содержат
                //объединённых ячеек совсем или содержат, но они объединены только по горизонтали
                var nonStickyRows = table.querySelectorAll("tr:not(." + RS_CLASS + ")");
                for (var i = 0; i < nonStickyRows.length; i++) {
                    var cells = nonStickyRows[i].cells;
                    for (var j = 0; j < cells.length; j++) {
                        if (cells[j].rowSpan > 1) return false;
                    }
                }
                return true;
            }

            function getFilterRow(table) {
                //возвращает строку, содержащую первую ячейку с классом CF_CLASS, или null
                var firstFilteringCell = table.querySelector("th." + CF_CLASS + ", td." + CF_CLASS);
                if (firstFilteringCell) return firstFilteringCell.parentElement;
                return null;
            }

            function findCounterpart(row, originalCell) {
                //корректно работает для строк, не содержащих вертикально объединённых ячеек,
                //однако при выяснении возможности включения фильтров можно применять и при наличии
                //вертикально объединённых ячеек, поскольку последующие проверки нивелируют
                //возможные некорректности
                var table = row.closest("table");
                calcColIndexes(table, [originalCell]);
                var counterpart = getCellByColIndex(row, originalCell.colIndex);
                if (!counterpart){
                    //такая ситуация возможна как раз при наличии вертикально объединённых ячеек,
                    //и чтобы дальнейший код выяснении возможности включения фильтров не ломался,
                    //следует передать на выход хоть что-то
                    counterpart = row.cells[row.cells.length - 1];
                }
                return counterpart;
            }

            function colCanFilter(row, cell) {
                return colsAllCanFilter(row, cell, cell);
            }

            function colsAllCanFilter(filterRow, startCell, endCell) {
                //столбцы разрешено фильтровать, если разрешена фильтрация таблицы по признаку
                //исключительно горизонтальных объединений в незакреплённых строках
                var table = filterRow.closest("table");
                if (!tableCanFilter(table)) return false;
                //и если все ячейки незакреплённых строк и строки фильтра (которая может быть закреплена),
                //входящие в объединения, не относятся к проверяемым столбцам
                calcColIndexes(table, [startCell, endCell]);
                var nonStickyRows = table.querySelectorAll("tr:not(." + RS_CLASS + ")");
                if (!checkRowFilterability(filterRow, startCell.colIndex, endCell.colIndex)) return false;
                for (var i = 0; i < nonStickyRows.length; i++) {
                    var nonStickyRow = nonStickyRows[i];
                    if (nonStickyRow === filterRow) continue; //уже проверено
                    if (!checkRowFilterability(nonStickyRow, startCell.colIndex, endCell.colIndex)) return false;
                }
                return true;
            }

            function colHasFilter(cell) {
                return hasClass(cell, CF_CLASS);
            }

            function colsHasFilters(startCell, endCell) {
                //внимание: вызывать только после вызова colCanFilter или colsAllCanFilter
                return applyForCellsInCols(startCell, endCell, function (cell) {
                    return colHasFilter(cell);
                });
            }

            function enableFilterForCol(cell) {
                addClass(cell, CF_CLASS);
            }

            function enableFiltersForCols(startCell, endCell) {
                //внимание: вызывать только после вызова colCanFilter или colsAllCanFilter
                applyForCellsInCols(startCell, endCell, function (cell) {
                    enableFilterForCol(cell);
                });
            }

            function disableFilterForCol(cell) {
                removeClass(cell, CF_CLASS);
            }

            function disableFiltersForCols(startCell, endCell) {
                //внимание: вызывать только после вызова colCanFilter или colsAllCanFilter
                applyForCellsInCols(startCell, endCell, function (cell) {
                    disableFilterForCol(cell);
                });
            }

            function rowCanStick(row) {
                return rowsAllCanStick(row, row);
            }

            function rowsAllCanStick(startRow, endRow) {
                var table = startRow.closest("table");
                var colsNum = countTableCols(table);
                var firstRangeRowColsNum = countRowCols(startRow);
                if (firstRangeRowColsNum != colsNum) {
                    //если количества столбцов, вычисленные по первой строке таблицы и по первой
                    //строке диапазона, не совпадают, значит в первой строке диапазона есть 
                    //объединённые ячейки из более верхних строк, такие строки закреплять нельзя
                    return false;
                }
                var rows = table.rows;
                var rowsRangeHeight = 0;
                var process = false;
                for (var i = 0; i < rows.length; i++) { //TODO: такой цикл выделить в спецфункцию функции
                    var row = rows[i];
                    if (row === startRow) process = true;
                    if (process) rowsRangeHeight++;
                    if (row === endRow) break;
                }
                //вычислено rowsRangeHeight - высота запрошенного диапазона строк
                var maxRowSpanDepth = 0;
                var rowSpanDepthAcc;
                var rangeRowNum = 0;
                process = false;
                for (i = 0; i < rows.length; i++) {
                    row = rows[i];
                    if (row === startRow) process = true;
                    if (process) {
                        rowSpanDepthAcc = 0;
                        var cells = row.cells;
                        for (var j = 0; j < cells.length; j++) {
                            var cell = cells[j];
                            if (cell.rowSpan > rowSpanDepthAcc) rowSpanDepthAcc = cell.rowSpan;
                        }
                        var rowSpanDepth = rowSpanDepthAcc + rangeRowNum; //глубина объединённости ячеек по состоянию на текущую строку
                        if (rowSpanDepth > maxRowSpanDepth) maxRowSpanDepth = rowSpanDepth;
                        rangeRowNum++;
                    }
                    if (row === endRow) break;
                }
                //вычислено maxRowSpanDepth - максимальная глубина объединенности ячеек в диапазоне,
                //если она превышает высоту диапазона, такие строки закреплять нельзя
                return maxRowSpanDepth <= rowsRangeHeight;
            }

            function rowIsSticky(row) {
                return hasClass(row, RS_CLASS);
            }

            function rangeHasStickyRows(startRow, endRow) {
                if (startRow === endRow) {
                    return rowIsSticky(startRow);
                }
                var table = startRow.closest("table");
                var rows = table.rows;
                var process = false;
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    if (row === startRow) process = true;
                    if (process) {
                        if (rowIsSticky(row)) return true;
                    }
                    if (row === endRow) break;
                }
                return false;
            }

            function rangeIsAllSticky(startRow, endRow) {
                if (startRow === endRow) {
                    return rowIsSticky(startRow);
                }
                var table = startRow.closest("table");
                var rows = table.rows;
                var process = false;
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    if (row === startRow) process = true;
                    if (process) {
                        if (!rowIsSticky(row)) return false;
                    }
                    if (row === endRow) break;
                }
                return true;
            }

            function stickRow(row) {
                addClass(row, RS_CLASS);
            }

            function stickRows(startRow, endRow) {
                var table = startRow.closest("table");
                var rows = table.rows;
                var process = false;
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    if (row === startRow) process = true;
                    if (process) stickRow(row);
                    if (row === endRow) break;
                }
            }

            function unstickRow(row) {
                removeClass(row, RS_CLASS)
            }

            function unstickRows(startRow, endRow) {
                var table = startRow.closest("table");
                var rows = table.rows;
                var process = false;
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    if (row === startRow) process = true;
                    if (process) unstickRow(row);
                    if (row === endRow) break;
                }
            }

        // методы для вызова плагином при редактировании содержимого

    // /public methods

    injectRequiredStyles();

    var StickyFilter = {
        enableTableFiltering: enableTableFiltering,
        disableTableFiltering: disableTableFiltering,
        enableTableSticking: enableTableSticking,
        disableTableSticking: disableTableSticking,
        get isFiltering() {
            return isFiltering;
        },
        get isSticky() {
            return isSticky;
        },

        getFilterRow: getFilterRow,
        findCounterpart: findCounterpart,
        colCanFilter: colCanFilter,
        colsAllCanFilter: colsAllCanFilter,
        colHasFilter: colHasFilter,
        colsHasFilters: colsHasFilters,
        enableFilterForCol: enableFilterForCol,
        enableFiltersForCols: enableFiltersForCols,
        disableFilterForCol: disableFilterForCol,
        disableFiltersForCols: disableFiltersForCols,
        rowCanStick: rowCanStick,
        rowsAllCanStick: rowsAllCanStick,
        rowIsSticky: rowIsSticky,
        rangeHasStickyRows: rangeHasStickyRows,
        rangeIsAllSticky: rangeIsAllSticky,
        stickRow: stickRow,
        stickRows: stickRows,
        unstickRow: unstickRow,
        unstickRows: unstickRows,
    };

    return StickyFilter;
})();

}