# Установка

Проверенный host: Orca1.4.218, Plugin API1. На более новых версиях нужна отдельная проверка совместимости.

## По Git URL — основной способ

1. Откройте Settings → Plugins → Install plugin в Orca и выберите установку из Git.
2. Вставьте ссылку:

   https://github.com/tarkue/orca-system-diagrams

3. Установите плагин, проверьте единственное разрешение workspace:read и отсутствие фонового worker, затем включите.
4. Откройте «Схемы системы» в правой боковой панели.

В корне репозитория лежит orca-plugin.json, ссылающийся на готовый plugin/panel.html. Orca клонирует репозиторий и использует собранный файл; запуск npm при установке не нужен. Для фиксации релиза host поддерживает Git reference:

https://github.com/tarkue/orca-system-diagrams#v0.3.0

Установка по Git и её обновление сохраняют встроенную проверку и согласование разрешений Orca.

## ZIP — запасной способ

Скачайте [релиз v0.3.0](https://github.com/tarkue/orca-system-diagrams/releases/tag/v0.3.0) или ZIP с [лендинга](https://tarkue.github.io/orca-system-diagrams/). Распакуйте архив. Через Settings → Plugins → Install plugin → Local folder выберите внутреннюю папку orca-system-diagrams, содержащую orca-plugin.json. Проверьте разрешения и включите плагин.

Рядом с ZIP опубликован файл .sha256. Проверяйте checksum скачанного архива перед установкой; внутри папки плагина есть SHA256SUMS для четырёх файлов.

## Модель своего проекта и живые обновления

Для разработки нужны Node.js22.12+ и npm:

~~~sh
git clone https://github.com/tarkue/orca-system-diagrams.git
cd orca-system-diagrams
npm ci
npm run build
~~~

Подключите orca-plugin/package в Settings → Plugins → Development → Development plugin folder path → Add path. Агент меняет orca-plugin/model.json и запускает npm run build. После успешной сборки development watcher Orca подхватывает новую панель.

Обычная Git/ZIP-установка — зафиксированный снимок. Она не следит за вашим рабочим JSON. Для обновления из исходников используйте development-папку или установите обновлённый пакет штатным способом.

Панель не сканирует репозиторий автоматически и не определяет другой файл при переключении workspace. Подробнее: [работа с агентом](AGENT-WORKFLOW.md), [модель](MODEL.md), [совместимость](COMPATIBILITY.md).

## Подготовка Git-установки для своего релиза

После изменений исходников выполните npm run prepare:git-install и закоммитьте обновлённые корневой manifest и plugin/. CI заново строит панель и проверяет, что committed bundle совпадает с исходниками. Не редактируйте собранный HTML вручную.
