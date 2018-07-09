# Плагин "tablestickyfilter" к CKEditor'у.

Позволяет закреплять в таблицах нужные строки, чтобы они оставались на экране при прокрутке страницы, а также включать для нужных ячеек нужной строки фильтрацию по содержимому.

Нужные файлы:

* ckeditor/plugins/tablestickyfilter/sticky-filter.js (ядро)
* ckeditor/plugins/tablestickyfilter/plugin.js (собственно, плагин)

Ядро следует подключать на странице показа контента. Пример применения см. в файле index.html.

Подключение плагина к редактору см. в файле ~~ckeditor/config.js~~ ckeditor/ckconfig.jsp (это пока тут лежал нормальный цкедитор, смотреть надо было туда, а теперь предлагается работать с лайфрейным, смотреть, соответственно, в другой файл).

Делалось в рамках [INGOSDEV-762](https://emdev-limited.atlassian.net/browse/INGOSDEV-762) и [INGOSDEV-763](https://emdev-limited.atlassian.net/browse/INGOSDEV-763).

31.05.2018 убрал из репозитория цкедитор. Предлагаю использовать для разработки цкедитор из репы liferay-base (хотя, там он тоже обычно является ссылкой на цкедитор в репе knowledge-base):

    mklink /j ckeditor ..\liferay-base\liferay-6-ui-stuff\ROOT\html\js\editor\ckeditor45

Решил пока не выкашивать ИДы из копируемых в закреплённую область таблиц: во-первых, их обычно нету, во-вторых, Надя любит делать селекторы с ИДами, в таком случае собьются стили таблиц при копировании.
