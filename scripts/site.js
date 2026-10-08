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

  setReaderModeMessage(description);

  // The View control is the single navigation control for the three reader
  // modes; it solely drives which context panel is visible.
  if (readerBase66Panel) readerBase66Panel.hidden = mode !== "base66";
  if (readerExbase66Panel) readerExbase66Panel.hidden = mode !== "exbase66";

  // EXBase66 is a read-only governance/evidence panel. Opening or closing it
  // must leave the loaded Bible reader (edition, book, chapter, and passage)
  // untouched, so it never resets the reader selection or clears the passage.
  if (mode === "exbase66") {
    ensureExbase66MenusLoaded();
    return;
  }

  const readerAvailable =
    mode === "reader" || mode === "base66" || mode === "century";

  for (const control of [
    readerLanguage,
    readerEdition,
    readerBook,
    readerChapter,
  ]) {
    if (control) control.disabled = !readerAvailable;
  }

  resetReaderSelectionState();
  clearPassage();

  if (readerAvailable) {
    setReaderMessage("Loading languages…");
  } else {
    setReaderMessage(description);
  }
};

const readerLanguage = document.querySelector("#reader-language");
const readerEdition = document.querySelector("#reader-edition");
const readerBook = document.querySelector("#reader-book");
const readerChapter = document.querySelector("#reader-chapter");
const readerBase66Panel = document.querySelector("[data-reader-base66-panel]");
const readerExbase66Book = document.querySelector("[data-exbase66-book]");
const readerExbase66Chapter = document.querySelector("[data-exbase66-chapter]");
const readerExbase66Verse = document.querySelector("[data-exbase66-verse]");
const readerExbase66Display = document.querySelector("[data-exbase66-display]");
const readerExbase66Edition = document.querySelector("[data-exbase66-edition]");
const readerExbase66Panel = document.querySelector("[data-reader-exbase66-panel]");
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

/* =====================================================================
   EXBase66 MENU-DRIVEN EVIDENCE POC
   Menus only: the fixed governed English edition is eng-eng-asv. Book and
   chapter options come from the existing Reader API. There is no governed
   reference-to-passage-ID binding and no verse-level Reader endpoint, so
   the evidence area reports that honestly and fabricates no values.
   ===================================================================== */

const exbase66EditionID = "eng-eng-asv";
const EXBASE66_VERSE_UNAVAILABLE =
  "Verse selection isn't available for this chapter";
let exbase66BooksLoaded = false;

const setExbase66Message = (message) => {
  const node = readerExbase66Panel?.querySelector("[data-exbase66-message]");
  if (node) node.textContent = message;
};

const makeExbase66Option = (text) => {
  const option = document.createElement("option");
  option.value = "";
  option.textContent = text;
  return option;
};

const resetExbase66VerseMenu = (chapterSelected) => {
  if (!readerExbase66Verse) return;

  readerExbase66Verse.replaceChildren(
    makeExbase66Option(
      chapterSelected ? EXBASE66_VERSE_UNAVAILABLE : "Select chapter first"
    )
  );

  readerExbase66Verse.disabled = true;
};

const populateExbase66VerseMenu = (bookCode, chapter) => {
  if (!readerExbase66Verse) return;

  const isPsalm23 =
    bookCode === EXBASE66_PSALM23_BOOK_CODE &&
    chapter === EXBASE66_PSALM23_CHAPTER;

  // Only the verified Psalm 23 binding is offered; every other selection keeps
  // the verse menu disabled because no governed verse list exists for it and no
  // verse-list endpoint is exposed. Nothing is inferred or fabricated.
  if (!isPsalm23) {
    resetExbase66VerseMenu(Boolean(chapter));
    return;
  }

  const options = [makeExbase66Option("Select verse (optional)")];

  for (let verse = 1; verse <= EXBASE66_PSALM23_VERSE_COUNT; verse += 1) {
    const option = document.createElement("option");
    option.value = String(verse);
    option.textContent = `Psalm 23:${verse}`;
    options.push(option);
  }

  readerExbase66Verse.replaceChildren(...options);
  readerExbase66Verse.disabled = false;
};

const updateExbase66EditionLabel = () => {
  if (!readerExbase66Edition) return;

  const edition = readerEditions.find(
    (item) => getEditionID(item) === exbase66EditionID
  );
  const name = edition ? getEditionName(edition) : "";

  if (!name || name === exbase66EditionID) return;

  readerExbase66Edition.textContent =
    `Governed English edition: ${exbase66EditionID} — ${name}`;
};

const loadExbase66Books = async () => {
  if (!readerExbase66Book) return;

  readerExbase66Book.disabled = true;
  setExbase66Message("Loading EXBase66 books…");

  try {
    const response = await fetch(
      `${readerApiPrefix()}/reader/books?edition=${encodeURIComponent(
        exbase66EditionID
      )}`
    );

    if (!response.ok) throw new Error(`Books HTTP ${response.status}`);

    const books = await response.json();

    populateSelect(
      readerExbase66Book,
      books,
      (book) => book.Code,
      (book) => book.Name,
      "Select book"
    );

    setExbase66Message(
      "Select a book, then a chapter. Evidence is displayed only when you press the Display-evidence button."
    );
  } catch (error) {
    exbase66BooksLoaded = false;
    console.error("EXBase66 book menu failed:", error);
    readerExbase66Book.replaceChildren(makeExbase66Option("Unable to load books"));
    readerExbase66Book.disabled = true;
    setExbase66Message(
      "Unable to load the EXBase66 book menu right now. No evidence was fabricated."
    );
  }
};

const loadExbase66Editions = async () => {
  if (readerEditions.length > 0) {
    updateExbase66EditionLabel();
    return;
  }

  try {
    readerEditions = await fetchReaderEditions();
  } catch (error) {
    console.error("EXBase66 edition lookup failed:", error);
    readerEditions = [];
  }

  // Falls back to the static governed label already present in the markup
  // when the editions catalog is unavailable (no live Reader API).
  updateExbase66EditionLabel();
};

const ensureExbase66MenusLoaded = () => {
  // The edition label needs the editions catalog, but the main Reader menus
  // must stay untouched in EXBase66 mode, so load editions for lookup only.
  void loadExbase66Editions();

  if (exbase66BooksLoaded || !readerExbase66Book) return;

  exbase66BooksLoaded = true;
  void loadExbase66Books();
};

// Governed reference-to-passage-ID binding present in the repository: only the
// Psalm 23 campaign (OT:PSA:23:1-6 => passage IDs 145460-145465). The r2 ASV
// verse records share one binding_sha256 across the six verses.
const EXBASE66_ASV_BINDING_SHA256 =
  "92aa810b7312c4489483242e8b18e6fdd863b453e2066be3a5b0cf00bf9c45aa";
const EXBASE66_PSALM23_BOOK_CODE = "PSA";
const EXBASE66_PSALM23_CHAPTER = "23";
const EXBASE66_PSALM23_FIRST_PASSAGE_ID = 145460;
const EXBASE66_PSALM23_VERSE_COUNT = 6;

// =====================================================================
// EXBASE66_VERSE_EVIDENCE_R1 — static verified data
// Embedded from campaign artifacts so the panel reports verse-scoped evidence
// with no network fetch and no inference. Do not edit by hand without
// re-reading the cited source files.
// =====================================================================

const EXBASE66_MATRIX_SOURCE_PATH =
  "campaigns/psalm23-promixi/dual-evidence-r3/psalm23-dual-evidence-matrix-r3.json";
const EXBASE66_COLIBRI_DIR =
  "campaigns/psalm23-promixi/dual-evidence-colibri-r1-ngen1024";

// Visible four-tier distinction: configured / populated / validated / missing.
const EXBASE66_TIER = {
  configured: "configured",
  populated: "populated",
  validated: "validated",
  missing: "missing",
};
const EXBASE66_TIER_LEGEND =
  "Tiers: configured = layer configured, 0 verse records; populated = verse records exist; validated = validated gap / validation stated in the source; missing = NO_EVIDENCE. Counts are per verse, never summed.";

const EXBASE66_CORE_LAYER_ORDER = [
  "lexical",
  "morphology",
  "temporal",
  "events",
  "intertext",
  "variant_witness",
  "external_chronology",
];
const EXBASE66_EXTERNAL_LAYER_ORDER = [
  "lexical",
  "morphology",
  "temporal",
  "events",
  "intertext",
  "variant_witness",
  "chronology",
];

// Per-verse evidence from psalm23-dual-evidence-matrix-r3.json.
const EXBASE66_VERSE_EVIDENCE = {
  1: {
    canonicalKey: "OT:PSA:23:1",
    passageId: 145460,
    lexical: {
      exbase66BindingRecords: 12,
      externalTokenRecords: 6,
      externalSource: "OSHB/MorphHB",
      comparison: "ALIGNMENT_REQUIRED",
    },
    morphology: { exbase66State: "NO_EVIDENCE", externalRecords: 6 },
    otherLayers: {
      chronology: "NO_EVIDENCE",
      events: "NO_EVIDENCE",
      intertext: "NO_EVIDENCE",
      temporal: "NO_EVIDENCE",
      variant_witness: "NO_EVIDENCE",
    },
  },
  2: {
    canonicalKey: "OT:PSA:23:2",
    passageId: 145461,
    lexical: {
      exbase66BindingRecords: 14,
      externalTokenRecords: 7,
      externalSource: "OSHB/MorphHB",
      comparison: "ALIGNMENT_REQUIRED",
    },
    morphology: { exbase66State: "NO_EVIDENCE", externalRecords: 7 },
    otherLayers: {
      chronology: "NO_EVIDENCE",
      events: "NO_EVIDENCE",
      intertext: "NO_EVIDENCE",
      temporal: "NO_EVIDENCE",
      variant_witness: "NO_EVIDENCE",
    },
  },
  3: {
    canonicalKey: "OT:PSA:23:3",
    passageId: 145462,
    lexical: {
      exbase66BindingRecords: 14,
      externalTokenRecords: 7,
      externalSource: "OSHB/MorphHB",
      comparison: "ALIGNMENT_REQUIRED",
    },
    morphology: { exbase66State: "NO_EVIDENCE", externalRecords: 7 },
    otherLayers: {
      chronology: "NO_EVIDENCE",
      events: "NO_EVIDENCE",
      intertext: "NO_EVIDENCE",
      temporal: "NO_EVIDENCE",
      variant_witness: "NO_EVIDENCE",
    },
  },
  4: {
    canonicalKey: "OT:PSA:23:4",
    passageId: 145463,
    lexical: {
      exbase66BindingRecords: 30,
      externalTokenRecords: 15,
      externalSource: "OSHB/MorphHB",
      comparison: "ALIGNMENT_REQUIRED",
    },
    morphology: { exbase66State: "NO_EVIDENCE", externalRecords: 15 },
    otherLayers: {
      chronology: "NO_EVIDENCE",
      events: "NO_EVIDENCE",
      intertext: "NO_EVIDENCE",
      temporal: "NO_EVIDENCE",
      variant_witness: "NO_EVIDENCE",
    },
  },
  5: {
    canonicalKey: "OT:PSA:23:5",
    passageId: 145464,
    lexical: {
      exbase66BindingRecords: 20,
      externalTokenRecords: 10,
      externalSource: "OSHB/MorphHB",
      comparison: "ALIGNMENT_REQUIRED",
    },
    morphology: { exbase66State: "NO_EVIDENCE", externalRecords: 10 },
    otherLayers: {
      chronology: "NO_EVIDENCE",
      events: "NO_EVIDENCE",
      intertext: "NO_EVIDENCE",
      temporal: "NO_EVIDENCE",
      variant_witness: "NO_EVIDENCE",
    },
  },
  6: {
    canonicalKey: "OT:PSA:23:6",
    passageId: 145465,
    lexical: {
      exbase66BindingRecords: 24,
      externalTokenRecords: 12,
      externalSource: "OSHB/MorphHB",
      comparison: "ALIGNMENT_REQUIRED",
    },
    morphology: { exbase66State: "NO_EVIDENCE", externalRecords: 12 },
    otherLayers: {
      chronology: "NO_EVIDENCE",
      events: "NO_EVIDENCE",
      intertext: "NO_EVIDENCE",
      temporal: "NO_EVIDENCE",
      variant_witness: "NO_EVIDENCE",
    },
  },
};

// Existing Colibri synthesis (dual-evidence-colibri-r1-ngen1024). ai_authority
// stays false; these are embedded verbatim, not regenerated or inferred. The
// fileSha256 values are copied from that directory's SHA256SUMS manifest.
const EXBASE66_COLIBRI_SYNTHESIS = {
  1: {
    file: "days/day-01.json",
    fileSha256:
      "c97802b56b7f2874cf5d264f1a6f76bd3b5bec5bafcf4e3df6f91b87be503cc2",
    canonicalKey: "OT:PSA:23:1",
    summary: `Analysis of Psalm 23:1 (OT:PSA:23:1) indicates a required alignment between ExBase66 and external lexical data (OSHB/MorphHB). The lexical comparison is classified as DIFFER, with a remediation reason noting that non-equivalent representations were inferred without proven semantic disagreement. ExBase66 provides 12 binding records but zero lemma records. Morphology is marked EXTERNAL_ONLY, with ExBase66 having NO_EVIDENCE state. Other layers including chronology, events, and intertextuality have NO_EVIDENCE.`,
    reflection: `The discrepancy in lexical comparison highlights the need for precise semantic equivalence rather than mere representation matching. The absence of ExBase66 lemma records and morphology evidence necessitates reliance on external sources, while maintaining strict boundaries on inference.`,
    aiAuthority: false,
    role: "DUAL_EVIDENCE_SYNTHESIS",
    model: "qwen36-colibri",
    sourceMatrixSha256:
      "daa26efbb037b6a3bb862c221f61a5204771412fa8426a12ff1b9514541dbed0",
  },
  2: {
    file: "days/day-02.json",
    fileSha256:
      "66ac549047ebce76172d46fb1f2d2fc65592f26883a857cfeee17de0e1168c57",
    canonicalKey: "OT:PSA:23:2",
    summary: `Analysis of OT:PSA:23:2 indicates a lexical comparison marked as ALIGNMENT_REQUIRED. EXBase66 data shows 14 binding records but zero lemma records, while external OSHB/MorphHB sources provide 7 token records. The system classified the relationship as DIFFER due to non-equivalent representations, though the remediation reason notes this was an inference without proven semantic disagreement. Morphological evidence is exclusively external.`,
    reflection: `The evidence highlights a gap between binding records and lemma validation in EXBase66. The classification of DIFFER is explicitly flagged as inferred rather than semantically proven. This suggests caution in interpreting lexical differences without further semantic alignment. The absence of EXBase66 morphology records necessitates reliance on external sources.`,
    aiAuthority: false,
    role: "DUAL_EVIDENCE_SYNTHESIS",
    model: "qwen36-colibri",
    sourceMatrixSha256:
      "daa26efbb037b6a3bb862c221f61a5204771412fa8426a12ff1b9514541dbed0",
  },
  3: {
    file: "days/day-03.json",
    fileSha256:
      "02170650bd577b4c642142deb30ff2f394416fa9229e956653be8416b989897c",
    canonicalKey: "OT:PSA:23:3",
    summary: `Analysis of Psalm 23:3 indicates lexical comparison requires resolution (ALIGNMENT_REQUIRED) due to inferred DIFFER classification from non-equivalent representations without proven semantic disagreement. Morphology data is external-only (OSHB/MorphHB) with seven records, while EXBase66 morphology is explicitly NO_EVIDENCE. No chronology, events, intertextual, temporal, or variant witness evidence is present.`,
    reflection: `The evidence highlights a methodological boundary: lexical differences are noted as non-equivalent but not semantically disproven, requiring alignment rather than immediate disagreement. Morphological data exists only in external sources, preserving the distinction between EXBase66 and OSHB/MorphHB inputs. Uncertainty is maintained regarding semantic equivalence.`,
    aiAuthority: false,
    role: "DUAL_EVIDENCE_SYNTHESIS",
    model: "qwen36-colibri",
    sourceMatrixSha256:
      "daa26efbb037b6a3bb862c221f61a5204771412fa8426a12ff1b9514541dbed0",
  },
  4: {
    file: "days/day-04.json",
    fileSha256:
      "ce59239dda23f65aade8efef99dcad56945c4947a8eb798f301748a60eb3ec0e",
    canonicalKey: "OT:PSA:23:4",
    summary: `The analysis of Psalm 23:4 indicates that while EXBase66 and external sources (OSHB/MorphHB) provide lexical records for comparable values, there is no morphological evidence from EXBase66 (state: NO_EVIDENCE). The EXBase66 layer classifies the lexical comparison as DIFFER due to non-equivalent representations without proven semantic disagreement, whereas the morphology comparison is marked EXTERNAL_ONLY. No chronology, events, intertextual, temporal, or variant witness evidence is present.`,
    reflection: `The divergence between lexical records and the absence of morphological evidence in EXBase66 highlights a structural gap. The classification of DIFFER is explicitly remediated as inferred rather than semantically proven, underscoring the necessity of preserving uncertainty over forced alignment.`,
    aiAuthority: false,
    role: "DUAL_EVIDENCE_SYNTHESIS",
    model: "qwen36-colibri",
    sourceMatrixSha256:
      "daa26efbb037b6a3bb862c221f61a5204771412fa8426a12ff1b9514541dbed0",
  },
  5: {
    file: "days/day-05.json",
    fileSha256:
      "fad6897ab02c3fe09a856e296be3ec0cb809e262105ab2d09131d81377da3458",
    canonicalKey: "OT:PSA:23:5",
    summary: `Analysis of Psalm 23:5 indicates a comparison state of ALIGNMENT_REQUIRED for lexical data, driven by non-equivalent representations between EXBase66 and external sources (OSHB/MorphHB) without proven semantic disagreement. Morphological data is marked EXTERNAL_ONLY, with zero records in EXBase66 and ten in external sources. No evidence exists for chronology, events, intertextuality, temporal aspects, or variant witnesses.`,
    reflection: `The boundary between linguistic representation and semantic meaning remains unresolved. The system correctly identifies that record-count differences do not constitute textual disagreement. The absence of EXBase66 morphology prevents morphological inference, maintaining strict adherence to the evidence package. Authority remains with the Bible, while the AI serves only as a bounded synthesis layer reflecting the provided data boundaries.`,
    aiAuthority: false,
    role: "DUAL_EVIDENCE_SYNTHESIS",
    model: "qwen36-colibri",
    sourceMatrixSha256:
      "daa26efbb037b6a3bb862c221f61a5204771412fa8426a12ff1b9514541dbed0",
  },
  6: {
    file: "days/day-06.json",
    fileSha256:
      "4eed6e0cda8ba042623ba00a04d3ae06ffbea47ba49833c2b579963d522b661b",
    canonicalKey: "OT:PSA:23:6",
    summary: `Analysis of Psalm 23:6 indicates a lexical comparison requiring further alignment, with EXBase66 providing 24 binding records but zero lemma records. External sources from OSHB/MorphHB provide 12 token records. The system classifies the lexical relationship as DIFFER due to non-equivalent representations, though this is noted as an inference without proven semantic disagreement. Morphological data is exclusively external, with no EXBase66 morphological evidence available.`,
    reflection: `The data presents a structural divergence between internal binding counts and external token records. The classification of DIFFER is procedural, stemming from representation mismatches rather than explicit theological contradiction. The absence of EXBase66 morphological evidence necessitates reliance on external sources for morphological understanding, highlighting the bounded nature of the available evidence package.`,
    aiAuthority: false,
    role: "DUAL_EVIDENCE_SYNTHESIS",
    model: "qwen36-colibri",
    sourceMatrixSha256:
      "daa26efbb037b6a3bb862c221f61a5204771412fa8426a12ff1b9514541dbed0",
  },
};

const appendExbase66Definition = (parent, label, value) => {
  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  parent.append(term, description);
};

const appendExbase66Psalm23Binding = (results, selectedVerse = "") => {
  const intro = document.createElement("p");
  intro.textContent = selectedVerse
    ? `Governed reference-to-passage-ID binding for Psalm 23, verse ${selectedVerse} (the campaign's verified verse scope):`
    : "Governed reference-to-passage-ID binding found for this chapter (Psalm 23, verses 1-6 — the campaign's selected-passage scope):";
  results.appendChild(intro);

  const bindings = document.createElement("ul");
  bindings.className = "reader-exbase66-relations";

  const versesToShow = selectedVerse
    ? [Number(selectedVerse)]
    : [...Array(EXBASE66_PSALM23_VERSE_COUNT)].map((_, index) => index + 1);

  for (const verse of versesToShow) {
    const item = document.createElement("li");
    item.textContent = `OT:PSA:23:${verse} — passage ID ${
      EXBASE66_PSALM23_FIRST_PASSAGE_ID + verse - 1
    }`;
    bindings.appendChild(item);
  }

  results.appendChild(bindings);

  const metadata = document.createElement("dl");
  metadata.className = "reader-exbase66-metadata";
  appendExbase66Definition(metadata, "Canonical keys", "OT:PSA:23:1 … OT:PSA:23:6");
  appendExbase66Definition(metadata, "Passage IDs", "145460 … 145465");
  appendExbase66Definition(metadata, "Edition", "eng-eng-asv");
  appendExbase66Definition(metadata, "binding_sha256", EXBASE66_ASV_BINDING_SHA256);
  appendExbase66Definition(
    metadata,
    "Binding source",
    "campaigns/psalm23-promixi/psalm23-asv-1-6-complete-verse-records-r2.json"
  );
  appendExbase66Definition(
    metadata,
    "EXBase66 scope",
    "hebwlc-ebible — passageKeys OT:PSA:23:1-6 (acceptance-psalm23/evidence/scope.json)"
  );
  results.appendChild(metadata);
};

const appendExbase66NoBinding = (results) => {
  const unavailable = document.createElement("p");
  unavailable.textContent =
    "No governed reference-to-passage-ID binding exists for this selection. The only binding in this repository covers Psalm 23:1-6 (eng-eng-asv text records; hebwlc-ebible EXBase66 scope). No passage ID, evidence, or relation was fabricated.";
  results.appendChild(unavailable);
};

const appendExbase66TierBadge = (parent, tier) => {
  const badge = document.createElement("span");
  badge.className = `reader-exbase66-tier reader-exbase66-tier--${tier}`;
  badge.textContent = EXBASE66_TIER[tier] ?? tier;
  parent.appendChild(badge);
};

const appendExbase66LayerRow = (list, name, tiers, detail) => {
  const item = document.createElement("li");

  const nameSpan = document.createElement("span");
  nameSpan.className = "reader-exbase66-layer-name";
  nameSpan.textContent = name;
  item.appendChild(nameSpan);

  for (const tier of tiers) {
    item.appendChild(document.createTextNode(" "));
    appendExbase66TierBadge(item, tier);
  }

  if (detail) {
    const detailSpan = document.createElement("span");
    detailSpan.className = "reader-exbase66-tier-detail";
    detailSpan.textContent = ` — ${detail}`;
    item.appendChild(detailSpan);
  }

  list.appendChild(item);
};

const appendExbase66VerseBlock = (results, verse) => {
  const data = EXBASE66_VERSE_EVIDENCE[verse];
  if (!data) return;

  const block = document.createElement("section");
  block.className = "reader-exbase66-verse-block";

  const heading = document.createElement("h5");
  heading.textContent = `Verse evidence — ${data.canonicalKey} (passage ID ${data.passageId})`;
  block.appendChild(heading);

  const lexical = data.lexical;
  const morphology = data.morphology;
  const other = data.otherLayers;

  const coreHeading = document.createElement("p");
  coreHeading.textContent = "Core layers (exbase66Layers order):";
  block.appendChild(coreHeading);

  const coreList = document.createElement("ul");
  coreList.className = "reader-exbase66-relations";
  appendExbase66LayerRow(
    coreList,
    "lexical",
    ["populated"],
    `EXBase66 binding_records ${lexical.exbase66BindingRecords}; external token_records ${lexical.externalTokenRecords} (${lexical.externalSource}); comparison ${lexical.comparison}`
  );
  appendExbase66LayerRow(
    coreList,
    "morphology",
    ["populated", "missing"],
    `external records ${morphology.externalRecords} (populated); EXBase66 state ${morphology.exbase66State} (missing)`
  );
  appendExbase66LayerRow(
    coreList,
    "temporal",
    [other.temporal === "NO_EVIDENCE" ? "missing" : "populated"],
    `r3 state ${other.temporal}`
  );
  appendExbase66LayerRow(
    coreList,
    "events",
    [other.events === "NO_EVIDENCE" ? "missing" : "populated"],
    `r3 state ${other.events}`
  );
  appendExbase66LayerRow(
    coreList,
    "intertext",
    [other.intertext === "NO_EVIDENCE" ? "missing" : "populated"],
    `r3 state ${other.intertext}`
  );
  appendExbase66LayerRow(
    coreList,
    "variant_witness",
    [other.variant_witness === "NO_EVIDENCE" ? "missing" : "populated"],
    `r3 state ${other.variant_witness}`
  );
  appendExbase66LayerRow(
    coreList,
    "external_chronology",
    ["validated", other.chronology === "NO_EVIDENCE" ? "missing" : "populated"],
    `config chronologyDisposition.validatedGap=true (NO_CHRONOLOGY_TABLE_IN_SOURCE_SCHEMA); r3 state ${other.chronology}`
  );
  block.appendChild(coreList);

  const externalHeading = document.createElement("p");
  externalHeading.textContent = "External layers (externalCategories order):";
  block.appendChild(externalHeading);

  const externalList = document.createElement("ul");
  externalList.className = "reader-exbase66-relations";
  appendExbase66LayerRow(
    externalList,
    "lexical",
    ["populated"],
    `external token_records ${lexical.externalTokenRecords} (${lexical.externalSource}); EXBase66 binding_records ${lexical.exbase66BindingRecords}; comparison ${lexical.comparison}`
  );
  appendExbase66LayerRow(
    externalList,
    "morphology",
    ["populated", "missing"],
    `external records ${morphology.externalRecords} (populated); EXBase66 state ${morphology.exbase66State} (missing)`
  );
  appendExbase66LayerRow(
    externalList,
    "temporal",
    [other.temporal === "NO_EVIDENCE" ? "missing" : "populated"],
    `r3 state ${other.temporal}`
  );
  appendExbase66LayerRow(
    externalList,
    "events",
    [other.events === "NO_EVIDENCE" ? "missing" : "populated"],
    `r3 state ${other.events}`
  );
  appendExbase66LayerRow(
    externalList,
    "intertext",
    [other.intertext === "NO_EVIDENCE" ? "missing" : "populated"],
    `r3 state ${other.intertext}`
  );
  appendExbase66LayerRow(
    externalList,
    "variant_witness",
    [other.variant_witness === "NO_EVIDENCE" ? "missing" : "populated"],
    `r3 state ${other.variant_witness}`
  );
  appendExbase66LayerRow(
    externalList,
    "chronology",
    ["validated", other.chronology === "NO_EVIDENCE" ? "missing" : "populated"],
    `config chronologyDisposition.validatedGap=true (NO_CHRONOLOGY_TABLE_IN_SOURCE_SCHEMA); r3 state ${other.chronology}`
  );
  block.appendChild(externalList);

  const cite = document.createElement("p");
  cite.className = "reader-exbase66-source-cite";
  cite.textContent = `Source: ${EXBASE66_MATRIX_SOURCE_PATH}`;
  block.appendChild(cite);

  results.appendChild(block);
};

const appendExbase66VerseEvidence = (results, selectedVerse = "") => {
  const heading = document.createElement("h4");
  heading.textContent = selectedVerse
    ? "Verse-scoped evidence"
    : "Verse-scoped evidence (each verse, no campaign-wide summing)";
  results.appendChild(heading);

  const note = document.createElement("p");
  note.textContent = EXBASE66_TIER_LEGEND;
  results.appendChild(note);

  const versesToShow = selectedVerse
    ? [Number(selectedVerse)]
    : [...Array(EXBASE66_PSALM23_VERSE_COUNT)].map((_, index) => index + 1);

  for (const verse of versesToShow) {
    appendExbase66VerseBlock(results, verse);
  }
};

const appendExbase66UnavailableSynthesis = (results) => {
  const unavailable = document.createElement("p");
  unavailable.className = "reader-exbase66-source-cite";
  unavailable.textContent = "Colibri synthesis unavailable for this selection.";
  results.appendChild(unavailable);
};

const appendExbase66ColibriSynthesis = (results, selectedVerse = "") => {
  const heading = document.createElement("h4");
  heading.textContent = "Colibri synthesis (existing artifact; ai_authority:false)";
  results.appendChild(heading);

  const note = document.createElement("p");
  note.textContent = `Embedded verbatim from ${EXBASE66_COLIBRI_DIR} (SHA256SUMS manifest) — no live Colibri call, no new synthesis, no inference.`;
  results.appendChild(note);

  const versesToShow = selectedVerse
    ? [Number(selectedVerse)]
    : [...Array(EXBASE66_PSALM23_VERSE_COUNT)].map((_, index) => index + 1);

  let rendered = 0;

  for (const verse of versesToShow) {
    const data = EXBASE66_COLIBRI_SYNTHESIS[verse];
    if (!data) continue;

    rendered += 1;

    const block = document.createElement("section");
    block.className = "reader-exbase66-colibri";

    const blockHeading = document.createElement("h5");
    blockHeading.textContent = `Colibri synthesis — ${data.canonicalKey}`;
    block.appendChild(blockHeading);

    const summary = document.createElement("p");
    summary.textContent = data.summary;
    block.appendChild(summary);

    if (data.reflection) {
      const reflection = document.createElement("p");
      reflection.textContent = data.reflection;
      block.appendChild(reflection);
    }

    const metadata = document.createElement("dl");
    metadata.className = "reader-exbase66-metadata";
    appendExbase66Definition(metadata, "ai_authority", String(data.aiAuthority));
    appendExbase66Definition(metadata, "role", data.role);
    appendExbase66Definition(metadata, "model", data.model);
    appendExbase66Definition(metadata, "source_matrix_sha256", data.sourceMatrixSha256);
    appendExbase66Definition(metadata, "artifact file", `${EXBASE66_COLIBRI_DIR}/${data.file}`);
    appendExbase66Definition(metadata, "artifact sha256", data.fileSha256);
    appendExbase66Definition(metadata, "SHA256SUMS", `${EXBASE66_COLIBRI_DIR}/SHA256SUMS`);
    block.appendChild(metadata);

    results.appendChild(block);
  }

  if (rendered === 0) {
    appendExbase66UnavailableSynthesis(results);
  }
};

const appendExbase66IntegrationNote = (results) => {
  const details = document.createElement("details");
  details.className = "reader-exbase66-diagnostics";

  const summary = document.createElement("summary");
  summary.textContent = "Integration status";
  details.appendChild(summary);

  const note = document.createElement("p");
  note.textContent =
    "This is a menus-only view: no search, no passage-ID entry, and no automatic inference. No live EXBase66 evidence endpoint is called. Verse selection is offered only where a verified governed binding exists — Psalm 23, verses 1-6 — and the verse menu stays disabled elsewhere because no verse list is exposed for those chapters.";
  details.appendChild(note);

  results.appendChild(details);
};

const renderExbase66Evidence = () => {
  const results = readerExbase66Panel?.querySelector("[data-exbase66-results]");
  if (!results) return;

  const bookCode = readerExbase66Book?.value ?? "";
  const chapter = readerExbase66Chapter?.value ?? "";
  const verse = readerExbase66Verse?.value ?? "";

  if (!bookCode || !chapter) {
    setExbase66Message("Select a book and chapter before displaying evidence.");
    return;
  }

  const bookLabel =
    readerExbase66Book?.selectedOptions?.[0]?.textContent?.trim() || bookCode;
  const reference = `${exbase66EditionID} — ${bookLabel} ${chapter}${
    verse ? `:${verse}` : ""
  }`;

  results.replaceChildren();

  const heading = document.createElement("h4");
  heading.textContent = "Selected passage";
  results.appendChild(heading);

  const referenceLine = document.createElement("p");
  referenceLine.textContent = `Reference: ${reference}`;
  results.appendChild(referenceLine);

  const isPsalm23 =
    bookCode === EXBASE66_PSALM23_BOOK_CODE &&
    chapter === EXBASE66_PSALM23_CHAPTER;

  if (isPsalm23) {
    appendExbase66Psalm23Binding(results, verse);
    appendExbase66VerseEvidence(results, verse);
    appendExbase66ColibriSynthesis(results, verse);
  } else {
    appendExbase66NoBinding(results);
    appendExbase66UnavailableSynthesis(results);
  }

  appendExbase66IntegrationNote(results);

  setExbase66Message("");
};

// Clear rendered evidence and message so a changed selection can never leave
// stale evidence on screen until Display evidence is pressed again.
const clearExbase66Results = () => {
  const results = readerExbase66Panel?.querySelector("[data-exbase66-results]");
  if (results) results.replaceChildren();
  setExbase66Message("");
};

readerExbase66Book?.addEventListener("change", async () => {
  const bookCode = readerExbase66Book.value;

  clearExbase66Results();

  if (readerExbase66Chapter) {
    readerExbase66Chapter.disabled = true;
    readerExbase66Chapter.replaceChildren(makeExbase66Option("Select book first"));
  }

  resetExbase66VerseMenu(false);
  if (readerExbase66Display) readerExbase66Display.disabled = true;

  if (!bookCode) return;

  setExbase66Message("Loading EXBase66 chapters…");

  try {
    const response = await fetch(
      `${readerApiPrefix()}/reader/chapters?edition=${encodeURIComponent(
        exbase66EditionID
      )}&book=${encodeURIComponent(bookCode)}`
    );

    if (!response.ok) throw new Error(`Chapters HTTP ${response.status}`);

    const chapters = await response.json();

    populateSelect(
      readerExbase66Chapter,
      chapters,
      (chapter) => String(chapter),
      (chapter) => String(chapter),
      "Select chapter"
    );

    setExbase66Message("Select a chapter.");
  } catch (error) {
    console.error("EXBase66 chapter menu failed:", error);
    readerExbase66Chapter.replaceChildren(
      makeExbase66Option("Unable to load chapters")
    );
    readerExbase66Chapter.disabled = true;
    setExbase66Message(
      "Unable to load the EXBase66 chapter menu right now. No evidence was fabricated."
    );
  }
});

readerExbase66Chapter?.addEventListener("change", () => {
  const chapter = readerExbase66Chapter.value;
  const bookCode = readerExbase66Book?.value ?? "";

  clearExbase66Results();

  populateExbase66VerseMenu(bookCode, chapter);
  if (readerExbase66Display) readerExbase66Display.disabled = !chapter;

  if (!chapter) {
    setExbase66Message("Select a chapter.");
  } else if (
    bookCode === EXBASE66_PSALM23_BOOK_CODE &&
    chapter === EXBASE66_PSALM23_CHAPTER
  ) {
    setExbase66Message(
      "Psalm 23 verses 1-6 have a verified binding; select a verse or display the whole chapter."
    );
  } else {
    setExbase66Message(
      `${EXBASE66_VERSE_UNAVAILABLE}; evidence will cover the whole chapter.`
    );
  }
});

readerExbase66Verse?.addEventListener("change", () => {
  clearExbase66Results();
});

readerExbase66Display?.addEventListener("click", () => {
  renderExbase66Evidence();
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

const restoreReaderQueryState = async (
  query = initialReaderQuery,
  { force = false } = {}
) => {
  if (!readerLanguage || !readerEdition || !readerBook || !readerChapter) return;
  if (initialReaderQueryRestored && !force) return;

  initialReaderQueryRestored = true;
  const requestedMode = query.get("readerMode");
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

  if (requestedMode === "century") {
    const requestedCentury = query.get("century");
    if (
      requestedCentury &&
      [...readerLanguage.options].some(
        (option) => option.value === requestedCentury
      )
    ) {
      readerLanguage.value = requestedCentury;
      populateEditionsForCentury(requestedCentury);

      const requestedEdition = query.get("edition");
      if (
        requestedEdition &&
        [...readerEdition.options].some(
          (option) => option.value === requestedEdition
        )
      ) {
        readerEdition.value = requestedEdition;
        await loadBooks(requestedEdition);

        const requestedBook = query.get("book");
        if (
          requestedBook &&
          [...readerBook.options].some(
            (option) => option.value === requestedBook
          )
        ) {
          readerBook.value = requestedBook;
          await loadChapters(requestedEdition, requestedBook);

          const requestedChapter = query.get("chapter");
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

  const requestedLanguage = query.get("language");
  if (
    requestedLanguage &&
    [...readerLanguage.options].some((option) => option.value === requestedLanguage)
  ) {
    readerLanguage.value = requestedLanguage;
    populateEditionsForLanguage(requestedLanguage);

    const requestedEdition = query.get("edition");
    if (
      requestedEdition &&
      [...readerEdition.options].some((option) => option.value === requestedEdition)
    ) {
      readerEdition.value = requestedEdition;
      await loadBooks(requestedEdition);

      const requestedBook = query.get("book");
      if (
        requestedBook &&
        [...readerBook.options].some((option) => option.value === requestedBook)
      ) {
        readerBook.value = requestedBook;
        await loadChapters(requestedEdition, requestedBook);

        const requestedChapter = query.get("chapter");
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
    const nextMode = readerMode.value;
    const activeMode = readerMode.dataset.activeMode ?? "reader";
    const previousMode = activeMode === "exbase66"
      ? readerMode.dataset.returnMode ?? "reader"
      : activeMode;

    if (nextMode === "exbase66") {
      if (activeMode !== "exbase66") readerMode.dataset.returnMode = activeMode;
      readerMode.dataset.activeMode = nextMode;
      setReaderModeState(nextMode);
      syncReaderQuery();
      return;
    }

    if (activeMode === "exbase66" && nextMode === previousMode) {
      readerMode.dataset.activeMode = nextMode;
      if (readerBase66Panel) readerBase66Panel.hidden = nextMode !== "base66";
      if (readerExbase66Panel) readerExbase66Panel.hidden = true;
      setReaderModeMessage(readerModeDescriptions[nextMode]);
      setPrimaryReaderLabel(nextMode === "century" ? "Century" : "Language");
      syncReaderQuery();
      return;
    }

    // Reader and Base66 share the same Language / Bible-Translation / Book /
    // Chapter menus, so a compatible view switch carries those selections over.
    // Century owns its own century-selection semantics and EXBase66 keeps its
    // own book / chapter / verse menus.
    const preserveSelection =
      (nextMode === "reader" || nextMode === "base66") &&
      (previousMode === "reader" || previousMode === "base66");
    const selection = preserveSelection
      ? {
          language: readerLanguage.value,
          edition: readerEdition.value,
          book: readerBook.value,
          chapter: readerChapter.value,
        }
      : null;

    readerMode.dataset.activeMode = nextMode;

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

    if (selection) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(selection)) {
        if (value) params.set(key, value);
      }
      await restoreReaderQueryState(params, { force: true });
    }
  });

  const requestedMode = initialReaderQuery.get("readerMode");
  if (requestedMode && readerModeDescriptions[requestedMode]) {
    readerMode.value = requestedMode;
  }
  readerMode.dataset.activeMode = readerMode.value ?? "reader";

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
    } catch (error) {
      setReaderMessage("Unable to load books.");
      console.error(error);
    }
    syncReaderQuery();
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
