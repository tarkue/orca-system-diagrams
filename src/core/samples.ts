import type { SystemModel } from "./model";
interface Domain {
  id: string;
  name: string;
  description: string;
  person: string;
  reviewer: string;
  api: string;
  external: string;
  technology: string;
  threshold: number;
  currency: string;
  steps: string[];
  entities: { name: string; fields: string[] }[];
}
const domains: Domain[] = [
  {
    id: "refunds",
    name: "Возвраты заказов",
    description:
      "Покупатель запрашивает возврат заказа; финансовый менеджер согласует крупную сумму, платёжный шлюз возвращает деньги.",
    person: "Покупатель",
    reviewer: "Финансовый менеджер",
    api: "Сервис возвратов",
    external: "Платёжный шлюз",
    technology: "TypeScript / Fastify",
    threshold: 10000,
    currency: "RUB",
    steps: [
      "Заявка на возврат",
      "Проверить заказ и срок возврата",
      "Сумма требует согласования?",
      "Согласовать возврат",
      "Вернуть платёж",
      "Отклонить возврат",
      "Деньги возвращены",
      "Возврат отклонён",
    ],
    entities: [
      {
        name: "Заказ",
        fields: ["order_id", "customer_id", "total", "paid_at"],
      },
      {
        name: "Возврат",
        fields: ["refund_id", "order_id", "amount", "reason", "status"],
      },
      {
        name: "Платёж",
        fields: ["payment_id", "refund_id", "gateway_reference", "settled_at"],
      },
    ],
  },
  {
    id: "support",
    name: "Эскалация поддержки",
    description:
      "Обращение классифицируется по стоимости влияния; руководитель разрешает дорогую эскалацию, инженер устраняет инцидент.",
    person: "Клиент",
    reviewer: "Руководитель поддержки",
    api: "Маршрутизатор обращений",
    external: "Дежурная инженерная команда",
    technology: "Python / FastAPI",
    threshold: 50000,
    currency: "RUB impact",
    steps: [
      "Получено обращение",
      "Оценить влияние и SLA",
      "Влияние превышает лимит?",
      "Подтвердить эскалацию",
      "Передать инженеру и устранить",
      "Вернуть на первую линию",
      "Инцидент устранён",
      "Эскалация отклонена",
    ],
    entities: [
      { name: "Клиент", fields: ["customer_id", "company", "service_tier"] },
      {
        name: "Обращение",
        fields: [
          "ticket_id",
          "customer_id",
          "impact",
          "priority",
          "sla_deadline",
        ],
      },
      {
        name: "Эскалация",
        fields: ["escalation_id", "ticket_id", "engineer", "resolution"],
      },
    ],
  },
  {
    id: "appointments",
    name: "Запись на приём",
    description:
      "Пациент выбирает услугу и свободный слот; дорогую процедуру подтверждает администратор, календарь фиксирует запись.",
    person: "Пациент",
    reviewer: "Администратор клиники",
    api: "Сервис записи",
    external: "Календарь клиники",
    technology: "Kotlin / Spring Boot",
    threshold: 15000,
    currency: "RUB",
    steps: [
      "Запрос на запись",
      "Проверить услугу и свободный слот",
      "Стоимость требует подтверждения?",
      "Подтвердить процедуру",
      "Зарезервировать слот и уведомить",
      "Отменить резервирование",
      "Приём забронирован",
      "Запись отклонена",
    ],
    entities: [
      { name: "Пациент", fields: ["patient_id", "full_name", "phone"] },
      {
        name: "Запись",
        fields: [
          "appointment_id",
          "patient_id",
          "service_price",
          "starts_at",
          "status",
        ],
      },
      {
        name: "Слот",
        fields: ["slot_id", "appointment_id", "doctor_id", "available"],
      },
    ],
  },
];
function build(d: Domain): SystemModel {
  const ids = [
    "start",
    "validate",
    "threshold",
    "approval",
    "execute",
    "decline",
    "completed",
    "rejected",
  ];
  const steps = ids.map((id, i) => ({
    id,
    name: d.steps[i],
    kind: (i === 0
      ? "start"
      : i === 2 || i === 3
        ? "decision"
        : i > 5
          ? "end"
          : "task") as "start" | "task" | "decision" | "end",
    actor: i === 0 ? "customer" : i === 3 ? "reviewer" : "api",
  }));
  const edges: SystemModel["workflow"]["edges"] = [
    { id: "e1", from: "start", to: "validate", condition: "always" },
    { id: "e2", from: "validate", to: "threshold", condition: "always" },
    {
      id: "e3",
      from: "threshold",
      to: "approval",
      condition: "above_threshold",
      label: `> ${d.threshold} ${d.currency}; согласование включено`,
    },
    {
      id: "e4",
      from: "threshold",
      to: "execute",
      condition: "below_threshold",
      label: `≤ ${d.threshold} ${d.currency} или без согласования`,
    },
    {
      id: "e5",
      from: "approval",
      to: "execute",
      condition: "approved",
      label: "Одобрено",
    },
    {
      id: "e6",
      from: "approval",
      to: "decline",
      condition: "rejected",
      label: "Отклонено",
    },
    { id: "e7", from: "execute", to: "completed", condition: "always" },
    { id: "e8", from: "decline", to: "rejected", condition: "always" },
  ];
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    version: 1,
    nodes: [
      {
        id: "customer",
        name: d.person,
        kind: "person",
        description: "Инициирует запрос и получает результат",
        technology: "Web browser",
      },
      {
        id: "reviewer",
        name: d.reviewer,
        kind: "person",
        description: "Принимает решение по запросам выше порога",
        technology: "Рабочее место оператора",
      },
      {
        id: "api",
        name: d.api,
        kind: "service",
        description: d.description,
        technology: d.technology,
      },
      {
        id: "db",
        name: "Хранилище " + d.name.toLowerCase(),
        kind: "database",
        description: "Данные и журнал решений",
        technology: "PostgreSQL",
      },
      {
        id: "external",
        name: d.external,
        kind: "external",
        description: "Выполняет подтверждённую операцию",
        technology: "HTTPS API",
      },
    ],
    relations: [
      { id: "r1", from: "customer", to: "api", label: d.steps[0] },
      { id: "r2", from: "api", to: "db", label: "Сохранить запрос и аудит" },
      { id: "r3", from: "api", to: "reviewer", label: d.steps[3] },
      { id: "r4", from: "reviewer", to: "api", label: "Решение и комментарий" },
      { id: "r5", from: "api", to: "external", label: d.steps[4] },
    ],
    workflow: { steps, edges },
    entities: d.entities.map((e, i) => ({
      id: "entity" + i,
      name: e.name,
      fields: e.fields.map((name, j) => ({
        name,
        type:
          name.endsWith("_at") || name.includes("deadline")
            ? "datetime"
            : name.includes("amount") ||
                name.includes("price") ||
                name === "impact" ||
                name === "total"
              ? "decimal"
              : "string",
        key: j === 0,
      })),
    })),
    entityRelations: [
      {
        from: "entity0",
        to: "entity1",
        label: "содержит",
        cardinality: "one-to-many",
      },
      {
        from: "entity1",
        to: "entity2",
        label: "исполняется через",
        cardinality: "one-to-many",
      },
    ],
    states: steps.map((s) => ({ id: s.id, name: s.name })),
    transitions: edges.map((e) => ({
      from: e.from,
      to: e.to,
      label: e.label ?? "Далее",
    })),
    rules: {
      approvalThreshold: d.threshold,
      currency: d.currency,
      requireApproval: true,
    },
    stack: [
      { name: d.technology, purpose: d.api },
      { name: "PostgreSQL", purpose: "Хранение предметных сущностей и аудита" },
      { name: "HTTPS API", purpose: d.external },
    ],
  };
}
export const sampleProjects: SystemModel[] = domains.map(build);
