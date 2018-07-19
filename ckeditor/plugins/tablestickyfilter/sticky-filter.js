//закрепление следует использовать с таблицами без внешних границ

if (window.StickyFilter === undefined) {

window.StickyFilter = (function () {

    //#region Constants

    var TP_CLASS = "table-prcnt"; //CSS-класс, назначаемый "процентизованным" таблицам
    var TF_CLASS = "table-filter"; //CSS-класс, назначаемый таблицам с фильтром при включении фильтрования
    var RF_CLASS = "row-filter"; //CSS-класс, назначаемый строкам с фильтром при включении фильтрования
    var CF_CLASS = "column-filter"; //CSS-класс ячеек, используемый как признак возможности фильтрации по столбцам, содержащим эти ячейки
    var TS_CLASS = "table-sticky"; //CSS-класс, назначаемый таблицам с закреплёнными строками при включении закрепления
    var RS_CLASS = "row-sticky"; //CSS-класс строк, используемый как признак их закрепляемости
    var WRAPPER_CLASS = "sticky-wrapper"; //CSS-класс обёртки закреплённых таблиц

    //#endregion

    var stickyTablesCache;
    var ceiling; //отступ в пикселях от верхней границы окна для закрепленных строк
    var isFiltering = false;
    var isSticky = false;

    //#region Несколько псевдополифиллов

    var nativeMatchesFunc = Element.prototype.matches ||
        Element.prototype.matchesSelector ||
        Element.prototype.webkitMatchesSelector ||
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector;
    function elementMatches(element, selector) {
        return nativeMatchesFunc.call(element, selector);
    }

    var closestAncestor = Element.prototype.closest ?
            function (element, selector) {
                return element.closest(selector);
            } :
            function (element, selector) {
                while (element) {
                    if (elementMatches(element, selector)) return element;
                    else element = element.parentElement;
                }
                return null;
            };

    var removeElement = Element.prototype.remove ?
            function (element) {
                element.remove();
            } :
            function (element) {
                element.parentElement.removeChild(element);
            };

    //задействован подход jquery
    function isVisible(element) {
        return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
    }

    //#endregion

    //#region Private methods

    //обеспечивает успех только при расположении ячеек в одной строке
    function ensureCellsInOneRow(cell0, cell1) {
        if (cell0.parentElement != cell1.parentElement) {
            throw new Error("The cells specified do not reside in one row");
        }
    }

    //обрабатывает ввод в фильтрах таблиц
    function onTableFilterInput(e) {
        var peerInput = findPeerInput(e.target);
        if (peerInput) {
            peerInput.value = e.target.value;
        }
        filterTable(closestAncestor(e.target, "table"));
    }

    //обрабатывает ввод в фильтрах плавающих копий таблиц
    function onStickyTableFilterInput(e) {
        if (!elementMatches(e.target, "." + CF_CLASS + " input[type=text]")) return;
        var peerInput = findPeerInput(e.target);
        peerInput.value = e.target.value;
        var event = document.createEvent("Event");
        event.initEvent("input", true, true);
        peerInput.dispatchEvent(event);
    }

    //находит для поля ввода фильтра таблицы соответствующее поле в плавающей таблице и наоборот
    function findPeerInput(origInput) {
        var num;
        var origTable = closestAncestor(origInput, "table");
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

    //применяет фильтры к содержимому таблицы
    function filterTable(table) {
        var filterRow = table.querySelector("tr." + RF_CLASS);
        var rows = table.querySelectorAll("tr:not(." + RF_CLASS + "):not(." + RS_CLASS + ")");
        if (!filterRow || rows.length == 0) return;
        var filterValues = {};
        var filterCells = filterRow.querySelectorAll("th." + CF_CLASS + ", td." + CF_CLASS);
        for (var i = 0; i < filterCells.length; i++) {
            var filterCell = filterCells[i];
            if (!filterCell.hasOwnProperty("colIndex")) {
                throw new Error("Cell doesn't have a 'colIndex' property. Consider calling 'calcColIndexes' for it first.")
            }
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

    //отменяет действие фильтров на таблицу
    function unfilterTable(table) {
        var rows = table.querySelectorAll("tr:not(." + RF_CLASS + "):not(." + RS_CLASS + ")");
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            row.style.display = "table-row";
        }
    }

    //обрабатывает прокрутку окна браузера
    function onWindowScroll(e) {
        for (var i = 0; i < stickyTablesCache.length; i++) {
            var table = stickyTablesCache[i];
            var tableRect = table.getBoundingClientRect();
            var peer = table.peer;
            if (tableRect.top > ceiling || tableRect.bottom <= ceiling) {
                peer.style.display = "none";
                continue;
            }
            peer.style.left = tableRect.left + "px";
            peer.style.width = table.offsetWidth + "px";
            peer.style.visibility = "hidden";
            peer.style.display = "table";
            var caption = table.querySelector("caption");
            var captionHeight = caption ? caption.offsetHeight : 0;
            var peerRows = peer.rows;
            var peerRosHeights = [];
            for (var j = 0; j < peerRows.length; j++) {
                peerRows[j].style.display = "table-row";
                peerRosHeights[j] = peerRows[j].offsetHeight;
                peerRows[j].style.display = "none";
            }
            peer.style.visibility = "visible";

            var stickyRows = table.querySelectorAll("tr." + RS_CLASS + ", tr." + RF_CLASS);
            var acc = ceiling + captionHeight;
            for (var k = 0; k < stickyRows.length; k++) {
                var stickyRow = stickyRows[k];
                var rowRect = stickyRow.getBoundingClientRect();
                if (rowRect.top < acc) {
                    peerRows[k].style.display = "table-row";
                    acc += peerRosHeights[k];
                }
            }
            var diff = tableRect.bottom - ceiling - peer.offsetHeight;
            if (diff < 0) {
                peer.style.top = ceiling + diff + "px";
            }
            else {
                peer.style.top = ceiling + "px";
            }
        }
    }

    //хранит коллекцию элементов и изначальные значения их стилевых свойств display, используются в целях оптимизации
    //по скорости многократных процентизаций таблиц
    var displaysChain;

    //восстанавливает стилевые свойства display элементов, затронутых при процентизации таблиц, эту функцию
    //следует обязательно вызывать после завершения процентизации таблиц, использует переменную displaysChain
    function revertDisplays() {
        for (var i in displaysChain) {
            var entry = displaysChain[i];
            var element = entry[0];
            element.style.setProperty("display", entry[1], entry[2]);
            if (element.style.getPropertyPriority("display") !== entry[2]) {
                //Эта ситуация возможна в IE, потому что IE отказывается менять значение свойства, когда текущее
                //значение имеет повышенный приоритет (а при выполнении данной функции это всегда так, поскольку в
                //функции glance приоритет временного стиля видимости намеренно делается повышенным). Для обхода
                //этой проблемы производится повторная установка прежнего значение свойства, но с явным указанием
                //повышенного приоритета. Следует оговориться, что в некоторых случаях это может вызвать не совсем
                //корректное отображение затронутых элементов, тогда следует скорректировать стили этих элементов
                //на уровне темы.
                element.style.setProperty("display", entry[1], "important");
            }
        }
        displaysChain = undefined;
    }

    //делает элемент видимым с учётом родительских узлов, сохраняя затронутые элементы и их свойства display
    //в коллекции displaysChain, для простоты предполагается, что невидимые контейнеры блочного типа
    function glance(element) {
        if (isVisible(element)) return;
        if (!displaysChain) {
            displaysChain = [];
        }
        do {
            displaysChain.push([element,
                    element.style.getPropertyValue("display"),
                    element.style.getPropertyPriority("display")]);
            //значение устанавливается с повышенным приоритетом в связи с тем, что часто контролы типа
            //коллапсов, табов также повышают приоритет в своих правилах
            element.style.setProperty("display", "block", "important");
            element = element.parentElement;
        } while (!isVisible(element));
    }

    //преобразовывает ширины столбцов таблицы в процентные значения, после применения для группы таблиц
    //следует вызвать функцию revertDisplays
    function percentizeTable(table) {
        if (hasClass(table, TP_CLASS)) return;
        glance(table);
        var tableWidth = table.rows[0].offsetWidth; //ширина таблицы определяется по первой строке
        //определение текущих ширин столбцов
        var colQty = countTableCols(table);
        var colsCalculated = 0;
        var colWidths = []; //массив ширин столбцов
        for (var i = 0; i < table.rows.length; i++) {
            var row = table.rows[i];
            for (var j = 0, colNum = 0; j < row.cells.length; j++) {
                if (colWidths[colNum] !== undefined) continue;
                var cell = row.cells[j];
                if (cell.colSpan > 1) {
                    colNum += cell.colSpan;
                    continue;
                }
                colWidths[colNum] = cell.offsetWidth;
                colsCalculated++;
                if (colsCalculated == colQty) break;
                colNum += cell.colSpan;
            }
            if (colsCalculated == colQty) break;
        }
        if (colsCalculated != colQty) {
            //в таблице есть столбцы, для которых не удалось вычислить ширину, потому что
            //все входящие в них ячейки содержат объединения по горизонтали в этом случае
            //для простоты им поровну распределяется пространство, оставшееся от вычисленных
            //солбцов
            var calculatedColsWidth = 0; //общая ширина вычисленных столбцов
            for (j = 0; j < colQty; j++) {
                var colWidth = colWidths[j];
                if (colWidth !== undefined) calculatedColsWidth += colWidth;
            }
            var uncalculatedColWidth = (tableWidth - calculatedColsWidth) / (colQty - colsCalculated);
            for (j = 0; j < colQty; j++) {
                if (colWidths[j] === undefined) colWidths[j] = uncalculatedColWidth;
            }
        }
        //текущие ширине столбцов определены
        //удаление имеющихся элементов colgroup
        var colgroups = table.querySelectorAll("colgroup");
        for (var j = 0; j < colgroups.length; j++) {
            removeElement(colgroups[j]);
        }
        //создание новой группы столбцов с заданием процентных ширин
        var colgroup = document.createElement("colgroup");
        for (j = 0; j < colQty; j++) {
            var col = document.createElement("col");
            col.style.width = (colWidths[j] / tableWidth * 100) + "%";
            colgroup.appendChild(col);
        }
        table.insertBefore(colgroup, table.firstChild);
        table.style.tableLayout = "fixed";
        addClass(table, TP_CLASS);
    }

    //подсчитывает столбцы строки
    function countRowCols(row) {
        var cells = row.cells;
        var colsQty = 0;
        for (var i = 0; i < cells.length; i++) {
            colsQty += cells[i].colSpan;
        }
        return colsQty;
    }

    //подсчитывает столбцы таблицы
    function countTableCols(table) {
        return countRowCols(table.rows[0]);
    }

    //проверяет, имеет ли элемент указанный CSS-класс
    function hasClass(element, cssClass) {
        return new RegExp("\\b" + cssClass + "\\b").test(element.className);
    }

    //добавляет CSS-класс элементу
    function addClass(element, cssClass) {
        if (hasClass(element, cssClass)) return;
        var oldClasses = element.className;
        if (hasClass(element, cssClass)) return;
        var newClasses = oldClasses;
        if (/\S$/.test(oldClasses)) newClasses += " ";
        newClasses += cssClass;
        element.className = newClasses;
    }

    //удаляет CSS-класс у элемента
    function removeClass(element, cssClass) {
        if (!hasClass(element, cssClass)) return;
        var oldClasses = element.className;
        var newClasses = oldClasses;
        newClasses = oldClasses.replace(new RegExp("\\b\\s*" + cssClass + "\\b", "g"), "");
        if (/^\s*$/.test(newClasses)) element.removeAttribute("class");
        else element.className = newClasses;
    }

    //внедряет стили, требуемые для фильтрации и закрепления
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

    //разбивает в таблице все объединённые ячейки, добавленным ячейкам добавляется
    //свойство isPhantom, равное true
    function atomizeTable(table) {
        var rows = table.rows;
        for (var i = 0; i < rows.length; i++) {
            var row = table.rows[i];
            //обработка вертикальных объединений
            for (var j = 0; j < row.cells.length; j++) {
                var cell = row.cells[j];
                var cellSpan = cell.colSpan; //значение colSpan пока совпадает с ним же ячейки исходной таблицы
                cell.colSpan = 1; //отныне ячейка таблицы-клона занимает одну строку и будет клонирована нужное число раз
                for (var l = 1; l < cellSpan; l++) {
                    var cellClone = cell.cloneNode(true);
                    cellClone.isPhantom = true;
                    row.cells[j + l - 1].insertAdjacentElement("afterEnd", cellClone);
                }
            }
            //обработка горизонтальных объединений
            for (j = 0; j < row.cells.length; j++) {
                var cell = row.cells[j];
                var rowSpan = cell.rowSpan; //значение rowSpan пока совпадает с ним же ячейки исходной таблицы
                cell.rowSpan = 1; //отныне ячейка таблицы-клона занимает один столбец и будет клонирована нужное число раз
                for (var k = 1; k < rowSpan; k++) {
                    var cellClone = cell.cloneNode(true);
                    cellClone.isPhantom = true;
                    if (j == 0) {
                        rows[i + k].insertAdjacentElement("afterBegin", cellClone);
                    }
                    else {
                        rows[i + k].cells[j - 1].insertAdjacentElement("afterEnd", cellClone);
                    }
                }
            }
        }
    }

    //определяет индексы столбцов таблицы, к которым относятся указанные ячейки,
    //и добавляет этим ячейкам свойство, содержащее этот индекс
    function calcColIndexes(table, cells) {
        var tableClone = table.cloneNode(true);
        var filterCellClones = []; //массив ссылок на клоны запрошенных ячеек
        for (var i = 0; i < cells.length; i++) {
            var filterCell = cells[i];
            filterCellClones.push(tableClone.rows[filterCell.parentElement.rowIndex].cells[filterCell.cellIndex]);
        }
        atomizeTable(tableClone);
        for (i = 0; i < cells.length; i++) {
            cells[i].colIndex = filterCellClones[i].cellIndex;
        }
    }

    //проверяет доступность фильтрации для указанной строки и диапазона столбцов;
    //корректно работает для строк, не содержащих вертикально объединённых ячеек
    function checkRowFilterability(row, startColIndex, endColIndex) {
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

    //возвращяет ячейку строки по индексу столбца; корректно работает для строк,
    //не содержащих вертикально объединённых ячеек
    function getCellByColIndex(row, colIndex) {
        var currentColIndex = 0;
        for (var i = 0; i < row.cells.length; i++) {
            var cell = row.cells[i];
            if (currentColIndex == colIndex) return cell;
            currentColIndex += cell.colSpan;
        }
    }

    //применяет действие к диапазону ячеек _одной строки_, возвращает true, если все
    //вызовы функции действия вернули true; прекращает применение действия к ячейкам,
    //если функция действия вернёт false, сама функция при этом также вернёт false
    function applyForCellsInCols(startCell, endCell, action) {
        ensureCellsInOneRow(startCell, endCell);
        if (typeof(action) != "function") return false;
        var cells = startCell.parentElement.cells;
        for (var i = startCell.cellIndex; i <= endCell.cellIndex; i++) {
            var cell = cells[i];
            if (action(cell) === false) return false;
        }
        return true;
    }

    //применяет действие к диапазону строк, возвращает true, если все вызовы функции действия
    //вернули true; прекращает применение действия к строкам, если функция действия вернёт false,
    //сама функция при этом также вернёт false
    function applyForRows(startRow, endRow, action) {
        if (typeof(action) != "function") return false;
        var tableElement = startRow.parentElement;
        if (tableElement.tagName === "TBODY") {
            tableElement = tableElement.parentElement;
        }
        var rows = tableElement.rows;
        for (var i = startRow.rowIndex; i <= endRow.rowIndex; i++) {
            var row = rows[i];
            if (action(row) === false) return false;
        }
        return true;
    }

    //убирает из таблицы все некорректные закреплённые строки, возвращает true,
    //если были изменения таблицы
    function sanitizeTableStickiness(table) {
        var result = false;
        var rows = table.rows;
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (!rowIsSticky(row)) continue;
            var startRow = row;
            var endRow = null;
            for (i++; i < rows.length; i++) {
                var siblingRow = rows[i];
                if (!rowIsSticky(siblingRow)) break;
                endRow = siblingRow;
            }
            if (!endRow) {
                endRow = startRow;
            }
            while (!rowsAllCanStick(startRow, endRow)) {
                unstickRow(endRow);
                result = true;
                if (startRow === endRow) break;
                endRow = endRow.previousElementSibling;
            }
        }
        return result;
    }

    //убирает из таблицы все некорректные фильтры, возвращает true,
    //если были изменения таблицы
    function sanitizeTableFiltering(table) {
        var result = false;
        var filterRow = getFilterRow(table);
        if (filterRow) {
            var filterCells = filterRow.querySelectorAll("th." + CF_CLASS + ", td." + CF_CLASS);
            for (var k = 0; k < filterCells.length; k++) {
                var cell = filterCells[k];
                if (!colCanFilter(cell)) {
                    disableFilterForCol(cell);
                    result = true;
                }
            }
        }
        return result;
    }

    //#endregion

    //#region Public methods

    //#region Методы для вызова при показе содержимого

    /** Включает фильтрование в таблицах на странице. */
    function enableTableFiltering() {
        if (isFiltering) return;
        var allTables = document.querySelectorAll("table");
        for (var i = 0; i < allTables.length; i++) {
            var table = allTables[i];
            var filterRow = getFilterRow(table)
            //предполагается, что фильтровальные ячейки будут в одной строке таблицы
            if (!filterRow) continue; //если в таблице нет фильтровальных ячеек
            var filterCells = filterRow.querySelectorAll("th." + CF_CLASS + ", td." + CF_CLASS);
            calcColIndexes(table, filterCells);
            for (var j = 0; j < filterCells.length; j++) {
                var filterInput = document.createElement("input");
                filterInput.setAttribute("type", "text");
                filterInput.addEventListener("input", onTableFilterInput);
                filterCells[j].appendChild(filterInput);
            }
            addClass(filterRow, RF_CLASS);
            addClass(table, TF_CLASS);
            percentizeTable(table); //после добавления классов, для которых могут иметься стили, влияющие на ширину
        }
        revertDisplays();
        if (isSticky) {
            disableTableSticking();
            enableTableSticking(ceiling);
        }
        isFiltering = true;
    }

    /** Выключает фильтрование в таблицах на странице. */
    function disableTableFiltering() {
        if (!isFiltering) return;
        var filteredTables = document.querySelectorAll("table." + TF_CLASS);
        for (var i = 0; i < filteredTables.length; i++) {
            var table = filteredTables[i];
            var filterRow = table.querySelector("tr." + RF_CLASS);
            removeClass(filterRow, RF_CLASS);
            var filterCells = filterRow.querySelectorAll("th." + CF_CLASS + ", td." + CF_CLASS);
            for (var j = 0; j < filterCells.length; j++) {
                removeElement(filterCells[j].querySelector("input[type=text]"));
            }
            unfilterTable(table);
            removeClass(table, TF_CLASS);
        }
        if (isSticky) {
            disableTableSticking();
            enableTableSticking(ceiling);
        }
        isFiltering = false;
    }

    /** Включает закрепление строк в таблицах на странице. */
    function enableTableSticking(gap) {
        if (isSticky) return;
        var wrapper = document.createElement("div");
        wrapper.className = WRAPPER_CLASS;
        ceiling = parseInt(gap);
        if (isNaN(ceiling)) {
            ceiling = 0;
        }
        stickyTablesCache = [];
        var allTables = document.querySelectorAll("table");
        for (var i = 0; i < allTables.length; i++) {
            var table = allTables[i];
            var stickyRows = table.querySelectorAll("tr." + RS_CLASS + ", tr." + RF_CLASS);
            if (stickyRows.length == 0) continue; //в таблице нет строк для закрепления
            addClass(table, TS_CLASS);
            percentizeTable(table); //после добавления классов, для которых могут иметься стили, влияющие на ширину
            var peer = table.cloneNode(true);
            peer.style.display = "none";
            wrapper.appendChild(peer);
            table.peer = peer;
            peer.peer = table;
            var peerRowsToDelete = peer.querySelectorAll("tr:not(." + RF_CLASS + "):not(." + RS_CLASS + ")");
            for (var j = 0; j < peerRowsToDelete.length; j++) {
                removeElement(peerRowsToDelete[j]);
            }
            stickyTablesCache.push(table);
        }
        revertDisplays();
        window.addEventListener("scroll", onWindowScroll);
        wrapper.addEventListener("input", onStickyTableFilterInput);
        document.body.appendChild(wrapper);
        isSticky = true;
        onWindowScroll();
    }

    /** Выключает закрепление строк в таблицах на странице. */
    function disableTableSticking() {
        if (!isSticky) return;
        window.removeEventListener("scroll", onWindowScroll);
        removeElement(document.querySelector("." + WRAPPER_CLASS));
        stickyTablesCache = undefined;
        var stickyTables = document.querySelectorAll("table." + TS_CLASS);
        for (var i = 0; i < stickyTables.length; i++) {
            var table = stickyTables[i];
            removeClass(table, TS_CLASS);
        }
        isSticky = false;
    }

    //#endregion

    //#region Методы для вызова плагином при редактировании содержимого

    /**
     * Проверяет доступно ли добавление фмльтров в таблицу.
     * @returns {Bool}
     */
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

    /** Возвращает первую строку таблицы с фильтровальными ячейками или null. */
    function getFilterRow(table) {
        //возвращает строку, содержащую первую ячейку с классом CF_CLASS, или null
        var firstFilteringCell = table.querySelector("th." + CF_CLASS + ", td." + CF_CLASS);
        if (firstFilteringCell) return firstFilteringCell.parentElement;
        return null;
    }

    /**
     * Находит в указанной строке ячейку, соответствующую по индексу столбца
     * указанной ячейке, возвращает null при неудаче.
     */
    function findCounterpart(row, originalCell) {
        var table = closestAncestor(row, "table");
        var tableClone = table.cloneNode(true);
        for (var i = 0; i < table.rows.length; i++) {
            var _row = table.rows[i];
            for (var j = 0; j < _row.cells.length; j++) {
                var cell = _row.cells[j];
                var cellClone = tableClone.rows[cell.parentElement.rowIndex].cells[cell.cellIndex];
                cellClone.original = cell;
            }
        }
        //ссылка на клон запрошенной ячейки
        var originalCellClone = tableClone.rows[originalCell.parentElement.rowIndex].cells[originalCell.cellIndex];
        atomizeTable(tableClone);
        var counterpartClone = tableClone.rows[row.rowIndex].cells[originalCellClone.cellIndex];
        return counterpartClone.isPhantom ? null : counterpartClone.original;
    }

    /**
     * Проверяет, доступно ли добавление фильтра в указанную ячейку.
     * @returns {Bool}
     */
    function colCanFilter(cell) {
        return colsAllCanFilter(cell, cell);
    }

    /**
     * Проверяет, доступно ли добавление фильтров в указанные ячейки.
     * Ячейки должны входить в одну строку.
     * @returns {Bool}
     */
    function colsAllCanFilter(startCell, endCell) {
        ensureCellsInOneRow(startCell, endCell);
        //столбцы разрешено фильтровать, если разрешена фильтрация таблицы по признаку
        //исключительно горизонтальных объединений в незакреплённых строках...
        var table = closestAncestor(startCell, "table");
        if (!tableCanFilter(table)) return false;
        //...и если все ячейки незакреплённых строк и строки фильтра (которая может быть закреплена),
        //входящие в объединения (горизонтальные, естественно), не относятся к проверяемым столбцам
        //
        //перед вызовом checkRowFilterability нужно проиндексировать столбцы, чтобы получить
        //индексы столбцов, соответствующих ячейкам; используется такая сложная функция, как
        //calcColIndexes, потому что фильтр может включаться в закрепленных строках, а тогда
        //среди ячеек нужной строки вполне могут оказаться объединённые по вертикали и определить
        //индексы столбцов без проверки почти всей таблицы затруднительно
        calcColIndexes(table, [startCell, endCell]);
        var filterRow = startCell.parentElement;
        if (!checkRowFilterability(filterRow, startCell.colIndex, endCell.colIndex)) return false;
        var nonStickyRows = table.querySelectorAll("tr:not(." + RS_CLASS + ")");
        for (var i = 0; i < nonStickyRows.length; i++) {
            var nonStickyRow = nonStickyRows[i];
            if (nonStickyRow === filterRow) continue; //уже проверено
            if (!checkRowFilterability(nonStickyRow, startCell.colIndex, endCell.colIndex)) return false;
        }
        return true;
    }

    /**
     * Проверяет, добавлен ли фильтр в указанную ячейку.
     * @returns {Bool}
     */
    function colHasFilter(cell) {
        return hasClass(cell, CF_CLASS);
    }

    /**
     * Проверяет, добавлены ли фильтры во все ячейки указанного диапазона.
     * @returns {Bool}
     */
    function colsHasFilters(startCell, endCell) {
        return applyForCellsInCols(startCell, endCell, function (cell) {
            return colHasFilter(cell);
        });
    }

    /** Добавляет фильтр в указанную ячейку. */
    function enableFilterForCol(cell) {
        addClass(cell, CF_CLASS);
    }

    /** Добавляет фильтры во все ячейки указанного диапазона. */
    function enableFiltersForCols(startCell, endCell) {
        applyForCellsInCols(startCell, endCell, function (cell) {
            enableFilterForCol(cell);
        });
    }

    /** Убирает фильтр из указанной ячейки. */
    function disableFilterForCol(cell) {
        removeClass(cell, CF_CLASS);
    }

    /** Убирает фильтры из всех ячеек указанного диапазона. */
    function disableFiltersForCols(startCell, endCell) {
        applyForCellsInCols(startCell, endCell, function (cell) {
            disableFilterForCol(cell);
        });
    }

    /**
     * Проверяет, можно ли закреплять указанную строку.
     * @returns {Bool}
     */
    function rowCanStick(row) {
        return rowsAllCanStick(row, row);
    }

    /**
     * Проверяет, можно ли закреплять все строки в указанном диапазоне.
     * @returns {Bool}
     */
    function rowsAllCanStick(startRow, endRow) {
        var table = closestAncestor(startRow, "table");
        var colsQty = countTableCols(table);
        var firstRangeRowColsQty = countRowCols(startRow);
        if (firstRangeRowColsQty != colsQty) {
            //если количества столбцов, вычисленные по первой строке таблицы и по первой
            //строке диапазона, не совпадают, значит в первой строке диапазона есть
            //объединённые ячейки из более верхних строк, такие строки закреплять нельзя
            return false;
        }
        var rowsRangeHeight = endRow.rowIndex - startRow.rowIndex + 1; //высота запрошенного диапазона строк
        var maxRowSpanDepth = 0;
        var rowSpanDepthAcc;
        var rangeRowQty = 0;
        applyForRows(startRow, endRow, function (row) {
            rowSpanDepthAcc = 0;
            var cells = row.cells;
            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                if (cell.rowSpan > rowSpanDepthAcc) rowSpanDepthAcc = cell.rowSpan;
            }
            var rowSpanDepth = rowSpanDepthAcc + rangeRowQty; //глубина объединённости ячеек по состоянию на текущую строку
            if (rowSpanDepth > maxRowSpanDepth) maxRowSpanDepth = rowSpanDepth;
            rangeRowQty++;
        });
        //вычислено maxRowSpanDepth - максимальная глубина объединенности ячеек в диапазоне,
        //если она превышает высоту диапазона, такие строки закреплять нельзя
        return maxRowSpanDepth <= rowsRangeHeight;
    }

    /**
     * Проверяет, закреплена ли указанная строка.
     * @returns {Bool}
     */
    function rowIsSticky(row) {
        return hasClass(row, RS_CLASS);
    }

    /**
     * Проверяет, есть ли в указанном диапазоне закреплённые строки.
     * @returns {Bool}
     */
    function rangeHasStickyRows(startRow, endRow) {
        if (startRow === endRow) {
            return rowIsSticky(startRow);
        }
        return !applyForRows(startRow, endRow, function (row) {
            return !rowIsSticky(row);
        });
    }

    /**
     * Проверяет, все ли строки указанного диапазона закреплены.
     * @returns {Bool}
     */
    function rangeIsAllSticky(startRow, endRow) {
        if (startRow === endRow) {
            return rowIsSticky(startRow);
        }
        return applyForRows(startRow, endRow, function (row) {
            return rowIsSticky(row);
        });
    }

    /** Закрепляет строку. */
    function stickRow(row) {
        addClass(row, RS_CLASS);
    }

    /** Закрепляет строки указанного диапазона. */
    function stickRows(startRow, endRow) {
        applyForRows(startRow, endRow, function (row) {
            stickRow(row);
        });
    }

    /** Открепляет строку. */
    function unstickRow(row, sanitizeFiltering) {
        removeClass(row, RS_CLASS);
        if (sanitizeFiltering !== undefined && sanitizeFiltering) sanitizeTableFiltering(closestAncestor(row, "table"));
    }

    /** Открепляет строки указанного диапазона. */
    function unstickRows(startRow, endRow, sanitizeFiltering) {
        applyForRows(startRow, endRow, function (row) {
            unstickRow(row, false);
        });
        if (sanitizeFiltering !== undefined && sanitizeFiltering) sanitizeTableFiltering(closestAncestor(startRow, "table"));
    }

    /**
     * Корректирует в таблице закреплённые строки и фильтры. Следует вызывать для того, чтобы
     * таблица, которая подверглась произвольным изменениям, имела только корректные фильтры
     * и закреплённые строки. Возвращает true, если были изменения таблицы.
     * @returns {Bool}
     */
    function sanitizeTable(table) {
        //проверки следует проводить именно в таком порядке, потому что
        //изменения в закреплении могут потребовать изменений в фильтрации
        return sanitizeTableStickiness(table) | sanitizeTableFiltering(table);
    }

    //#endregion

    //#endregion

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
        sanitizeTable: sanitizeTable
    };

    return StickyFilter;
})();

}
