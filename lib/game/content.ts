import type { LineupId, RoundKind, Skins } from "./types";

export const PALETTE = [
  "#ff5a36",
  "#3dd68c",
  "#ffc53d",
  "#7aa2ff",
  "#f26db5",
  "#c084fc",
  "#2ee6d6",
  "#f97316",
];

export const LINEUPS: Record<LineupId, RoundKind[]> = {
  classic: ["messenger", "thread", "job", "market", "ai", "instagram"],
  browsing: ["search", "review", "video", "thread", "ai", "instagram"],
};

export const LINEUP_COPY: Record<LineupId, { title: string; detail: string }> = {
  classic: {
    title: "Чаты и магазины",
    detail: "Мессенджер, тред, вакансия, объявление, нейросеть и лента",
  },
  browsing: {
    title: "Поиск и карты",
    detail: "Поиск, отзыв, ролик, тред, нейросеть и лента",
  },
};

export function skinsFromSeed(seed: number): Skins {
  const messenger = (["telegram", "whatsapp", "viber"] as const)[Math.abs(seed) % 3];
  const job = (["workua", "linkedin", "indeed"] as const)[Math.floor(Math.abs(seed) / 3) % 3];
  const market = (["olx", "amazon"] as const)[Math.floor(Math.abs(seed) / 9) % 2];
  const thread = (["threads", "x"] as const)[Math.floor(Math.abs(seed) / 2) % 2];
  return { messenger, job, market, thread };
}

export function roundTitle(kind: RoundKind, skins: Skins): string {
  if (kind === "messenger") {
    return { telegram: "Телеграм", whatsapp: "Вотсап", viber: "Вайбер" }[skins.messenger];
  }
  if (kind === "thread") return skins.thread === "x" ? "Твиттер" : "Тредс";
  if (kind === "job") return { workua: "Ворк", linkedin: "Линкедин", indeed: "Индид" }[skins.job];
  if (kind === "market") return skins.market === "olx" ? "ОЛХ" : "Амазон";
  if (kind === "search") return "Поиск";
  if (kind === "review") return "Карты";
  if (kind === "video") return "Ролик";
  if (kind === "ai") return "Нейросеть";
  return "Лента";
}

export function limits(kind: RoundKind): { write: number; twist: number } {
  if (kind === "ai") return { write: 140, twist: 90 };
  if (kind === "thread" || kind === "review") return { write: 110, twist: 36 };
  if (kind === "instagram") return { write: 8, twist: 80 };
  if (kind === "video") return { write: 90, twist: 48 };
  if (kind === "messenger") return { write: 80, twist: 28 };
  return { write: 90, twist: 42 };
}

export function writeCopy(kind: RoundKind, topic: string): { title: string; hint: string; placeholder: string } {
  const hint = topic;
  switch (kind) {
    case "messenger":
      return { title: "Напиши сообщение", hint, placeholder: "Я уже выехал" };
    case "thread":
      return { title: "Напиши пост", hint, placeholder: "Обожаю, когда все смотрят" };
    case "job":
      return { title: "Строка в сопроводительное", hint, placeholder: "Люблю работать с людьми" };
    case "market":
      return { title: "Честно опиши товар", hint, placeholder: "Работает, если ударить" };
    case "search":
      return { title: "Фраза как ответ поиска", hint, placeholder: "Это нормально после тридцати" };
    case "review":
      return { title: "Напиши отзыв", hint, placeholder: "Пришли голодные, ушли с историей" };
    case "video":
      return { title: "Комментарий под роликом", hint, placeholder: "Кто ещё так делает" };
    case "ai":
      return { title: "Ответь как нейросеть", hint, placeholder: "Конечно. Начните с извинения." };
    default:
      return { title: "Выбери кадр", hint, placeholder: "" };
  }
}

export function twistCopy(kind: RoundKind): { title: string; placeholder: string } {
  switch (kind) {
    case "messenger":
      return { title: "Кому это отправили?", placeholder: "Маме" };
    case "thread":
      return { title: "Хештег, от которого стыдно", placeholder: "совещание" };
    case "job":
      return { title: "На какую должность это подали?", placeholder: "смотритель очереди" };
    case "market":
      return { title: "Что за товар и почём?", placeholder: "Диван, 400 грн" };
    case "search":
      return { title: "Какой это был запрос?", placeholder: "как уснуть за 4 минуты" };
    case "review":
      return { title: "Как называется место?", placeholder: "Столовая на работе" };
    case "video":
      return { title: "Как называется ролик?", placeholder: "Как сложить простынь" };
    case "ai":
      return { title: "Что написал пользователь?", placeholder: "Как сказать маме про гуся" };
    default:
      return { title: "Подпись к фото", placeholder: "семейный ужин, всё в порядке" };
  }
}

type Pair = { write: string; twist: string };
type Topic = { topic: string; query: string };

const BOTS: Record<RoundKind, Pair[]> = {
  messenger: [
    { write: "Я уже выехал", twist: "Маме" },
    { write: "Это был последний раз", twist: "Начальнику" },
    { write: "Не пиши сюда", twist: "В чат дома" },
    { write: "Я случайно", twist: "Бухгалтеру" },
    { write: "Можешь забрать это у меня", twist: "Соседу снизу" },
    { write: "Давай как в прошлый раз", twist: "В рабочий чат" },
  ],
  thread: [
    { write: "Обожаю, когда все смотрят", twist: "совещание" },
    { write: "Лучший вечер в моей жизни", twist: "очередь в налоговую" },
    { write: "Больше так не могу", twist: "пробный день" },
    { write: "Они сами пришли", twist: "родительское собрание" },
    { write: "Тихо, но очень вкусно", twist: "открытый микрофон" },
    { write: "Главное никому не показывать", twist: "сторис" },
  ],
  job: [
    { write: "Быстро учусь на своих ошибках", twist: "дегустатор просрочки" },
    { write: "Люблю работать с людьми", twist: "смотритель ночной очереди" },
    { write: "Готов выходить в выходные", twist: "голос «мы уже закрываемся»" },
    { write: "Стрессоустойчивый", twist: "оператор чата «где мой заказ»" },
    { write: "Есть опыт с животными", twist: "няня для чужого гуся" },
    { write: "Коммуникабельный", twist: "тот, кто пишет «+» в чате подъезда" },
  ],
  market: [
    { write: "Пахнет, но характер добрый", twist: "Диван, 400 грн" },
    { write: "Работает, если ударить", twist: "Микроволновка, 150 грн" },
    { write: "Один хозяин, очень активный", twist: "Пылесос, 90 грн" },
    { write: "Почти не кусается", twist: "Блендер, 60 грн" },
    { write: "Следы праздника в комплекте", twist: "Стол, 200 грн" },
    { write: "Сама не знает, что умеет", twist: "Колонка, 1 грн" },
  ],
  search: [
    { write: "Врачи просят не повторять дома", twist: "как уснуть за 4 минуты" },
    { write: "Это нормально после тридцати", twist: "почему начальник молчит" },
    { write: "Шаг 3: сделайте вид, что так и было", twist: "как объяснить пропажу торта" },
    { write: "Побочный эффект: внезапная честность", twist: "можно ли уволиться утром" },
    { write: "Не является медицинской рекомендацией", twist: "что значит сердечко от коллеги" },
    { write: "Результат может отличаться от обещания", twist: "как вернуть переписку" },
  ],
  review: [
    { write: "Пришли голодные, ушли с историей", twist: "Столовая на работе" },
    { write: "Музыка громче, чем еда", twist: "Свадьба двоюродной" },
    { write: "Персонал смотрит, как будто уже знает", twist: "Поликлиника №4" },
    { write: "Чисто, пока не включили свет", twist: "Квартира посуточно" },
    { write: "Порции честные: маленькие", twist: "Кафе у метро" },
    { write: "Больше не пустят, и это взаимно", twist: "Баня на районе" },
  ],
  video: [
    { write: "Кто ещё так делает или я один", twist: "Как сложить простынь" },
    { write: "Попробовал, бабушка в шоке", twist: "Тихий час в садике" },
    { write: "Жду вторую часть", twist: "Собрание жильцов, 2 часа" },
    { write: "Это законно?", twist: "Рецепт оливье" },
    { write: "Сохранил, чтобы не забыть", twist: "Инструкция к огнетушителю" },
    { write: "Почему это рекомендовали мне", twist: "Звуки пылесоса 10 часов" },
  ],
  ai: [
    { write: "Конечно. Начните с извинения и не уточняйте детали.", twist: "Как сказать маме, что гусь до сих пор у меня" },
    { write: "Я не могу помочь с этим. Могу предложить лазанью.", twist: "Начальник снова просит выйти в субботу" },
    { write: "Вот план. Шаг два — удалить переписку.", twist: "Что ответить на «мы всё видели»" },
    { write: "Сохраняйте спокойствие и чек.", twist: "В такси остался торт" },
    { write: "Как языковая модель, я считаю это семейной традицией.", twist: "Можно ли прийти на свадьбу с барабаном" },
    { write: "Лучший вариант: скажите, что так и было задумано.", twist: "Почему в холодильнике чужая обувь" },
  ],
  instagram: [
    { write: "", twist: "семейный ужин, всё в порядке" },
    { write: "", twist: "новый сотрудник отдела" },
    { write: "", twist: "маленький сюрприз для гостей" },
    { write: "", twist: "утро начальника" },
    { write: "", twist: "это временно" },
    { write: "", twist: "так выглядит забота" },
  ],
};

const TOPICS: Record<RoundKind, Topic[]> = {
  messenger: [
    { topic: "Напиши, что задерживаешься", query: "" },
    { topic: "Коротко объясни, куда делся торт", query: "" },
    { topic: "Ответь на «ты где?»", query: "" },
    { topic: "Сообщи, что планы чуть изменились", query: "" },
    { topic: "Попроси забрать посылку", query: "" },
    { topic: "Напиши, что уже почти на месте", query: "" },
    { topic: "Успокой человека одним сообщением", query: "" },
    { topic: "Признайся, что забыл про встречу", query: "" },
  ],
  thread: [
    { topic: "Поделись, как прошёл день", query: "" },
    { topic: "Расскажи про ужин без подробностей", query: "" },
    { topic: "Похвали себя за маленькую победу", query: "" },
    { topic: "Опиши утро одним предложением", query: "" },
    { topic: "Напиши, чему ты внезапно рад", query: "" },
    { topic: "Пожалуйся очень мягко", query: "" },
    { topic: "Анонсируй планы на вечер", query: "" },
    { topic: "Оставь совет, который сам не соблюдаешь", query: "" },
  ],
  job: [
    { topic: "Одна сильная сторона, без скромности", query: "" },
    { topic: "Почему именно ты", query: "" },
    { topic: "Как относишься к переработкам", query: "" },
    { topic: "Опыт, которым можно гордиться", query: "" },
    { topic: "Что сделаешь в первый день", query: "" },
    { topic: "Любимый формат общения на работе", query: "" },
    { topic: "Как переживаешь дедлайн", query: "" },
    { topic: "Чему научила прошлая работа", query: "" },
  ],
  market: [
    { topic: "Опиши диван так, чтобы его забрали", query: "" },
    { topic: "Продай технику, которая капризничает", query: "" },
    { topic: "Честно напиши про запах", query: "" },
    { topic: "Состояние: б/у, но с историей", query: "" },
    { topic: "Почему отдаёшь почти даром", query: "" },
    { topic: "Что входит в комплект, кроме самого предмета", query: "" },
    { topic: "Для кого эта вещь точно подойдёт", query: "" },
    { topic: "Один недостаток, который лучше сказать сразу", query: "" },
  ],
  search: [
    { topic: "Короткий ответ, который хочется закрыть", query: "" },
    { topic: "Совет, звучащий увереннее, чем нужно", query: "" },
    { topic: "Инструкция из трёх слов и оговорки", query: "" },
    { topic: "Факт, который лучше не проверять вслух", query: "" },
    { topic: "Ответ «для чайников»", query: "" },
    { topic: "То, что пишет первая ссылка", query: "" },
    { topic: "Предупреждение мелким шрифтом", query: "" },
    { topic: "Народный способ без гарантий", query: "" },
  ],
  review: [
    { topic: "Отзыв про ужин, после которого все молчали", query: "" },
    { topic: "Как тебя встретили на входе", query: "" },
    { topic: "Что было не так с порцией", query: "" },
    { topic: "Оцени атмосферу одним вздохом", query: "" },
    { topic: "Вернёшься ли ещё и почему так", query: "" },
    { topic: "Что сказал соседний стол", query: "" },
    { topic: "Чистота: честно", query: "" },
    { topic: "Совет тем, кто только собирается", query: "" },
  ],
  video: [
    { topic: "Комментарий человека, который досмотрел до конца", query: "" },
    { topic: "Вопрос автору, который всё усложнит", query: "" },
    { topic: "Отметь таймкод, где стало неловко", query: "" },
    { topic: "Напиши, зачем это сохранил", query: "" },
    { topic: "Сравни с прошлой серией", query: "" },
    { topic: "Коротко поспорь с роликом", query: "" },
    { topic: "Посоветуй, кому это переслать", query: "" },
    { topic: "Оставь комментарий от лица бабушки", query: "" },
  ],
  ai: [
    { topic: "Дай совет, как провести вечер", query: "" },
    { topic: "Вежливо откажи и предложи замену", query: "" },
    { topic: "Составь план из трёх шагов", query: "" },
    { topic: "Объясни, как извиниться", query: "" },
    { topic: "Ответь спокойно и слишком уверенно", query: "" },
    { topic: "Предложи безопасный вариант", query: "" },
    { topic: "Перефразируй плохую новость мягко", query: "" },
    { topic: "Дай инструкцию, как ничего не объяснять", query: "" },
  ],
  instagram: [
    { topic: "Это всплыло в семейном чате", query: "messy family dinner table" },
    { topic: "Последнее фото в телефоне", query: "cat sleeping on laptop" },
    { topic: "Кадр, который открылся на проекторе", query: "office meeting projector screen" },
    { topic: "То, что увидели гости на кухне", query: "burnt food smoke kitchen" },
    { topic: "Снимок с корпоратива", query: "office party balloons cake" },
    { topic: "Фото из такси в три ночи", query: "empty taxi back seat night" },
    { topic: "Объявление, которое повесили соседи", query: "apartment hallway shoes" },
    { topic: "Кадр из отпуска, который лучше не показывать", query: "tourist raincoat beach wind" },
    { topic: "То, что лежало в корзине", query: "shopping cart strange groceries" },
    { topic: "Утро перед важной встречей", query: "coffee spilled on shirt" },
    { topic: "Подарок, который уже нельзя вернуть", query: "ugly ceramic souvenir" },
    { topic: "Вид из окна ровно в этот момент", query: "rainy bus window city" },
  ],
};

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

export function fallbackTopic(kind: RoundKind, code: string, seat: number): Topic {
  const list = TOPICS[kind];
  return list[(hashString(`${code}:${kind}`) + seat) % list.length];
}

export function botWrite(kind: RoundKind, seat: number, round: number): string {
  const list = BOTS[kind];
  return list[(seat + round) % list.length].write;
}

export function botTwist(kind: RoundKind, sourceSeat: number, round: number): string {
  const list = BOTS[kind];
  return list[(sourceSeat + round) % list.length].twist;
}

export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function handleOf(name: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const slug = name
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]/g, "");
  return `@${slug || "user"}`;
}
