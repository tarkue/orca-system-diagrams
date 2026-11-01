# Схемы системы для Orca

Native Orca plugin: six diagram views from one validated system model.

**v0.3.0** — нативная панель «Схемы системы»: C4, BPMN, EPC, Sequence, ER и State из одной модели. Есть JSON только для чтения и сворачиваемый инспектор со списком элементов и переходом к выбранному элементу. Агенты работают в штатном чате Orca.

[Сайт и SVG-примеры](https://tarkue.github.io/orca-system-diagrams/) · [Релизы](https://github.com/tarkue/orca-system-diagrams/releases) · [Установка](docs/INSTALL.md)

## Установка

В Orca откройте Settings → Plugins → Install plugin, выберите Git и вставьте:

~~~text
https://github.com/tarkue/orca-system-diagrams
~~~

Проверьте workspace:read и отсутствие фонового worker, включите плагин и откройте «Схемы системы» в боковой панели. Готовый bundle включён в репозиторий — npm для установки не нужен. [ZIP релиза](https://github.com/tarkue/orca-system-diagrams/releases/tag/v0.3.0) остаётся запасным способом. Подробности — в [инструкции](docs/INSTALL.md).

Проверенная версия: **Orca 1.4.218, Plugin API v1**. Совместимость с более новыми версиями не предполагается автоматически: [ограничения](docs/COMPATIBILITY.md).

## Работа

Выберите нотацию; используйте прокрутку, пресеты масштаба и кнопки −/+. Ctrl/Cmd + колесо меняет масштаб под указателем; двойной щелчок увеличивает, Shift + двойной щелчок уменьшает. В области диаграммы доступны клавиши `+`, `−`, `F` (вписать), `0` (100%). Отдельных кнопок Fit и 100% нет.

Панель показывает модель, включённую в пакет. Она не сканирует репозиторий и не переключает источник автоматически при смене активного проекта. Текущая модель описывает архитектуру самого расширения по исходникам; примеры — тестовые данные. Прямое сохранение диаграммы из панели недоступно в проверенном host: нет file-save API. Статические SVG-примеры доступны на сайте.

## Модель своего проекта

Нужны Node.js 22.12+ и npm:

```sh
git clone https://github.com/tarkue/orca-system-diagrams.git
cd orca-system-diagrams
npm ci
npm run build
```

Подключите `orca-plugin/package` как Development plugin folder в Settings → Plugins → Development. Попросите штатного агента исследовать исходники, изменить `orca-plugin/model.json` и выполнить конечную команду `npm run build`. Development watcher Orca перезагрузит изменившийся пакет. Для обычной установки из скопированной папки требуется повторная установка обновлённого пакета.

[Работа с агентом](docs/AGENT-WORKFLOW.md) · [Схема модели](docs/MODEL.md) · [Архитектура](docs/ARCHITECTURE.md) · [Нотации](docs/NOTATIONS.md) · [Участие в разработке](docs/CONTRIBUTING.md) · [Изменения](CHANGELOG.md)

## Лицензии

Оригинальный код — [MIT, tarkue, 2026](LICENSE). Зависимости сохраняют собственные лицензии: [third-party notices](https://github.com/tarkue/orca-system-diagrams/blob/main/THIRD_PARTY_NOTICES.md), включая обязательный видимый watermark bpmn.io. Независимый проект; официальная поддержка или одобрение Orca не заявляются.
