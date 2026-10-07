const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");

if (toggle && links) {
  const closeMenu = () => {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

const readerMode = document.querySelector("#reader-mode");
const readerModeMessage = document.querySelector("#reader-mode-message");

const readerModeDescriptions = {
  reader: "",
  base66: "Base66 governed editions and reference sources.",
  exbase66: "EXBase66 governed passage metadata and validated relationships.",
  century: "Browse published Scripture witnesses by century (I–XX).",
  concordance:
    "Concordance is pending a governed STRATEGi contract and validated API.",
};

const base66EditionIDs = new Set([
  "deu-deu1912",
  "eng-eng-asv",
  "hat-hatbsa",
  "grcbyz-ebible",
  "grclxx-ebible",
  "grcmt-ebible",
  "grctcgnt-ebible",
  "grctr-ebible",
  "hebwlc-ebible",
]);

const initialReaderQuery = new URLSearchParams(window.location.search);
let initialReaderQueryRestored = false;

const setReaderModeMessage = (message) => {
  if (readerModeMessage) readerModeMessage.textContent = message;
};

const setReaderModeState = (mode) => {
  const description = readerModeDescriptions[mode] ?? readerModeDescriptions.reader;
  const readerAvailable =
    mode === "reader" || mode === "base66" || mode === "century";
  const exbase66Mode = mode === "exbase66";

  setReaderModeMessage(description);

  const base66QueryMode = mode === "base66";

  if (readerExbase66Query) {
    readerExbase66Query.hidden = !exbase66Mode;
  }

  if (readerExbase66PassageID && !exbase66Mode) {
    readerExbase66PassageID.value = "";
  }

  if (readerExbase66Search) {
    readerExbase66Search.disabled =
      !exbase66Mode || !readerExbase66PassageID?.value.trim();
  }

  if (readerBase66Query) {
    readerBase66Query.hidden = !base66QueryMode;
  }

  for (const control of readerLegacyNavigation) {
    control.hidden = base66QueryMode || exbase66Mode;
  }

  if (readerLanguage?.closest("label")) {
    readerLanguage.closest("label").hidden = exbase66Mode;
  }

  if (readerEdition?.closest("label")) {
    readerEdition.closest("label").hidden = exbase66Mode;
  }

  if (readerBase66Reference && !base66QueryMode) {
    readerBase66Reference.value = "";
  }

  if (readerBase66Read) {
    readerBase66Read.disabled =
      !base66QueryMode || !readerEdition?.value || !readerBase66Reference?.value.trim();
  }

  for (const control of [
    readerLanguage,
    readerEdition,
    readerBook,
    readerChapter,
  ]) {
    if (control) control.disabled = !readerAvailable;
  }

  if (readerAvailable) {
    resetReaderSelectionState();
    clearPassage();
    setReaderMessage("Loading languages…");
  } else {
    resetReaderSelectionState();
    clearPassage();
    setReaderMessage(description);
  }
};

const readerLanguage = document.querySelector("#reader-language");
const readerEdition = document.querySelector("#reader-edition");
const readerBook = document.querySelector("#reader-book");
const readerChapter = document.querySelector("#reader-chapter");
const readerBase66Query = document.querySelector("[data-base66-query]");
const readerBase66Reference = document.querySelector("#reader-base66-reference");
const readerBase66Read = document.querySelector("#reader-base66-read");
const readerExbase66Query = document.querySelector("[data-exbase66-query]");
const readerExbase66PassageID = document.querySelector("#reader-exbase66-passage-id");
const readerExbase66Search = document.querySelector("#reader-exbase66-search");
const readerLegacyNavigation = [...document.querySelectorAll(".reader-legacy-navigation")];
const readerMessage = document.querySelector("#reader-message");
const readerPassage = document.querySelector("#reader-passage");
const readerFontDecrease = document.querySelector("[data-reader-font-decrease]");
const readerFontIncrease = document.querySelector("[data-reader-font-increase]");
const readerPrint = document.querySelector("[data-reader-print]");
const readerDownload = document.querySelector("[data-reader-download]");
const readerShare = document.querySelector("[data-reader-share]");

let currentPassage = null;
let currentCitation = null;
let readerFontScale = 1;

let readerEditions = [];

const languageNames = {
  arb: "العربية",
  asm: "অসমীয়া",
  ben: "বাংলা",
  ceb: "Cebuano",
  ces: "Čeština",
  ckb: "کوردی",
  cmn: "中文",
  deu: "Deutsch",
  eng: "English",
  ewe: "Eʋegbe",
  fra: "Français",
  gaz: "Afaan Oromoo",
  grc: "Ἑλληνικά",
  guj: "ગુજરાતી",
  hat: "Kreyòl ayisyen",
  hau: "Hausa",
  heb: "עברית",
  hbo: "עברית מקראית",
  hin: "हिन्दी",
  ibo: "Igbo",
  ind: "Bahasa Indonesia",
  ita: "Italiano",
  jav: "Basa Jawa",
  kan: "ಕನ್ನಡ",
  kor: "한국어",

  ilo: "Ilokano",
  kik: "Gĩkũyũ",
  lit: "Lietuvių",
  lug: "Luganda",
  luo: "Dholuo",
  nde: "isiNdebele",
  nld: "Nederlands",
  nya: "Chichewa",
  ory: "ଓଡ଼ିଆ",
  rif: "Tarifit",
  som: "Soomaali",

  lin: "Lingála",
  mal: "മലയാളം",
  mar: "मराठी",
  mya: "မြန်မာ",
  npi: "नेपाली",
  orm: "Afaan Oromoo",
  pan: "ਪੰਜਾਬੀ",
  pes: "فارسی",
  por: "Português",
  ron: "Română",
  rus: "Русский",
  sna: "ChiShona",
  spa: "Español",
  srp: "Српски",
  sw: "Kiswahili",
  swh: "Kiswahili",
  tam: "தமிழ்",
  tdx: "Tandroy",
  tel: "తెలుగు",
  tgl: "Tagalog",
  uig: "ئۇيغۇرچە",
  urd: "اردو",
  vie: "Tiếng Việt",
  yor: "Yorùbá",
};

const getEditionID = (edition) =>
  edition.ID ?? edition.id ?? edition.EditionID ?? edition.editionId ?? "";

const getEditionName = (edition) => {
  const id = getEditionID(edition);
  const name = edition.Name ?? edition.name ?? edition.DisplayName ?? edition.displayName ?? id;
  return name && name !== id ? name : id;
};

const getLanguageCode = (edition) =>
  edition.LanguageCode ?? edition.languageCode ?? getEditionID(edition).split("-")[0] ?? "";

const englishLanguageNames = {
  arb: "Arabic",
  asm: "Assamese",
  ben: "Bengali",
  ceb: "Cebuano",
  ces: "Czech",
  ckb: "Central Kurdish",
  cmn: "Chinese Mandarin",
  deu: "German",
  eng: "English",
  ewe: "Ewe",
  fra: "French",
  gaz: "Oromo",
  grc: "Greek",
  guj: "Gujarati",
  hat: "Haitian Creole",
  hau: "Hausa",
  heb: "Hebrew",
  hbo: "Biblical Hebrew",
  hin: "Hindi",
  ibo: "Igbo",
  ind: "Indonesian",
  ita: "Italian",
  jav: "Javanese",
  kan: "Kannada",
  kor: "Korean",
  ilo: "Ilocano",
  kik: "Kikuyu",
  lit: "Lithuanian",
  lug: "Luganda",
  luo: "Luo",
  nde: "North Ndebele",
  nld: "Dutch",
  nya: "Chichewa",
  ory: "Odia",
  rif: "Tarifit",
  som: "Somali",
  lin: "Lingala",
  mal: "Malayalam",
  mar: "Marathi",
  mya: "Burmese",
  npi: "Nepali",
  orm: "Oromo",
  pan: "Punjabi",
  pes: "Persian",
  por: "Portuguese",
  ron: "Romanian",
  rus: "Russian",
  sna: "Shona",
  spa: "Spanish",
  srp: "Serbian",
  sw: "Swahili",
  swh: "Swahili",
  tam: "Tamil",
  tdx: "Tandroy-Mahafaly Malagasy",
  tel: "Telugu",
  tgl: "Tagalog",
  uig: "Uyghur",
  urd: "Urdu",
  vie: "Vietnamese",
  yor: "Yoruba",

  amh: "Amharic",
  plt: "Malagasy",
  twi: "Akan / Twi",
};

Object.assign(languageNames, {
  amh: "አማርኛ",
  plt: "Malagasy",
  twi: "Twi",
});

const getLanguageName = (code) => {
  const nativeName = languageNames[code];
  const englishName = englishLanguageNames[code];

  if (nativeName && englishName) {
    if (nativeName.localeCompare(englishName, undefined, { sensitivity: "base" }) === 0) {
      return nativeName;
    }

    return `${nativeName} (${englishName})`;
  }

  return nativeName ?? englishName ?? code.toUpperCase();
};

const romanCenturies = [
  ["I", 1, "1–100 CE"],
  ["II", 2, "101–200 CE"],
  ["III", 3, "201–300 CE"],
  ["IV", 4, "301–400 CE"],
  ["V", 5, "401–500 CE"],
  ["VI", 6, "501–600 CE"],
  ["VII", 7, "601–700 CE"],
  ["VIII", 8, "701–800 CE"],
  ["IX", 9, "801–900 CE"],
  ["X", 10, "901–1000 CE"],
  ["XI", 11, "1001–1100 CE"],
  ["XII", 12, "1101–1200 CE"],
  ["XIII", 13, "1201–1300 CE"],
  ["XIV", 14, "1301–1400 CE"],
  ["XV", 15, "1401–1500 CE"],
  ["XVI", 16, "1501–1600 CE"],
  ["XVII", 17, "1601–1700 CE"],
  ["XVIII", 18, "1701–1800 CE"],
  ["XIX", 19, "1801–1900 CE"],
  ["XX", 20, "1901–2000 CE"],
];

const romanToCentury = new Map(
  romanCenturies.map(([roman, number]) => [roman, number])
);

const normalizeCentury = (value) => {
  if (value == null || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 1 && value <= 20 ? Math.trunc(value) : null;
  }

  const text = String(value).trim().toUpperCase();
  if (romanToCentury.has(text)) return romanToCentury.get(text);

  const match = text.match(/^(\d{1,2})(?:ST|ND|RD|TH)?(?:\s*CENTURY)?(?:\s*CE)?$/);
  if (match) {
    const number = Number(match[1]);
    return number >= 1 && number <= 20 ? number : null;
  }

  return null;
};

const getEditionCentury = (edition) => {
  for (const value of [
    edition.Century,
    edition.century,
    edition.CenturyNumber,
    edition.centuryNumber,
  ]) {
    const century = normalizeCentury(value);
    if (century) return century;
  }

  // Spanning witnesses are assigned to the later century.
  for (const value of [
    edition.DateTo,
    edition.dateTo,
    edition.YearTo,
    edition.yearTo,
    edition.EndYear,
    edition.endYear,
    edition.LatestYear,
    edition.latestYear,
  ]) {
    const year = Number.parseInt(value, 10);
    if (Number.isFinite(year) && year >= 1 && year <= 2000) {
      return Math.ceil(year / 100);
    }
  }

  for (const value of [
    edition.DateFrom,
    edition.dateFrom,
    edition.YearFrom,
    edition.yearFrom,
    edition.StartYear,
    edition.startYear,
    edition.EarliestYear,
    edition.earliestYear,
  ]) {
    const year = Number.parseInt(value, 10);
    if (Number.isFinite(year) && year >= 1 && year <= 2000) {
      return Math.ceil(year / 100);
    }
  }

  return null;
};

const getCenturyOptions = () =>
  romanCenturies.map(([roman, number, range]) => ({
    code: String(number),
    name: `${roman} — ${range}`,
  }));

const populateEditionsForCentury = (centuryValue) => {
  const century = Number(centuryValue);
  const editions = readerEditions
    .filter((edition) => getEditionCentury(edition) === century)
    .sort((a, b) => getEditionName(a).localeCompare(getEditionName(b)));

  populateSelect(
    readerEdition,
    editions,
    getEditionID,
    getEditionName,
    editions.length
      ? "Select Bible / Manuscript / Historical Edition"
      : "No published witnesses in this century"
  );

  readerEdition.disabled = editions.length === 0;
};

const setPrimaryReaderLabel = (text) => {
  const label = readerLanguage?.closest("label");
  if (!label) return;

  let marker = label.querySelector("[data-reader-primary-label]");
  if (!marker) {
    const textNode = [...label.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
    );
    marker = document.createElement("span");
    marker.dataset.readerPrimaryLabel = "";
    if (textNode) {
      textNode.replaceWith(marker);
    } else {
      label.prepend(marker);
    }
  }
  marker.textContent = text;
};

const getLanguagesFromEditions = (editions) => {
  const codes = [...new Set(editions.map(getLanguageCode).filter(Boolean))];
  return codes
    .map((code) => ({ code, name: getLanguageName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const populateEditionsForLanguage = (languageCode) => {
  const editions = readerEditions
    .filter((edition) => getLanguageCode(edition) === languageCode)
    .sort((a, b) => getEditionName(a).localeCompare(getEditionName(b)));

  populateSelect(
    readerEdition,
    editions,
    getEditionID,
    getEditionName,
    "Select Bible / Translation"
  );

  readerEdition.disabled = editions.length === 0;
};


const readerApiBase =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8777"
    : "";

const readerApiPrefix = () => `${readerApiBase}/v1`;

const setReaderMessage = (message) => {
  if (readerMessage) readerMessage.textContent = message;
};

const readerTools = [
  readerFontDecrease,
  readerFontIncrease,
  readerPrint,
  readerDownload,
  readerShare,
].filter(Boolean);

const setReaderToolsEnabled = (enabled) => {
  for (const tool of readerTools) tool.disabled = !enabled;
};

const clearPassage = () => {
  currentPassage = null;
  currentCitation = null;
  setReaderToolsEnabled(false);
  if (readerPassage) readerPassage.replaceChildren();
};

const applyReaderFontScale = () => {
  if (readerPassage) {
    readerPassage.style.setProperty("--reader-font-scale", String(readerFontScale));
  }
};

const getVerseLabel = (verse) =>
  verse.Label ?? verse.label ?? verse.Number ?? verse.number ?? "";

const getVerseText = (verse) => verse.Text ?? verse.text ?? "";

const getVerseOriginalText = (verse) =>
  verse.OriginalText ?? verse.originalText ?? "";

const getVerseLexical = (verse) => {
  const lexical = verse.Lexical ?? verse.lexical ?? [];
  return Array.isArray(lexical) ? lexical : [];
};

const getLexicalStrong = (token) =>
  token.Strong ?? token.strong ?? "";

const scriptureBookAbbreviations = {
  GEN: "Gen", EXO: "Exod", LEV: "Lev", NUM: "Num", DEU: "Deut",
  JOS: "Josh", JDG: "Judg", RUT: "Ruth", "1SA": "1 Sam", "2SA": "2 Sam",
  "1KI": "1 Kgs", "2KI": "2 Kgs", "1CH": "1 Chr", "2CH": "2 Chr",
  EZR: "Ezra", NEH: "Neh", EST: "Esth", JOB: "Job", PSA: "Ps",
  PRO: "Prov", ECC: "Eccl", SNG: "Song", ISA: "Isa", JER: "Jer",
  LAM: "Lam", EZK: "Ezek", DAN: "Dan", HOS: "Hos", JOL: "Joel",
  AMO: "Amos", OBA: "Obad", JON: "Jonah", MIC: "Mic", NAM: "Nah",
  HAB: "Hab", ZEP: "Zeph", HAG: "Hag", ZEC: "Zech", MAL: "Mal",
  MAT: "Matt", MRK: "Mark", LUK: "Luke", JHN: "John", ACT: "Acts",
  ROM: "Rom", "1CO": "1 Cor", "2CO": "2 Cor", GAL: "Gal", EPH: "Eph",
  PHP: "Phil", COL: "Col", "1TH": "1 Thess", "2TH": "2 Thess",
  "1TI": "1 Tim", "2TI": "2 Tim", TIT: "Titus", PHM: "Phlm",
  HEB: "Heb", JAS: "Jas", "1PE": "1 Pet", "2PE": "2 Pet",
  "1JN": "1 John", "2JN": "2 John", "3JN": "3 John",
  JUD: "Jude", REV: "Rev"
};

const formatAccessedDate = (value) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const getReaderAccessUrl = () => {
  const params = new URLSearchParams(window.location.search);

  if (readerMode?.value === "century") {
    params.set("readerMode", "century");
    if (readerLanguage?.value) params.set("century", readerLanguage.value);
    else params.delete("century");
  } else {
    params.delete("century");
    if (readerMode?.value && readerMode.value !== "reader") {
      params.set("readerMode", readerMode.value);
    } else {
      params.delete("readerMode");
    }
  }

  if (readerEdition?.value) params.set("edition", readerEdition.value);
  else params.delete("edition");

  params.delete("language");
  params.delete("book");
  params.delete("chapter");

  const query = params.toString();
  return `${window.location.origin}/${query ? `?${query}` : ""}`;
};

const getVerseRangeFromPassage = () => {
  const verses = currentPassage?.Verses ?? currentPassage?.verses ?? [];
  if (!Array.isArray(verses) || verses.length === 0) return "";

  const first = getVerseLabel(verses[0]);
  const last = getVerseLabel(verses[verses.length - 1]);

  if (!first) return "";
  if (!last || first === last) return String(first);
  return `${first}–${last}`;
};

const formatTurabianWebCitation = () => {
  if (!currentPassage) return "";

  const rawBook =
    currentPassage.BookCode ??
    currentPassage.bookCode ??
    "";

  const book =
    scriptureBookAbbreviations[rawBook] ??
    rawBook;

  const chapter =
    currentPassage.Chapter ??
    currentPassage.chapter ??
    "";

  const verseRange = getVerseRangeFromPassage();

  const editionTitle =
    currentCitation?.editionTitle ??
    currentCitation?.EditionTitle ??
    "";

  const editionAbbreviation =
    currentCitation?.editionAbbreviation ??
    currentCitation?.EditionAbbreviation ??
    "";

  const accessedDate = formatAccessedDate(
    currentCitation?.accessedDate ??
    currentCitation?.AccessedDate ??
    ""
  );

  const accessUrl = getReaderAccessUrl();

  let version = editionTitle;
  if (editionAbbreviation) {
    version = editionTitle
      ? `${editionTitle} (${editionAbbreviation})`
      : editionAbbreviation;
  }

  const reference =
    book && chapter
      ? `${book} ${chapter}${verseRange ? `:${verseRange}` : ""}`
      : "";

  const parts = [reference, version].filter(Boolean);

  if (accessedDate) {
    parts.push(`accessed ${accessedDate}`);
  }

  if (accessUrl) {
    parts.push(accessUrl);
  }

  return parts.length ? `${parts.join(", ")}.` : "";
};

const passageAsText = () => {
  if (!currentPassage) return "";

  const book = currentPassage.BookCode ?? currentPassage.bookCode ?? "";
  const chapter = currentPassage.Chapter ?? currentPassage.chapter ?? "";
  const heading = `${book} ${chapter}`;
  const verses = (currentPassage.Verses ?? currentPassage.verses ?? [])
    .map((verse) => `${getVerseLabel(verse)} ${getVerseText(verse)}`)
    .join("\n");

  const citation = formatTurabianWebCitation();
  const citationBlock = citation
    ? `\nTurabian Citation\n${citation}\n`
    : "";

  return `${heading}\n\n${verses}\n${citationBlock}`;
};

const populateSelect = (select, items, getValue, getLabel, placeholder) => {
  select.replaceChildren();

  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);

  for (const item of items) {
    const option = document.createElement("option");
    option.value = getValue(item);
    option.textContent = getLabel(item);
    select.appendChild(option);
  }

  select.disabled = false;
};

const readerEditionLoadTimeoutMs = 15000;
const readerEditionRetryDelaysMs = [0, 500, 1500];

const delay = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const fetchReaderEditions = async () => {
  const controller = new AbortController();
  const timeoutID = window.setTimeout(
    () => controller.abort(),
    readerEditionLoadTimeoutMs
  );

  try {
    const response = await fetch(
      `${readerApiPrefix()}/reader/editions`,
      {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Editions HTTP ${response.status}`);
    }

    const catalog = await response.json();
    const editions = Array.isArray(catalog)
      ? catalog
      : catalog?.editions ?? catalog?.data ?? catalog?.items;

    if (!Array.isArray(editions)) {
      throw new Error("Reader editions response is not a catalog array");
    }

    return editions;
  } finally {
    window.clearTimeout(timeoutID);
  }
};

const loadEditions = async () => {
  if (!readerLanguage || !readerEdition) return;

  const centuryMode = readerMode?.value === "century";

  if (centuryMode) {
    setPrimaryReaderLabel("Century");
    populateSelect(
      readerLanguage,
      getCenturyOptions(),
      (century) => century.code,
      (century) => century.name,
      "Select century"
    );
    readerEdition.innerHTML =
      '<option value="">Select century first</option>';
    readerEdition.disabled = true;
    setReaderMessage("Select a century from I to XX.");
  } else {
    setPrimaryReaderLabel("Language");
    readerLanguage.disabled = true;
    setReaderMessage("Loading languages…");
  }

  let lastError = null;

  for (const retryDelay of readerEditionRetryDelaysMs) {
    if (retryDelay > 0) await delay(retryDelay);

    try {
      const fetchedEditions = await fetchReaderEditions();
      readerEditions =
        readerMode?.value === "base66"
          ? fetchedEditions.filter((edition) =>
              base66EditionIDs.has(getEditionID(edition))
            )
          : fetchedEditions;

      if (readerMode?.value === "base66" && readerEditions.length === 0) {
        throw new Error("Base66 reader editions are unavailable");
      }

      if (readerMode?.value === "century") {
        setPrimaryReaderLabel("Century");
        setReaderMessage("Select a century from I to XX.");
      } else {
        setPrimaryReaderLabel("Language");
        const languages = getLanguagesFromEditions(readerEditions);

        populateSelect(
          readerLanguage,
          languages,
          (language) => language.code,
          (language) => language.name,
          "Select language"
        );

        readerEdition.innerHTML =
          '<option value="">Select language first</option>';
        readerEdition.disabled = true;

        setReaderMessage("Select a language to begin.");
      }

      await restoreReaderQueryState();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  readerLanguage.innerHTML =
    '<option value="">Unable to load languages</option>';
  readerLanguage.disabled = true;
  readerEdition.innerHTML =
    '<option value="">Unable to load Bible / Translation</option>';
  readerEdition.disabled = true;
  readerBook.innerHTML =
    '<option value="">Select Bible / Translation first</option>';
  readerBook.disabled = true;
  readerChapter.innerHTML =
    '<option value="">Select book first</option>';
  readerChapter.disabled = true;

  console.error("Reader editions failed after retries:", lastError);
  setReaderMessage(
    "Unable to load languages right now. Please refresh and try again."
  );
};

const loadBooks = async (editionID) => {
  readerBook.disabled = true;
  readerChapter.disabled = true;
  clearPassage();

  if (!editionID) {
    readerBook.innerHTML =
      '<option value="">Select Bible / Translation first</option>';

    readerChapter.innerHTML =
      '<option value="">Select book first</option>';

    return;
  }

  setReaderMessage("Loading books…");

  const response = await fetch(
    `${readerApiPrefix()}/reader/books?edition=${encodeURIComponent(editionID)}`
  );

  if (!response.ok) {
    throw new Error(`Books HTTP ${response.status}`);
  }

  const books = await response.json();

  populateSelect(
    readerBook,
    books,
    (book) => book.Code,
    (book) => book.Name,
    "Select book"
  );

  readerChapter.innerHTML =
    '<option value="">Select book first</option>';

  setReaderMessage("Select a book.");
};

const loadChapters = async (editionID, bookCode) => {
  readerChapter.disabled = true;
  clearPassage();

  if (!editionID || !bookCode) return;

  setReaderMessage("Loading chapters…");

  const response = await fetch(
    `${readerApiPrefix()}/reader/chapters?edition=${encodeURIComponent(
      editionID
    )}&book=${encodeURIComponent(bookCode)}`
  );

  if (!response.ok) {
    throw new Error(`Chapters HTTP ${response.status}`);
  }

  const chapters = await response.json();

  populateSelect(
    readerChapter,
    chapters,
    (chapter) => String(chapter),
    (chapter) => String(chapter),
    "Select chapter"
  );

  setReaderMessage("Select a chapter.");
};

const normalizeBase66BookQuery = (value) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[.\s_-]+/g, " ");

const parseBase66Reference = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const match = raw.match(/^(.+?)(?:\s+(\d+)(?::(\d+))?)?$/u);
  if (!match) return null;

  const book = match[1]?.trim() ?? "";
  const chapter = match[2] ? Number(match[2]) : null;
  const verse = match[3] ? Number(match[3]) : null;

  if (!book) return null;
  if (chapter !== null && (!Number.isInteger(chapter) || chapter < 1)) return null;
  if (verse !== null && (!Number.isInteger(verse) || verse < 1)) return null;

  return { book, chapter, verse };
};

const resolveBase66BookOption = (query) => {
  const wanted = normalizeBase66BookQuery(query);

  return [...readerBook.options].find((option) => {
    if (!option.value) return false;

    return (
      normalizeBase66BookQuery(option.value) === wanted ||
      normalizeBase66BookQuery(option.textContent) === wanted
    );
  }) ?? null;
};

const focusBase66Verse = (verseNumber) => {
  if (!verseNumber || !readerPassage) return false;

  const verseBlocks = [...readerPassage.querySelectorAll(".reader-base66-verse")];

  for (const block of verseBlocks) {
    const label = block.querySelector("sup");
    if (String(label?.textContent ?? "").trim() !== String(verseNumber)) continue;

    block.classList.add("reader-base66-target");
    block.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  }

  return false;
};

const runBase66ReferenceQuery = async () => {
  if (readerMode?.value !== "base66") return;
  if (!readerEdition?.value) {
    setReaderMessage("Select a Bible / Translation first.");
    return;
  }

  const parsed = parseBase66Reference(readerBase66Reference?.value);
  if (!parsed) {
    setReaderMessage("Enter a passage such as John 3:16.");
    return;
  }

  await loadBooks(readerEdition.value);

  const bookOption = resolveBase66BookOption(parsed.book);
  if (!bookOption) {
    setReaderMessage(`Book not found: ${parsed.book}`);
    return;
  }

  readerBook.value = bookOption.value;

  if (parsed.chapter === null) {
    await loadChapters(readerEdition.value, readerBook.value);
    setReaderMessage("Select or enter a chapter.");
    syncReaderQuery();
    return;
  }

  await loadChapters(readerEdition.value, readerBook.value);

  const chapterValue = String(parsed.chapter);
  const chapterExists = [...readerChapter.options].some(
    (option) => option.value === chapterValue
  );

  if (!chapterExists) {
    setReaderMessage(`Chapter not found: ${parsed.chapter}`);
    return;
  }

  readerChapter.value = chapterValue;

  await loadPassage(
    readerEdition.value,
    readerBook.value,
    readerChapter.value
  );

  const params = new URLSearchParams(window.location.search);
  if (parsed.verse !== null) params.set("verse", String(parsed.verse));
  else params.delete("verse");
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${params.toString()}`
  );

  if (parsed.verse !== null && !focusBase66Verse(parsed.verse)) {
    setReaderMessage(`Verse ${parsed.verse} was not found in this chapter.`);
  }
};

const loadPassage = async (editionID, bookCode, chapter) => {
  clearPassage();

  if (!editionID || !bookCode || !chapter) return;

  setReaderMessage("Loading Scripture…");

  const layeredBase66 = readerMode?.value === "base66";

  const passageQuery = new URLSearchParams({
    edition: editionID,
    book: bookCode,
    chapter: String(chapter),
  });

  if (layeredBase66) {
    passageQuery.set("layered", "base66");
  }

  const response = await fetch(
    `${readerApiPrefix()}/reader/passage?${passageQuery.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Passage HTTP ${response.status}`);
  }

    const payload = await response.json();
    const passage = payload.passage ?? payload.Passage ?? payload;
    const versesPayload = passage.Verses ?? passage.verses ?? [];
    const citation = payload.citation ?? payload.Citation ?? null;

    currentPassage = passage;
    currentCitation = citation;

  const heading = document.createElement("h4");
    heading.textContent = `${passage.BookCode ?? passage.bookCode} ${passage.Chapter ?? passage.chapter}`;
  readerPassage.appendChild(heading);

  const verses = document.createElement("div");
  verses.className = "reader-verses";

    for (const verse of versesPayload) {
    const verseBlock = document.createElement("div");
    verseBlock.className = "reader-base66-verse";

    const translationLine = document.createElement("p");
    translationLine.className = "reader-base66-translation";

    const number = document.createElement("sup");
    number.textContent = getVerseLabel(verse);

    translationLine.appendChild(number);
    translationLine.append(" ");
    translationLine.append(getVerseText(verse));

    verseBlock.appendChild(translationLine);

    if (layeredBase66) {
      const originalText = getVerseOriginalText(verse).trim();

      if (originalText) {
        const originalLine = document.createElement("p");
        originalLine.className = "reader-base66-original";
        originalLine.dir = "auto";
        originalLine.textContent = originalText;
        verseBlock.appendChild(originalLine);
      }

      const strongValues = getVerseLexical(verse)
        .map(getLexicalStrong)
        .filter(Boolean);

      if (strongValues.length) {
        const strongLine = document.createElement("p");
        strongLine.className = "reader-base66-strong";
        strongLine.textContent = `Strong: ${strongValues.join(" · ")}`;
        verseBlock.appendChild(strongLine);
      }
    }

    verses.appendChild(verseBlock);
  }

  readerPassage.appendChild(verses);

    if (citation) {
      const citationText = formatTurabianWebCitation();

      if (citationText) {
        const citationParagraph = document.createElement("p");
        citationParagraph.className = "reader-citation";
        citationParagraph.textContent = citationText;
        readerPassage.appendChild(citationParagraph);
      }
    }

  readerPassage.dir =
    editionID === "hebwlc-ebible" ? "rtl" : "ltr";

  applyReaderFontScale();
  setReaderToolsEnabled(true);
  setReaderMessage("");
};

const runExbase66Query = async () => {
  if (readerMode?.value !== "exbase66") return;

  const passageID = readerExbase66PassageID?.value.trim() ?? "";

  if (!/^\d+$/.test(passageID) || Number(passageID) < 1) {
    setReaderMessage("Enter a valid EXBase66 passage ID.");
    return;
  }

  if (!readerPassage) return;

  setReaderMessage("Loading EXBase66 passage and relations...");
  readerPassage.replaceChildren();
  setReaderToolsEnabled(false);

  try {
    const [passageResponse, relationsResponse] = await Promise.all([
      fetch(`/v1/exbase66/passage/${encodeURIComponent(passageID)}`),
      fetch(`/v1/exbase66/relations/${encodeURIComponent(passageID)}`),
    ]);

    if (!passageResponse.ok) {
      throw new Error(`Passage request failed (${passageResponse.status})`);
    }

    if (!relationsResponse.ok) {
      throw new Error(`Relations request failed (${relationsResponse.status})`);
    }

    const passage = await passageResponse.json();
    const relations = await relationsResponse.json();

    const heading = document.createElement("h4");
    heading.textContent =
      passage.canonical_passage_key || `EXBase66 passage ${passageID}`;
    readerPassage.appendChild(heading);

    const metadata = document.createElement("dl");
    metadata.className = "reader-exbase66-metadata";

    const fields = [
      ["Passage ID", passage.passage_id],
      ["Canonical key", passage.canonical_passage_key],
      ["Book", passage.book_code],
      ["Chapter", passage.chapter],
      ["Graph node", passage.graph_node_id],
    ];

    for (const [label, value] of fields) {
      if (value === null || value === undefined || value === "") continue;

      const term = document.createElement("dt");
      term.textContent = label;

      const description = document.createElement("dd");
      description.textContent = String(value);

      metadata.append(term, description);
    }

    readerPassage.appendChild(metadata);

    const relationsHeading = document.createElement("h4");
    relationsHeading.textContent = "Relations";
    readerPassage.appendChild(relationsHeading);

    if (!Array.isArray(relations) || relations.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No passage-keyed EXBase66 relations are available for this passage.";
      readerPassage.appendChild(empty);
    } else {
      const list = document.createElement("ul");
      list.className = "reader-exbase66-relations";

      for (const relation of relations) {
        const item = document.createElement("li");

        const title = document.createElement("strong");
        title.textContent = relation.relation_type || "Relation";
        item.appendChild(title);

        const details = [
          relation.from_passage_id != null
            ? `from ${relation.from_passage_id}`
            : "",
          relation.to_passage_id != null
            ? `to ${relation.to_passage_id}`
            : "",
          relation.source_id ? `source ${relation.source_id}` : "",
          relation.source_ref ? `ref ${relation.source_ref}` : "",
          relation.evidence_ref ? `evidence ${relation.evidence_ref}` : "",
        ].filter(Boolean);

        if (details.length) {
          item.appendChild(document.createTextNode(` — ${details.join(" · ")}`));
        }

        list.appendChild(item);
      }

      readerPassage.appendChild(list);
    }

    setReaderMessage("");
  } catch (error) {
    console.error("EXBase66 query failed:", error);
    setReaderMessage(
      "EXBase66 results are temporarily unavailable. No result was fabricated."
    );
  }
};

readerExbase66PassageID?.addEventListener("input", () => {
  if (!readerExbase66Search) return;

  readerExbase66Search.disabled =
    readerMode?.value !== "exbase66" ||
    !readerExbase66PassageID.value.trim();
});

readerExbase66PassageID?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void runExbase66Query();
  }
});

readerExbase66Search?.addEventListener("click", () => {
  void runExbase66Query();
});

const syncReaderQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const values = {
    readerMode: readerMode?.value,
    century: readerMode?.value === "century" ? readerLanguage?.value : "",
    language: readerMode?.value === "century" ? "" : readerLanguage?.value,
    edition: readerEdition?.value,
    book: readerBook?.value,
    chapter: readerChapter?.value,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  const nextURL = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(null, "", nextURL);
};

const resetReaderSelectionState = () => {
  if (readerLanguage) {
    readerLanguage.value = "";
    readerLanguage.innerHTML = '<option value="">Select language</option>';
  }

  if (readerEdition) {
    readerEdition.value = "";
    readerEdition.innerHTML =
      '<option value="">Select language first</option>';
  }

  if (readerBook) {
    readerBook.value = "";
    readerBook.innerHTML =
      '<option value="">Select Bible / Translation first</option>';
  }

  if (readerChapter) {
    readerChapter.value = "";
    readerChapter.innerHTML =
      '<option value="">Select book first</option>';
  }
};

const restoreReaderSelectionState = () => {
  if (
    !readerLanguage ||
    !readerEdition ||
    !readerBook ||
    !readerChapter ||
    readerEditions.length === 0
  ) {
    return;
  }

  populateSelect(
    readerLanguage,
    getLanguagesFromEditions(readerEditions),
    (language) => language.code,
    (language) => language.name,
    "Select language"
  );

  readerEdition.innerHTML =
    '<option value="">Select language first</option>';
  readerEdition.disabled = true;
  readerBook.innerHTML =
    '<option value="">Select Bible / Translation first</option>';
  readerBook.disabled = true;
  readerChapter.innerHTML =
    '<option value="">Select book first</option>';
  readerChapter.disabled = true;
};

const restoreReaderQueryState = async () => {
  if (!readerLanguage || !readerEdition || !readerBook || !readerChapter) return;
  if (initialReaderQueryRestored) return;

  initialReaderQueryRestored = true;
  const requestedMode = initialReaderQuery.get("readerMode");
  if (readerMode && readerModeDescriptions[requestedMode]) {
    // Initial mode setup already happened before loadEditions().
    // Do not call setReaderModeState() here because it resets the
    // freshly populated century/language options before query restoration.
    readerMode.value = requestedMode;
    setReaderModeMessage(
      readerModeDescriptions[requestedMode] ?? readerModeDescriptions.reader
    );
    setPrimaryReaderLabel(
      requestedMode === "century" ? "Century" : "Language"
    );
  }

  if (requestedMode === "concordance") return;

  if (requestedMode === "century") {
    const requestedCentury = initialReaderQuery.get("century");
    if (
      requestedCentury &&
      [...readerLanguage.options].some(
        (option) => option.value === requestedCentury
      )
    ) {
      readerLanguage.value = requestedCentury;
      populateEditionsForCentury(requestedCentury);

      const requestedEdition = initialReaderQuery.get("edition");
      if (
        requestedEdition &&
        [...readerEdition.options].some(
          (option) => option.value === requestedEdition
        )
      ) {
        readerEdition.value = requestedEdition;
        await loadBooks(requestedEdition);

        const requestedBook = initialReaderQuery.get("book");
        if (
          requestedBook &&
          [...readerBook.options].some(
            (option) => option.value === requestedBook
          )
        ) {
          readerBook.value = requestedBook;
          await loadChapters(requestedEdition, requestedBook);

          const requestedChapter = initialReaderQuery.get("chapter");
          if (
            requestedChapter &&
            [...readerChapter.options].some(
              (option) => option.value === requestedChapter
            )
          ) {
            readerChapter.value = requestedChapter;
            await loadPassage(
              requestedEdition,
              requestedBook,
              requestedChapter
            );
          }
        }
      }
    }

    syncReaderQuery();
    return;
  }

  const requestedLanguage = initialReaderQuery.get("language");
  if (
    requestedLanguage &&
    [...readerLanguage.options].some((option) => option.value === requestedLanguage)
  ) {
    readerLanguage.value = requestedLanguage;
    populateEditionsForLanguage(requestedLanguage);

    const requestedEdition = initialReaderQuery.get("edition");
    if (
      requestedEdition &&
      [...readerEdition.options].some((option) => option.value === requestedEdition)
    ) {
      readerEdition.value = requestedEdition;
      await loadBooks(requestedEdition);

      const requestedBook = initialReaderQuery.get("book");
      if (
        requestedBook &&
        [...readerBook.options].some((option) => option.value === requestedBook)
      ) {
        readerBook.value = requestedBook;
        await loadChapters(requestedEdition, requestedBook);

        const requestedChapter = initialReaderQuery.get("chapter");
        if (
          requestedChapter &&
          [...readerChapter.options].some(
            (option) => option.value === requestedChapter
          )
        ) {
          readerChapter.value = requestedChapter;
          await loadPassage(
            requestedEdition,
            requestedBook,
            requestedChapter
          );
        }
      }
    }
  }

  syncReaderQuery();
};

readerFontDecrease?.addEventListener("click", () => {
  readerFontScale = Math.max(0.85, Number((readerFontScale - 0.1).toFixed(2)));
  applyReaderFontScale();
});

readerFontIncrease?.addEventListener("click", () => {
  readerFontScale = Math.min(1.5, Number((readerFontScale + 0.1).toFixed(2)));
  applyReaderFontScale();
});

readerPrint?.addEventListener("click", () => {
  if (currentPassage) window.print();
});

readerDownload?.addEventListener("click", () => {
  if (!currentPassage) return;

  const blob = new Blob([passageAsText()], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    `${currentPassage.EditionID}-${currentPassage.BookCode}-${currentPassage.Chapter}.txt`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

readerShare?.addEventListener("click", async () => {
  if (!currentPassage) return;

  const text = passageAsText();
  const title = `${currentPassage.BookCode} ${currentPassage.Chapter}`;

  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setReaderMessage("Scripture copied to clipboard.");
      return;
    }

    setReaderMessage("Sharing is not available in this browser.");
  } catch (error) {
    if (error?.name !== "AbortError") {
      setReaderMessage("Unable to share this passage.");
      console.error(error);
    }
  }
});

if (readerLanguage && readerEdition && readerBook && readerChapter) {
  readerMode?.addEventListener("change", async () => {
    setPrimaryReaderLabel(
      readerMode.value === "century" ? "Century" : "Language"
    );
    setReaderModeState(readerMode.value);
    syncReaderQuery();

    if (
      readerMode.value === "reader" ||
      readerMode.value === "base66" ||
      readerMode.value === "century"
    ) {
      await loadEditions();
    }
  });

  const requestedMode = initialReaderQuery.get("readerMode");
  if (requestedMode && readerModeDescriptions[requestedMode]) {
    readerMode.value = requestedMode;
  }

  setReaderModeState(readerMode?.value ?? "reader");

  readerLanguage.addEventListener("change", () => {
    clearPassage();

    readerEdition.innerHTML =
      '<option value="">Select Bible / Translation</option>';
    readerBook.innerHTML =
      '<option value="">Select Bible / Translation first</option>';
    readerBook.disabled = true;
    readerChapter.innerHTML =
      '<option value="">Select book first</option>';
    readerChapter.disabled = true;
    setReaderToolsEnabled(false);

    if (!readerLanguage.value) {
      readerEdition.disabled = true;
      setReaderMessage(
        readerMode?.value === "century"
          ? "Select a century from I to XX."
          : "Select a language to begin."
      );
      syncReaderQuery();
      return;
    }

    if (readerMode?.value === "century") {
      populateEditionsForCentury(readerLanguage.value);
      setReaderMessage(
        readerEdition.disabled
          ? "No published witnesses are available for this century yet."
          : "Select a Bible / Manuscript / Historical Edition."
      );
    } else {
      populateEditionsForLanguage(readerLanguage.value);
      setReaderMessage("Select a Bible / Translation.");
    }
    syncReaderQuery();
  });

  readerEdition.addEventListener("change", async () => {
    try {
      await loadBooks(readerEdition.value);
      if (readerBase66Read) {
        readerBase66Read.disabled =
          readerMode?.value !== "base66" ||
          !readerEdition.value ||
          !readerBase66Reference?.value.trim();
      }
    } catch (error) {
      setReaderMessage("Unable to load books.");
      console.error(error);
    }
    syncReaderQuery();
  });

  readerBase66Reference?.addEventListener("input", () => {
    if (readerBase66Read) {
      readerBase66Read.disabled =
        readerMode?.value !== "base66" ||
        !readerEdition?.value ||
        !readerBase66Reference.value.trim();
    }
  });

  readerBase66Reference?.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    await runBase66ReferenceQuery();
  });

  readerBase66Read?.addEventListener("click", async () => {
    await runBase66ReferenceQuery();
  });

  readerBook.addEventListener("change", async () => {
    try {
      await loadChapters(
        readerEdition.value,
        readerBook.value
      );
    } catch (error) {
      setReaderMessage("Unable to load chapters.");
      console.error(error);
    }
    syncReaderQuery();
  });

  readerChapter.addEventListener("change", async () => {
    try {
      await loadPassage(
        readerEdition.value,
        readerBook.value,
        readerChapter.value
      );
    } catch (error) {
      setReaderMessage("Unable to load this chapter.");
      console.error(error);
    }
    syncReaderQuery();
  });

  if (
    readerMode?.value === "reader" ||
    readerMode?.value === "base66" ||
    readerMode?.value === "century"
  ) {
    loadEditions();
  }
}

/* =====================================================================
   SCRIPTUREI_BIBLE_INDEX_FILTER_R1
   Presentation-only filtering over statically materialized Bible links.
   ===================================================================== */

const bibleIndexSearch = document.querySelector("#bible-search");
const bibleIndexClear = document.querySelector("[data-bible-search-clear]");
const bibleIndexStatus = document.querySelector("[data-bible-search-status]");
const bibleIndexDisclosure = document.querySelector(
  "[data-bible-index-disclosure]"
);
const bibleIndexItems = [
  ...document.querySelectorAll(
    "[data-scripturei-world-bibles] li"
  ),
];

const normalizeBibleIndexText = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .toLocaleLowerCase()
    .trim();

const updateBibleIndexFilter = () => {
  if (!bibleIndexSearch) return;

  const query = normalizeBibleIndexText(bibleIndexSearch.value);
  let visible = 0;

  // A non-empty query reveals matches, so open the disclosure automatically.
  if (query && bibleIndexDisclosure) {
    bibleIndexDisclosure.open = true;
  }

  for (const item of bibleIndexItems) {
    const link = item.querySelector("a[data-edition-id]");
    const searchable = normalizeBibleIndexText(
      [
        item.textContent,
        link?.dataset.editionId,
        link?.getAttribute("lang"),
      ]
        .filter(Boolean)
        .join(" ")
    );

    const matches = !query || searchable.includes(query);

    item.hidden = !matches;

    if (matches) visible += 1;
  }

  if (bibleIndexStatus) {
    bibleIndexStatus.textContent = query
      ? `${visible} of ${bibleIndexItems.length} published editions shown.`
      : `${bibleIndexItems.length} published editions.`;
  }
};

if (bibleIndexSearch) {
  bibleIndexSearch.addEventListener(
    "input",
    updateBibleIndexFilter
  );

  updateBibleIndexFilter();
}

if (bibleIndexClear && bibleIndexSearch) {
  bibleIndexClear.addEventListener("click", () => {
    bibleIndexSearch.value = "";
    updateBibleIndexFilter();
    bibleIndexSearch.focus();
  });
}

/* =====================================================================
   SCRIPTUREi Three-Zone Peaceful Reader R1
   Drives existing Reader/Base66/EXBase66 state through #reader-mode.
   ===================================================================== */

const readerBase66Toggle = document.querySelector("[data-reader-base66-toggle]");
const readerExbase66Toggle = document.querySelector("[data-reader-exbase66-toggle]");
const readerBase66Panel = document.querySelector("[data-reader-base66-panel]");
const readerExbase66Panel = document.querySelector("[data-reader-exbase66-panel]");
const readerContextTitle = document.querySelector("[data-reader-context-title]");
const readerContextCloseButtons = document.querySelectorAll("[data-reader-context-close]");

const setReaderContextPanel = async (context) => {
  const next =
    context === "base66"
      ? "base66"
      : context === "exbase66"
        ? "exbase66"
        : "reader";

  if (readerBase66Panel) readerBase66Panel.hidden = next !== "base66";
  if (readerExbase66Panel) readerExbase66Panel.hidden = next !== "exbase66";

  readerBase66Toggle?.setAttribute(
    "aria-expanded",
    String(next === "base66")
  );

  readerExbase66Toggle?.setAttribute(
    "aria-expanded",
    String(next === "exbase66")
  );

  if (readerContextTitle) {
    readerContextTitle.textContent =
      next === "base66"
        ? "BIBLE + BASE66"
        : next === "exbase66"
          ? "BIBLE + EXBASE66"
          : "BIBLE";
  }

  if (!readerMode || readerMode.value === next) return;

  readerMode.value = next;
  readerMode.dispatchEvent(new Event("change", { bubbles: true }));
};

readerBase66Toggle?.addEventListener("click", () => {
  void setReaderContextPanel(
    readerBase66Panel?.hidden === false ? "reader" : "base66"
  );
});

readerExbase66Toggle?.addEventListener("click", () => {
  void setReaderContextPanel(
    readerExbase66Panel?.hidden === false ? "reader" : "exbase66"
  );
});

readerContextCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    void setReaderContextPanel("reader");
  });
});

const syncThreeZoneFromReaderMode = () => {
  const mode = readerMode?.value ?? "reader";

  if (readerBase66Panel) readerBase66Panel.hidden = mode !== "base66";
  if (readerExbase66Panel) readerExbase66Panel.hidden = mode !== "exbase66";

  readerBase66Toggle?.setAttribute(
    "aria-expanded",
    String(mode === "base66")
  );

  readerExbase66Toggle?.setAttribute(
    "aria-expanded",
    String(mode === "exbase66")
  );

  if (readerContextTitle) {
    readerContextTitle.textContent =
      mode === "base66"
        ? "BIBLE + BASE66"
        : mode === "exbase66"
          ? "BIBLE + EXBASE66"
          : "BIBLE";
  }
};

readerMode?.addEventListener("change", syncThreeZoneFromReaderMode);
syncThreeZoneFromReaderMode();

/* =====================================================================
   SCRIPTUREi PUBLISHED BIBLE SHOWCASE R1
   Source: statically materialized published-edition index.
   ===================================================================== */

const publishedBibleShowcase =
  document.querySelector("[data-published-bible-showcase]");

if (publishedBibleShowcase) {
  const sourceLinks = [
    ...document.querySelectorAll(
      "[data-scripturei-world-bibles] a[data-edition-id]"
    ),
  ];

  const seenEditionIDs = new Set();

  const publishedBibles = sourceLinks
    .map((link) => {
      const editionId = link.dataset.editionId?.trim() ?? "";
      const label = link.textContent?.trim() ?? "";
      const lang = link.getAttribute("lang") ?? "";
      const dir = link.getAttribute("dir") ?? "";

      if (!editionId || !label || seenEditionIDs.has(editionId)) {
        return null;
      }

      seenEditionIDs.add(editionId);

      const parts = label
        .split(/\s+—\s+/u)
        .map((part) => part.trim())
        .filter(Boolean);

      return {
        editionId,
        href: link.getAttribute("href") || `/?edition=${encodeURIComponent(editionId)}`,
        lang,
        dir,
        language: parts.length >= 2 ? parts[0] : "",
        bibleTerm: parts.length >= 3 ? parts[1] : "",
        editionTitle:
          parts.length >= 3
            ? parts.slice(2).join(" — ")
            : label,
        originalLabel: label,
      };
    })
    .filter(Boolean);

  const stage =
    publishedBibleShowcase.querySelector(".published-bible-stage");

  const languageNode =
    publishedBibleShowcase.querySelector("[data-published-bible-language]");

  const bibleTermNode =
    publishedBibleShowcase.querySelector("[data-published-bible-term]");

  const editionNode =
    publishedBibleShowcase.querySelector("[data-published-bible-edition]");

  const readLink =
    publishedBibleShowcase.querySelector("[data-published-bible-read]");

  const previousButton =
    publishedBibleShowcase.querySelector("[data-published-bible-prev]");

  const nextButton =
    publishedBibleShowcase.querySelector("[data-published-bible-next]");

  const pauseButton =
    publishedBibleShowcase.querySelector("[data-published-bible-pause]");

  const reduceMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let publishedBibleIndex = 0;
  let publishedBibleTimer = null;
  let publishedBiblePaused = reduceMotion;

  const renderPublishedBible = (index) => {
    if (!publishedBibles.length) return;

    publishedBibleIndex =
      (index + publishedBibles.length) % publishedBibles.length;

    const bible = publishedBibles[publishedBibleIndex];

    if (languageNode) {
      languageNode.textContent =
        bible.language || bible.lang || "Published Bible";
    }

    if (bibleTermNode) {
      bibleTermNode.textContent =
        bible.bibleTerm || bible.editionTitle;
    }

    if (editionNode) {
      editionNode.textContent = bible.editionTitle;
    }

    for (const node of [languageNode, bibleTermNode, editionNode]) {
      if (!node) continue;

      if (bible.lang) {
        node.setAttribute("lang", bible.lang);
      } else {
        node.removeAttribute("lang");
      }

      if (bible.dir) {
        node.setAttribute("dir", bible.dir);
      } else {
        node.removeAttribute("dir");
      }
    }

    if (readLink) {
      readLink.href = bible.href;
      readLink.dataset.editionId = bible.editionId;
      readLink.setAttribute(
        "aria-label",
        `Read ${bible.originalLabel}`
      );
    }
  };

  const changePublishedBible = (delta) => {
    if (!stage) {
      renderPublishedBible(publishedBibleIndex + delta);
      return;
    }

    stage.classList.add("is-changing");

    window.setTimeout(() => {
      renderPublishedBible(publishedBibleIndex + delta);
      stage.classList.remove("is-changing");
    }, reduceMotion ? 0 : 450);
  };

  const stopPublishedBibleRotation = () => {
    if (publishedBibleTimer !== null) {
      window.clearInterval(publishedBibleTimer);
      publishedBibleTimer = null;
    }
  };

  const startPublishedBibleRotation = () => {
    stopPublishedBibleRotation();

    if (publishedBiblePaused || publishedBibles.length < 2) return;

    publishedBibleTimer = window.setInterval(() => {
      changePublishedBible(1);
    }, 3000);
  };

  previousButton?.addEventListener("click", () => {
    changePublishedBible(-1);
    startPublishedBibleRotation();
  });

  nextButton?.addEventListener("click", () => {
    changePublishedBible(1);
    startPublishedBibleRotation();
  });

  pauseButton?.addEventListener("click", () => {
    publishedBiblePaused = !publishedBiblePaused;

    pauseButton.setAttribute(
      "aria-pressed",
      String(publishedBiblePaused)
    );

    pauseButton.textContent =
      publishedBiblePaused ? "Resume" : "Pause";

    if (publishedBiblePaused) {
      stopPublishedBibleRotation();
    } else {
      startPublishedBibleRotation();
    }
  });

  if (pauseButton && publishedBiblePaused) {
    pauseButton.setAttribute("aria-pressed", "true");
    pauseButton.textContent = "Resume";
  }

  renderPublishedBible(0);
  startPublishedBibleRotation();
}

/* =====================================================================
   SCRIPTUREI_AT_A_GLANCE_R1
   Runtime-derived coverage snapshot. Every number is computed from the
   governed local published-Bible index (or the Base66 governed set);
   metrics with no governed local source are labelled "Pending governed
   sync" rather than fabricated.
   ===================================================================== */

const setGlanceMetric = (metric, value, { pending = false } = {}) => {
  const node = document.querySelector(
    `[data-scripturei-glance] [data-glance-metric="${metric}"]`
  );
  const valueNode = node?.querySelector("[data-glance-value]");
  if (!valueNode) return;

  valueNode.textContent = String(value);
  node.dataset.state = pending ? "pending" : "resolved";
};

const renderScriptureiGlance = () => {
  const glance = document.querySelector("[data-scripturei-glance]");
  if (!glance) return;

  const publishedLinks = [
    ...glance.ownerDocument.querySelectorAll(
      "[data-scripturei-world-bibles] a[data-edition-id]"
    ),
  ];

  const editionIds = new Set();
  const languageIdentities = new Set();

  for (const link of publishedLinks) {
    const editionId = link.dataset.editionId?.trim() ?? "";
    if (editionId) editionIds.add(editionId);

    // Language identity rule: prefer the link's lang attribute; otherwise
    // the leading label segment before " — " (e.g. "Kiswahili"); otherwise
    // a leading 3-letter edition-ID prefix before the first "-" (e.g.
    // "arb" in "arb-vd"). Identities that cannot be established are
    // skipped; the count is over whatever is determinable across the list.
    let identity = link.getAttribute("lang")?.trim() ?? "";

    if (!identity) {
      const label = link.textContent?.trim() ?? "";
      identity = label.split(/\s+—\s+/u)[0]?.trim() ?? "";
    }

    if (!identity) {
      const prefix = editionId.split("-")[0] ?? "";
      if (/^[a-z]{3}$/iu.test(prefix)) identity = prefix;
    }

    if (identity) languageIdentities.add(identity.toLocaleLowerCase());
  }

  setGlanceMetric("languages-published", languageIdentities.size);
  setGlanceMetric("bibles-published", editionIds.size);

  const base66Published = [...base66EditionIDs].filter((id) =>
    editionIds.has(id)
  ).length;
  setGlanceMetric("base66-published", base66Published);

  for (const metric of [
    "ready-ingestion",
    "in-validation",
    "catalog-editions",
    "catalog-languages",
  ]) {
    setGlanceMetric(metric, "Pending governed sync", { pending: true });
  }

  // Architecturally specified: 9 discovery forces plus YouVersion as a
  // separate discovery plane.
  setGlanceMetric("discovery", "9 + 1");
};

renderScriptureiGlance();
