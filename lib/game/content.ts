import type { GameConfig, Intensity, Language, Mode, Role } from "./types";

export const PALETTE = ["#ff5a36", "#3dd68c", "#ffc53d", "#7aa2ff", "#f26db5", "#c084fc", "#2ee6d6", "#f97316"];

export const IMAGE_QUERIES = [
  "deep fried animal meme avatars",
  "funny medieval painting portraits",
  "cursed reaction meme avatars",
  "vintage animal illustrations",
  "pixel art fictional character avatars",
  "generic illustrated icons",
];

const INTENSITY_ORDER: Record<Intensity, Intensity[]> = {
  casual: ["casual", "unhinged", "footprint"],
  unhinged: ["unhinged", "footprint", "casual"],
  footprint: ["footprint", "unhinged", "casual"],
};

type Line = { intensity: Intensity; text: string };

type TemplateLine = {
  intensity: Intensity;
  instructionA: string;
  instructionB: string;
  pattern: string;
  fallbackA: string;
  fallbackB: string;
};

type AccountLine = { name: string; handle: string; verified: boolean };

const ACCOUNTS: Record<Language, AccountLine[]> = {
  en: [
    { name: "weaponized unemployment", handle: "government_problem", verified: false },
    { name: "Susan", handle: "blessed.susan", verified: false },
    { name: "Human Resources", handle: "weareafamily", verified: true },
    { name: "Kevin.exe", handle: "kevin.exe", verified: false },
    { name: "unemployed philosopher", handle: "industrial.revolution.hater", verified: false },
    { name: "Capitalism Enjoyer", handle: "monetizeeverything", verified: false },
    { name: "Michael", handle: "passiveincome_mike", verified: false },
    { name: "Testosterone Daily", handle: "primalmale", verified: false },
    { name: "Emily", handle: "healing.with.emily", verified: false },
    { name: "Peaceful Departures", handle: "peacefuldepartures", verified: true },
    { name: "Sunday Service HQ", handle: "sundayservicehq", verified: true },
    { name: "divorced at birth", handle: "emotional_liability", verified: false },
    { name: "Side Effects Inc.", handle: "sideeffectsenjoyer", verified: true },
    { name: "Andrew Capital", handle: "escapedthematrix", verified: true },
    { name: "industrial grade disappointment", handle: "sexual_taxpayer", verified: false },
    { name: "Notes App Menace", handle: "drafts.and.threats", verified: false },
  ],
  ru: [
    { name: "вооружённая безработица", handle: "gosproblema", verified: false },
    { name: "Светлана", handle: "blagoslovenna", verified: false },
    { name: "Отдел кадров", handle: "myodnasemya", verified: true },
    { name: "Кевин.exe", handle: "kevin.exe", verified: false },
    { name: "безработный философ", handle: "protiv.progressa", verified: false },
    { name: "Любитель рынка", handle: "monetiziruy", verified: false },
    { name: "Михаил", handle: "passivny_misha", verified: false },
    { name: "Тестостерон Daily", handle: "samets", verified: false },
    { name: "Эля", handle: "ischislyayus", verified: false },
    { name: "Тихий Уход", handle: "tihiyuhod", verified: true },
    { name: "Воскресная штаб", handle: "voskresenye", verified: true },
    { name: "разведён при рождении", handle: "emotsionalny_dolg", verified: false },
    { name: "Побочный эффект", handle: "pobochno", verified: true },
    { name: "Андрей Капитал", handle: "vyshel.iz.matrix", verified: true },
    { name: "промышленное разочарование", handle: "nalogovyy_kot", verified: false },
    { name: "Заметки в 4 утра", handle: "chernovik.ugroz", verified: false },
  ],
};

const POSTS: Record<Language, Line[]> = {
  en: [
    { intensity: "casual", text: "At 24 I bought a house. No degree. No job. The listing was my uncle's garage." },
    { intensity: "casual", text: "We're excited to announce that bereavement leave is now a team sport." },
    { intensity: "casual", text: "My son is 34 and still single. Starting to think the group chat is the problem." },
    { intensity: "casual", text: "Finally cut every toxic person out of my life. The chat is quieter. It is also just me." },
    { intensity: "casual", text: "People used to build cathedrals. Now they ask if oat milk counts as a personality." },
    { intensity: "casual", text: "If your grandma's pension isn't a side hustle, that's a family meeting." },
    { intensity: "casual", text: "Black Friday starts tomorrow. The good plots go first." },
    { intensity: "casual", text: "Just found out my therapist mains support. The silence makes sense now." },
    { intensity: "unhinged", text: "does anyone else feel a little romantic about a rent-controlled apartment" },
    { intensity: "unhinged", text: "being someone's emergency contact while actively ruining their life is a career" },
    { intensity: "unhinged", text: "The tenant moved out permanently. Heavy day. The listing goes up Thursday." },
    { intensity: "unhinged", text: "We are no longer accepting walk-ins. Demand is up and so is the waitlist for staying." },
    { intensity: "unhinged", text: "I don't want another one who shows up once and then leaves the chat on read." },
    { intensity: "unhinged", text: "Court-ordered healing journey starts Monday. Bring a snack." },
    { intensity: "unhinged", text: "The loyalty program is for people who come back, including the ones who already left." },
    { intensity: "unhinged", text: "If the pills worked you wouldn't still be writing in. That's the model, babe." },
    { intensity: "footprint", text: "Tomorrow is the service. Can the photographer also shoot profile pictures while everyone is dressed." },
    { intensity: "footprint", text: "Sometimes the most toxic person you know is the one you listed as a reference." },
    { intensity: "footprint", text: "We remain committed to a free admission. The rest is a seasonal pass." },
    { intensity: "footprint", text: "Choosing yourself is healthy. Especially in the daycare parking lot." },
    { intensity: "footprint", text: "Due to demand, grief is now appointment only." },
    { intensity: "footprint", text: "She's saved in my phone as Early Access. The wedding can be the full release." },
    { intensity: "footprint", text: "HR noticed your ex is still your professional reference. We find that efficient." },
    { intensity: "footprint", text: "The charity battle pass was a soft launch. Season 2 promises to listen." },
  ],
  ru: [
    { intensity: "casual", text: "В 24 купил квартиру. Без диплома. Без работы. Это гараж дяди, но объявление звучало гордо." },
    { intensity: "casual", text: "Рады сообщить, что отпуск по утрате теперь командный вид спорта." },
    { intensity: "casual", text: "Сыну 34, и он всё ещё один. Начинаю думать, что проблема в семейном чате." },
    { intensity: "casual", text: "Вычеркнула всех токсичных. В чате теперь тихо. Там только я." },
    { intensity: "casual", text: "Раньше люди строили соборы. Теперь спрашивают, считается ли овсяное молоко характером." },
    { intensity: "casual", text: "Если пенсия бабушки не приносит доход, это повод для семейного собрания." },
    { intensity: "casual", text: "Чёрная пятница завтра. Хорошие места заканчиваются раньше людей." },
    { intensity: "casual", text: "Узнал, что терапевт играет саппортом. Теперь понятно, почему он молчит." },
    { intensity: "unhinged", text: "кто-нибудь ещё испытывает чувства к квартире с нормальной арендой" },
    { intensity: "unhinged", text: "быть чьим-то экстренным контактом и одновременно причиной ЧП — это уже профессия" },
    { intensity: "unhinged", text: "Жилец съехал окончательно. Тяжёлый день, зато объявление выложу в четверг." },
    { intensity: "unhinged", text: "Мы больше не принимаем без записи. Спрос вырос, и очередь тоже хочет остаться." },
    { intensity: "unhinged", text: "Не хочу ещё одного, кто появляется один раз и пропадает из чата." },
    { intensity: "unhinged", text: "Суд велел начать путь исцеления с понедельника. Возьмите перекус." },
    { intensity: "unhinged", text: "Программа лояльности для тех, кто возвращается. Включая тех, кто уже ушёл." },
    { intensity: "unhinged", text: "Если бы таблетки работали, вы бы сюда не писали. Это и есть модель, дорогой." },
    { intensity: "footprint", text: "Завтра проводы. Фотограф может заодно снять фото для профиля, пока все при параде." },
    { intensity: "footprint", text: "Иногда самый токсичный человек — тот, кого ты указал рекомендателем." },
    { intensity: "footprint", text: "Мы по-прежнему за бесплатный вход. Дальше уже сезонный пропуск." },
    { intensity: "footprint", text: "Выбирать себя нормально. Особенно на парковке у садика." },
    { intensity: "footprint", text: "Из-за спроса горе теперь только по записи." },
    { intensity: "footprint", text: "В контактах она записана как «ранний доступ». Свадьба будет полной версией." },
    { intensity: "footprint", text: "Кадры заметили, что бывшая всё ещё ваш рекомендатель. Мы считаем это эффективным." },
    { intensity: "footprint", text: "Боевой пропуск благотворительности был мягким запуском. Второй сезон обещает слушать." },
  ],
};

const QUESTIONS: Record<Language, Line[]> = {
  en: [
    { intensity: "casual", text: "Why do you watch cooking videos?" },
    { intensity: "casual", text: "Why haven't you cancelled that subscription?" },
    { intensity: "casual", text: "What do you like about IKEA?" },
    { intensity: "casual", text: "Why do you take the bus?" },
    { intensity: "unhinged", text: "Why were you in incognito mode?" },
    { intensity: "unhinged", text: "How do you pick a hotel?" },
    { intensity: "unhinged", text: "Why did you go to the cinema alone?" },
    { intensity: "unhinged", text: "What were you doing with the credit card?" },
    { intensity: "footprint", text: "Why was your location on at 3am?" },
    { intensity: "footprint", text: "Who was the plus-one?" },
    { intensity: "footprint", text: "Why does HR have this screenshot?" },
    { intensity: "footprint", text: "What should we tell your mother?" },
  ],
  ru: [
    { intensity: "casual", text: "Зачем ты смотришь видео с готовкой?" },
    { intensity: "casual", text: "Почему ты до сих пор не отменил подписку?" },
    { intensity: "casual", text: "Что тебе нравится в IKEA?" },
    { intensity: "casual", text: "Почему ты ездишь на автобусе?" },
    { intensity: "unhinged", text: "Зачем ты сидел в режиме инкогнито?" },
    { intensity: "unhinged", text: "Как ты выбираешь отель?" },
    { intensity: "unhinged", text: "Зачем ты пошёл в кино один?" },
    { intensity: "unhinged", text: "Что ты делал с кредитной картой?" },
    { intensity: "footprint", text: "Почему в три ночи была включена геолокация?" },
    { intensity: "footprint", text: "Кто был тем самым плюс один?" },
    { intensity: "footprint", text: "Откуда у кадров этот скриншот?" },
    { intensity: "footprint", text: "Что нам сказать твоей маме?" },
  ],
};

const SENDERS: Record<Language, string[]> = {
  en: ["Mom", "Dad", "Therapist", "Landlord", "HR", "Ex", "Priest", "Customer support", "Tinder match", "Building chat"],
  ru: ["Мама", "Папа", "Терапевт", "Арендодатель", "Кадры", "Бывшая", "Священник", "Поддержка", "Пара с сайта", "Чат подъезда"],
};

const SCENARIOS: Record<Language, Line[]> = {
  en: [
    { intensity: "casual", text: "Your manager asks why your out-of-office says 'spiritually unavailable'." },
    { intensity: "casual", text: "The group chat wants to know why you left the dinner at 8 and the tab at 8:05." },
    { intensity: "casual", text: "A client asks why the invoice is titled 'emotional labor, net 30'." },
    { intensity: "casual", text: "Explain the calendar invite named 'quick alignment' that lasted four hours." },
    { intensity: "unhinged", text: "HR: we've noticed you listed your ex as a professional reference. Explain." },
    { intensity: "unhinged", text: "Your girlfriend found herself saved in your phone as Early Access. Explain." },
    { intensity: "unhinged", text: "The office wants a statement on the energy-drink graveyard that is your desk." },
    { intensity: "unhinged", text: "Write the official statement: the local shelter launched a battle pass." },
    { intensity: "footprint", text: "Police-interview parody: why was the shared calendar titled 'alibi (draft)'?" },
    { intensity: "footprint", text: "Customer service: a receipt shows one candle, three locks, and a lawyer. Explain the order." },
    { intensity: "footprint", text: "Write the apology for a loyalty program aimed at people who keep coming back to the chapel." },
    { intensity: "footprint", text: "Your therapist forwarded your 'quick question' to the group practice. Explain the question." },
  ],
  ru: [
    { intensity: "casual", text: "Начальник спрашивает, почему в автоответчике написано «духовно недоступен»." },
    { intensity: "casual", text: "Чат хочет знать, почему ты ушёл с ужина в восемь, а со счётом в 8:05." },
    { intensity: "casual", text: "Клиент спрашивает, почему счёт называется «эмоциональный труд, 30 дней»." },
    { intensity: "casual", text: "Объясни встречу «быстро синкнуться», которая длилась четыре часа." },
    { intensity: "unhinged", text: "Кадры: вы указали бывшую как рекомендателя. Объяснитесь." },
    { intensity: "unhinged", text: "Она нашла себя в телефоне под именем «ранний доступ». Объяснись." },
    { intensity: "unhinged", text: "Офис ждёт заявление про кладбище энергетиков на твоём столе." },
    { intensity: "unhinged", text: "Официальное заявление: местный приют запустил боевой пропуск." },
    { intensity: "footprint", text: "Пародия на допрос: почему общий календарь назывался «алиби (черновик)»?" },
    { intensity: "footprint", text: "Поддержка: в чеке свеча, три замка и юрист. Объясни заказ." },
    { intensity: "footprint", text: "Напиши извинение за программу лояльности для тех, кто возвращается в часовню." },
    { intensity: "footprint", text: "Терапевт переслал твой «быстрый вопрос» всей практике. Объясни вопрос." },
  ],
};

const TEMPLATES: Record<Language, TemplateLine[]> = {
  en: [
    { intensity: "casual", instructionA: "Finish this thought in one line: The best things in life", instructionB: "Name a disappointing source of money", pattern: "{a} — {b}", fallbackA: "The best things in life take time", fallbackB: "a group-chat reimbursement" },
    { intensity: "casual", instructionA: "Complete the advice: Never give up on", instructionB: "Name a job nobody thanks", pattern: "{a} — {b}", fallbackA: "Never give up on the people you love", fallbackB: "the person who restocks the office fruit" },
    { intensity: "casual", instructionA: "Write a sincere dating-profile first line", instructionB: "Name a household chore", pattern: "{a} I also {b}.", fallbackA: "Looking for someone kind", fallbackB: "separate the recycling" },
    { intensity: "casual", instructionA: "Write a headline for a local news story", instructionB: "Name a useless prize", pattern: "{a}. Prize: {b}.", fallbackA: "Local library extends its hours", fallbackB: "a mug that says employee" },
    { intensity: "unhinged", instructionA: "Name a ridiculous luxury for the bedroom", instructionB: "Write a slogan for a funeral home", pattern: "Introducing {a}. {b}", fallbackA: "a nine-hundred-dollar weighted blanket", fallbackB: "Finally, a reason to stay in bed." },
    { intensity: "unhinged", instructionA: "Write a corporate values statement in one line", instructionB: "Name something you hide from guests", pattern: "{a} Also: {b}.", fallbackA: "We believe in radical transparency", fallbackB: "the chair that isn't a chair" },
    { intensity: "unhinged", instructionA: "Write the title of a self-help book", instructionB: "Name a bill you keep ignoring", pattern: "{a}, a memoir of {b}", fallbackA: "How to Choose Yourself", fallbackB: "the electricity" },
    { intensity: "unhinged", instructionA: "Describe a first date in five words", instructionB: "Name a place that ruins the mood", pattern: "{a}. Location: {b}.", fallbackA: "We shared a quiet drink", fallbackB: "the parking garage stairwell" },
    { intensity: "footprint", instructionA: "Write a wedding vow in one sentence", instructionB: "Name a subscription you forgot to cancel", pattern: "{a} Brought to you by {b}.", fallbackA: "I will stay even when it is boring", fallbackB: "a meditation app from 2019" },
    { intensity: "footprint", instructionA: "Write an apology from a brand", instructionB: "Name a family secret", pattern: "{a} Unrelated: {b}.", fallbackA: "We hear you and we are learning", fallbackB: "the will is in the freezer" },
    { intensity: "footprint", instructionA: "Invent a medical pamphlet title", instructionB: "Name a reason to leave town", pattern: "{a}. Side effect: {b}.", fallbackA: "Ask your doctor about rest", fallbackB: "your ex got the group chat" },
    { intensity: "footprint", instructionA: "Write a toast for a retirement", instructionB: "Name something that should not be inherited", pattern: "{a} You also get {b}.", fallbackA: "You taught us how to leave on time", fallbackB: "the family lawsuit" },
  ],
  ru: [
    { intensity: "casual", instructionA: "Закончи мысль одной строкой: Лучшее в жизни", instructionB: "Назови жалкий источник денег", pattern: "{a} — {b}", fallbackA: "Лучшее в жизни не торопят", fallbackB: "перевод из чата «кто сколько скидывается»" },
    { intensity: "casual", instructionA: "Допиши совет: Никогда не бросай", instructionB: "Назови работу, за которую не благодарят", pattern: "{a} — {b}", fallbackA: "Никогда не бросай своих", fallbackB: "человек, который выносит коробки из-под бумаги" },
    { intensity: "casual", instructionA: "Напиши первую строку анкеты для знакомств", instructionB: "Назови домашнюю обязанность", pattern: "{a} Ещё я умею: {b}.", fallbackA: "Ищу спокойного человека", fallbackB: "разбирать контейнеры" },
    { intensity: "casual", instructionA: "Придумай заголовок местной новости", instructionB: "Назови бесполезный приз", pattern: "{a}. Приз: {b}.", fallbackA: "Библиотека продлила часы", fallbackB: "кружка со словом «сотрудник»" },
    { intensity: "unhinged", instructionA: "Назови нелепую роскошь для спальни", instructionB: "Придумай слоган похоронного бюро", pattern: "Представляем {a}. {b}", fallbackA: "утяжелённое одеяло за кучу денег", fallbackB: "Наконец-то причина не вставать." },
    { intensity: "unhinged", instructionA: "Напиши ценность компании одной строкой", instructionB: "Назови то, что прячешь от гостей", pattern: "{a} А ещё: {b}.", fallbackA: "Мы верим в радикальную честность", fallbackB: "стул, который не стул" },
    { intensity: "unhinged", instructionA: "Придумай название книги по самопомощи", instructionB: "Назови счёт, который ты не открываешь", pattern: "{a}, мемуары про {b}", fallbackA: "Как выбрать себя", fallbackB: "электричество" },
    { intensity: "unhinged", instructionA: "Опиши первое свидание в пяти словах", instructionB: "Назови место, которое убивает настроение", pattern: "{a}. Место: {b}.", fallbackA: "Мы просто тихо посидели", fallbackB: "лестница парковки" },
    { intensity: "footprint", instructionA: "Напиши свадебную клятву одним предложением", instructionB: "Назови подписку, которую забыл отменить", pattern: "{a} При поддержке: {b}.", fallbackA: "Я останусь, даже когда будет скучно", fallbackB: "приложение для медитации из прошлого десятилетия" },
    { intensity: "footprint", instructionA: "Напиши извинение от бренда", instructionB: "Назови семейный секрет", pattern: "{a} Не связано: {b}.", fallbackA: "Мы вас слышим и учимся", fallbackB: "завещание лежит в морозилке" },
    { intensity: "footprint", instructionA: "Придумай название медицинской брошюры", instructionB: "Назови причину уехать из города", pattern: "{a}. Побочный эффект: {b}.", fallbackA: "Спросите врача про отдых", fallbackB: "бывшая забрала общий чат" },
    { intensity: "footprint", instructionA: "Напиши тост на пенсию", instructionB: "Назови то, что нельзя наследовать", pattern: "{a} В комплекте: {b}.", fallbackA: "Ты научил нас уходить вовремя", fallbackB: "семейный суд" },
  ],
};

const BOT_LINES: Record<Language, Record<Role, string[]>> = {
  en: {
    reply: ["Cool story, still a receipt.", "The group chat saw this.", "This is a cry for a manager.", "Historically, no.", "We can circle back never."],
    answer: ["It was free and I didn't want to go alone.", "The trial hasn't ended.", "I wanted to see how professionals do it.", "It was closer than walking.", "Someone else clicked it."],
    context: ["Why is the shared card on a fan page?", "Are you still texting them?", "Did you bring a date to the funeral?", "Why were you in the stairwell?", "Who approved this purchase?"],
    fragment: ["a loyalty card for feelings", "Don't make this a meeting.", "the family blender", "We value your patience.", "open on Sundays"],
  },
  ru: {
    reply: ["История хорошая, чек лучше.", "Чат это уже видел.", "Позовите менеджера.", "Исторически нет.", "Вернёмся к этому никогда."],
    answer: ["Было бесплатно, и я не хотел идти один.", "Пробный период ещё не кончился.", "Хотел посмотреть, как делают профи.", "Так было ближе, чем пешком.", "Это кто-то другой нажал."],
    context: ["Почему общая карта на фанатской странице?", "Ты всё ещё ему пишешь?", "Ты привёл пару на похороны?", "Что ты делал на лестнице?", "Кто одобрил эту покупку?"],
    fragment: ["карта лояльности для чувств", "Не надо делать из этого созвон.", "семейный блендер", "Мы ценим ваше терпение.", "открыто по воскресеньям"],
  },
};

const NAMES: Record<Language, string[]> = {
  en: ["Alex", "Mina", "Bo", "Svet", "Tim", "Kat", "Nia", "Omar"],
  ru: ["Лёша", "Марина", "Богдан", "Света", "Тимур", "Катя", "Остап", "Нина"],
};

const AGOS: Record<Language, string[]> = {
  en: ["1h", "2h", "3h", "4h", "6h", "8h"],
  ru: ["1 ч", "2 ч", "3 ч", "4 ч", "6 ч", "8 ч"],
};

export function defaultPlaylist(rounds: number): Mode[] {
  const count = clampRounds(rounds);
  const presets: Record<number, Mode[]> = {
    2: ["ratio", "dms"],
    3: ["ratio", "dms", "explain"],
    4: ["ratio", "dms", "sabotage", "explain"],
    5: ["ratio", "dms", "sabotage", "explain", "ratio"],
  };
  return presets[count];
}

export function defaultConfig(language: Language = "en"): GameConfig {
  return {
    language,
    intensity: "unhinged",
    exclusions: "",
    rounds: 3,
    playlist: defaultPlaylist(3),
    finaleMultiplier: false,
    searchBudget: 6,
  };
}

export function clampRounds(rounds: number): number {
  if (!Number.isFinite(rounds)) return 3;
  return Math.max(2, Math.min(5, Math.round(rounds)));
}

export function botNames(language: Language): string[] {
  return NAMES[language];
}

export function botLine(language: Language, role: Role, index: number): string {
  const lines = BOT_LINES[language][role];
  return lines[Math.abs(index) % lines.length];
}

export function taskLimit(role: Role): number {
  if (role === "reply") return 280;
  if (role === "fragment") return 120;
  return 200;
}

export function agoLabel(language: Language, index: number): string {
  const labels = AGOS[language];
  return labels[Math.abs(index) % labels.length];
}

export function sessionCounts(playerCount: number, playlist: readonly Mode[]) {
  const accounts = Math.min(18, Math.max(8, playerCount * 2));
  const imageGroups = Math.min(6, Math.max(4, Math.ceil(accounts / 3)));
  const ratioRounds = playlist.filter((mode) => mode === "ratio").length;
  return {
    playerCount,
    accounts,
    imageGroups,
    sparePosts: ratioRounds > 0 ? playerCount : 0,
    postsPerRatioRound: playerCount,
    perRound: playerCount,
  };
}

export function fallbackAccounts(language: Language, count: number): AccountLine[] {
  return Array.from({ length: count }, (_, index) => {
    const base = ACCOUNTS[language][index % ACCOUNTS[language].length];
    if (index < ACCOUNTS[language].length) return base;
    return { ...base, handle: `${base.handle}${index}`.slice(0, 24), name: `${base.name} ${index + 1}` };
  });
}

export function fallbackImageQueries(count: number): string[] {
  return Array.from({ length: count }, (_, index) => IMAGE_QUERIES[index % IMAGE_QUERIES.length]);
}

export function fallbackPosts(language: Language, intensity: Intensity, count: number): string[] {
  return takeLines(POSTS[language], intensity, count);
}

export function fallbackQuestions(language: Language, intensity: Intensity, count: number): string[] {
  return takeLines(QUESTIONS[language], intensity, count);
}

export function fallbackSenders(language: Language, count: number): string[] {
  return Array.from({ length: count }, (_, index) => SENDERS[language][index % SENDERS[language].length]);
}

export function fallbackScenarios(language: Language, intensity: Intensity, count: number): string[] {
  return takeLines(SCENARIOS[language], intensity, count);
}

export function fallbackTemplates(language: Language, intensity: Intensity, count: number): TemplateLine[] {
  const ordered = orderByIntensity(TEMPLATES[language], intensity);
  return Array.from({ length: count }, (_, index) => {
    const base = ordered[index % ordered.length];
    if (index < ordered.length) return base;
    return { ...base, instructionA: `${base.instructionA} (${index + 1})` };
  });
}

function takeLines(lines: Line[], intensity: Intensity, count: number): string[] {
  const ordered = orderByIntensity(lines, intensity).map((line) => line.text);
  return Array.from({ length: count }, (_, index) => {
    const text = ordered[index % ordered.length];
    return index < ordered.length ? text : `${text} (${index + 1})`;
  });
}

function orderByIntensity<T extends { intensity: Intensity }>(lines: T[], intensity: Intensity): T[] {
  const ranks = new Map(INTENSITY_ORDER[intensity].map((item, index) => [item, index]));
  return [...lines].sort((a, b) => (ranks.get(a.intensity) ?? 9) - (ranks.get(b.intensity) ?? 9));
}

export function isMode(value: string): value is Mode {
  return value === "ratio" || value === "dms" || value === "explain" || value === "sabotage";
}
