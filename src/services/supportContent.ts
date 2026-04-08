import adminSettings from "../../data/admin-settings.json";

export interface PublicSupportSettings {
  storeName: string;
  contactPhone: string;
  notificationEmail: string;
  officeAddress: string;
  workSchedule: string[];
  helpQuickLinks: HelpQuickLinkContent[];
}

export interface SupportChannelContent {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  note: string;
}

export interface HelpStepContent {
  title: string;
  description: string;
}

export interface HelpFaqContent {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface HelpQuickLinkContent {
  id: string;
  label: string;
  href: string;
  description: string;
}

const DEFAULT_WORK_SCHEDULE = [
  "Пн–Пт: 08:30–18:00",
  "Сб: 09:00–15:00",
  "Нд: прийом онлайн-заявок",
];

const DEFAULT_HELP_QUICK_LINKS: HelpQuickLinkContent[] = [
  {
    id: "help-center",
    label: "Центр допомоги",
    href: "/help",
    description: "Огляд каналів підтримки та сценаріїв звернення.",
  },
  {
    id: "delivery-payment",
    label: "Доставка і оплата",
    href: "/help?faq=оплата#faq",
    description: "Швидкий перехід до питань про логістику та реквізити.",
  },
  {
    id: "returns",
    label: "Повернення товару",
    href: "/help?faq=повернення#faq",
    description: "Повернення, обмін і подальші кроки по заявці.",
  },
];

const DEFAULT_SUPPORT_SETTINGS: PublicSupportSettings = {
  storeName: "Буд Лідер",
  contactPhone: "+380 (99) 123-45-67",
  notificationEmail: "info@budleader.com.ua",
  officeAddress: "м. Мена, вул. Шевченка, 75",
  workSchedule: DEFAULT_WORK_SCHEDULE,
  helpQuickLinks: DEFAULT_HELP_QUICK_LINKS,
};

const slugifyHelpLinkId = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яіїєґ]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "help-link";

const normalizeWorkSchedule = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_WORK_SCHEDULE;
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return normalized.length > 0 ? normalized : DEFAULT_WORK_SCHEDULE;
};

const normalizeHelpQuickLinks = (value: unknown): HelpQuickLinkContent[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_HELP_QUICK_LINKS;
  }

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<HelpQuickLinkContent>;
      const label =
        typeof candidate.label === "string" ? candidate.label.trim() : "";
      const href =
        typeof candidate.href === "string" ? candidate.href.trim() : "";
      const description =
        typeof candidate.description === "string"
          ? candidate.description.trim()
          : "";

      if (!label || !href || !description) {
        return null;
      }

      const id =
        typeof candidate.id === "string" && candidate.id.trim().length > 0
          ? candidate.id.trim()
          : slugifyHelpLinkId(label);

      return {
        id,
        label,
        href,
        description,
      };
    })
    .filter((item): item is HelpQuickLinkContent => item !== null);

  return normalized.length > 0 ? normalized : DEFAULT_HELP_QUICK_LINKS;
};

export const publicSupportSettings: PublicSupportSettings = {
  ...DEFAULT_SUPPORT_SETTINGS,
  ...adminSettings,
  workSchedule: normalizeWorkSchedule(adminSettings.workSchedule),
  helpQuickLinks: normalizeHelpQuickLinks(adminSettings.helpQuickLinks),
};

export const normalizePhoneHref = (phone: string): string => {
  const normalized = phone.replace(/[^\d+]/g, "");

  return `tel:${normalized}`;
};

export const supportChannels: SupportChannelContent[] = [
  {
    id: "consultation",
    title: "Консультація перед замовленням",
    description:
      "Підкажемо матеріали, сумісність позицій, приблизні об'єми та варіанти заміни під ваш об'єкт.",
    actionLabel: "Написати менеджеру",
    actionHref: `mailto:${publicSupportSettings.notificationEmail}`,
    note: `Відповідаємо на ${publicSupportSettings.notificationEmail} і повертаємося до заявки, якщо звернення надійшло поза графіком.`,
  },
  {
    id: "orders",
    title: "Питання по замовленню",
    description:
      "Допоможемо перевірити статус, склад замовлення, підтвердження оплати та готовність до відвантаження.",
    actionLabel: "Зателефонувати",
    actionHref: normalizePhoneHref(publicSupportSettings.contactPhone),
    note: `Для швидкої перевірки підготуйте номер замовлення або зверніться за номером ${publicSupportSettings.contactPhone}.`,
  },
  {
    id: "delivery",
    title: "Доставка та самовивіз",
    description:
      "Пояснимо часові вікна доставки, самовивіз, доступність складу та підкажемо деталі по адресі відвантаження.",
    actionLabel: "Переглянути контакти",
    actionHref: "/contacts",
    note: `Основна адреса для координації: ${publicSupportSettings.officeAddress}.`,
  },
];

export const helpSteps: HelpStepContent[] = [
  {
    title: "Опишіть задачу",
    description:
      "Напишіть що саме будуєте або ремонтуєте, які матеріали вже вибрали і що викликає сумнів.",
  },
  {
    title: "Отримайте підбір",
    description:
      "Менеджер пропонує позиції, аналоги, орієнтовну кількість і підказує, що краще замовити разом.",
  },
  {
    title: "Підтвердіть замовлення",
    description:
      "Після узгодження залишаємо фінальний склад, спосіб оплати, доставку або самовивіз.",
  },
  {
    title: "Супровід до отримання",
    description:
      "Якщо виникли зміни по термінах чи адресі, підтримка допоможе перебудувати відвантаження без зайвих дзвінків.",
  },
];

export const helpFaqItems: HelpFaqContent[] = [
  {
    id: "response-time",
    question: "Як швидко менеджер відповідає на звернення?",
    answer:
      "У робочі години відповідаємо зазвичай протягом 10–20 хвилин. Якщо звернення надійшло поза графіком, опрацьовуємо його зранку наступного дня.",
    keywords: ["час", "відповідь", "швидко", "менеджер"],
  },
  {
    id: "order-changes",
    question: "Чи можна змінити замовлення після оформлення?",
    answer:
      "Так, поки замовлення не передано на відвантаження. Напишіть або зателефонуйте якомога раніше, щоб ми встигли скоригувати склад і суму.",
    keywords: ["зміна", "замовлення", "редагування", "після оформлення"],
  },
  {
    id: "product-availability",
    question: "Що робити, якщо потрібного товару немає в наявності?",
    answer:
      "Підтримка запропонує аналог, скаже найближчу дату поставки або допоможе зібрати заміну з наявних позицій без втрати по задачі.",
    keywords: ["наявність", "аналог", "товар", "заміна"],
  },
  {
    id: "delivery-payment",
    question: "Як уточнити умови доставки та оплати?",
    answer: `Для доставки узгоджуємо адресу, часове вікно і потребу в розвантаженні. Для оплати менеджер надсилає актуальні реквізити та підтверджує суму замовлення через ${publicSupportSettings.notificationEmail} або телефоном ${publicSupportSettings.contactPhone}.`,
    keywords: ["доставка", "оплата", "реквізити", "самовивіз"],
  },
  {
    id: "returns",
    question: "Як відбувається повернення товару?",
    answer:
      "Потрібно звернутися до підтримки з номером замовлення, описом причини та фото товару, якщо є пошкодження. Менеджер пояснить умови повернення і погодить подальші кроки.",
    keywords: ["повернення", "обмін", "брак", "товар"],
  },
  {
    id: "large-delivery",
    question: "Як уточнити умови доставки великогабаритних матеріалів?",
    answer:
      "Для габаритних або важких позицій ми окремо погоджуємо транспорт, під'їзд до об'єкта, занос і потребу в маніпуляторі чи крані.",
    keywords: ["великогабаритний", "маніпулятор", "кран", "логістика"],
  },
];

export const helpQuickLinks: HelpQuickLinkContent[] = [
  ...publicSupportSettings.helpQuickLinks,
];

export const serializeWorkSchedule = (items: string[]): string =>
  items.join("\n");

export const parseWorkSchedule = (value: string): string[] =>
  normalizeWorkSchedule(value.split("\n"));

export const serializeHelpQuickLinks = (
  items: HelpQuickLinkContent[]
): string =>
  items
    .map((item) => `${item.label} | ${item.href} | ${item.description}`)
    .join("\n");

export const parseHelpQuickLinks = (value: string): HelpQuickLinkContent[] => {
  const parsed = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const [label = "", href = "", description = ""] = parts;

      if (!label || !href || !description) {
        return null;
      }

      return {
        id: slugifyHelpLinkId(label),
        label,
        href,
        description,
      } satisfies HelpQuickLinkContent;
    })
    .filter((item): item is HelpQuickLinkContent => item !== null);

  return normalizeHelpQuickLinks(parsed);
};
