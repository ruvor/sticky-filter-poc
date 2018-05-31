# Плагин "tablestickyfilter" к CKEditor'у.

Позволяет закреплять в таблицах нужные строки, чтобы они оставались на экране при прокрутке страницы, а также включать для нужных ячеек нужной строки фильтрацию по содержимому.

Нужные файлы:

* ckeditor/plugins/tablestickyfilter/sticky-filter.js (ядро)
* ckeditor/plugins/tablestickyfilter/plugin.js (собственно, плагин)

Ядро следует подключать на странице показа контента. Пример применения см. в файле index.html.

Подключение плагина к редактору см. в файле ckeditor/config.js.

Делалось в рамках [INGOSDEV-762](https://emdev-limited.atlassian.net/browse/INGOSDEV-762) и [INGOSDEV-763](https://emdev-limited.atlassian.net/browse/INGOSDEV-763).

31.05.2018 убрал из репозитория цкедитор. Предлагаю использовать для разработки цкедитор из репы liferay-base (хотя, там он тоже обычно является ссылкой на цкедитор в репе knowledge-base):

    mklink /j ckeditor ..\liferay-base\liferay-6-ui-stuff\ROOT\html\js\editor\ckeditor45
