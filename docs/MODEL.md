# SystemModel

Канонический источник — `orca-plugin/model.json`. Типы находятся в `src/core/model.ts`, фактические правила приёма — в `src/core/validation.ts`. Версия `model.version` — положительный номер редакции данных, отдельный от версии расширения.

## Поля

Все поля верхнего уровня обязательны.

| Поле | Структура и назначение |
| --- | --- |
| `id`, `name`, `description` | непустые строки: идентичность и описание системы |
| `version` | положительное целое |
| `nodes` | `{id,name,kind,description,technology}[]`; kind: `person`, `service`, `database`, `external` |
| `relations` | `{id,from,to,label}[]`, ссылки на nodes |
| `workflow.steps` | `{id,name,kind,actor?}[]`; kind: `start`, `task`, `decision`, `end`; actor ссылается на node |
| `workflow.edges` | `{id,from,to,label?,condition?}[]`, ссылки на steps |
| `entities` | `{id,name,fields:[{name,type,key?}]}[]`; key — boolean |
| `entityRelations` | `{from,to,label,cardinality?}[]`, ссылки на entities |
| `states` | `{id,name}[]` |
| `transitions` | `{from,to,label}[]`, ссылки на states |
| `rules` | `{approvalThreshold,currency,requireApproval}` — обязательные данные совместимости |
| `stack` | `{name,purpose}[]` |

У nodes, relations, steps, edges, entities и states ID уникальны внутри соответствующей коллекции. Сохраняйте их при переименовании: на них опираются связи и инспектор. `nodes`, `entities` и `states` должны быть непустыми; каждая сущность содержит хотя бы одно поле с уникальным именем. Обязательные строки непусты, включая description и technology: неизвестное значение обозначайте явно, без выдуманных фактов.

## Граф процесса

Требуется ровно один start и хотя бы один end. У end нет исходящих рёбер, у остальных шагов есть хотя бы одно. Все шаги достижимы от start; циклы не поддерживаются.

`condition` принимает `always`, `above_threshold`, `below_threshold`, `approved`, `rejected`; отсутствие равнозначно `always`. Исходящие условия не повторяются. `always` не сочетается с другими исходящими ветками; специальные ветки образуют ровно пару approved/rejected либо above_threshold/below_threshold. Эти ограничения валидатора действуют даже при использовании модели только для визуализации.

`rules.approvalThreshold` — конечное неотрицательное число, `currency` — непустая строка, `requireApproval` — boolean. Viewer не исполняет эти правила и не содержит финансового UI; поля сохраняются для совместимости и интерпретации существующей модели. Не удаляйте их при подготовке технической схемы. Например, совместимые нейтральные значения: `{"approvalThreshold":0,"currency":"N/A","requireApproval":false}`.

## Ограничения и происхождение

Входной JSON ограничен 512 KiB. Валидатор ограничивает строки 2000 символами, массивы 300 элементами, глубину 15 и число посещённых значений 20000. Некорректные ссылки, повторные ID и недопустимые enum-значения отклоняются. Сборка валидирует модель до замены панели и экранирует JSON для встраивания в HTML.

C4 использует nodes/relations; BPMN и EPC — workflow с actor; Sequence выводится из workflow и участников; ER — entities/entityRelations; State — states/transitions. Представления не добавляют отсутствующие технологии или протоколы. Нотации имеют собственные ограничения: [подробнее](NOTATIONS.md).

Схема описывает систему, но не доказывает её выполнение. Логические сущности могут описывать JSON и артефакты сборки, а не SQL-таблицы. Текущая модель расширения составлена по изученным исходникам вручную с помощью агента; автоматическое извлечение архитектуры не реализовано. [Процесс обновления](AGENT-WORKFLOW.md).
