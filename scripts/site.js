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
  syncReaderSwitcherUI(mode);

  // The three-reader switcher drives which context panel is visible; the
  // underlying #reader-mode state holder keeps query-string state and legacy
  // ?readerMode= URLs working.
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
const readerExbase66Language = document.querySelector("[data-exbase66-language]");
const readerExbase66EditionSelect = document.querySelector(
  "[data-exbase66-edition-select]"
);
const readerExbase66Panel = document.querySelector("[data-reader-exbase66-panel]");
const readerMessage = document.querySelector("#reader-message");
const readerPassage = document.querySelector("#reader-passage");
const readerFontDecrease = document.querySelector("[data-reader-font-decrease]");
const readerFontIncrease = document.querySelector("[data-reader-font-increase]");
const readerPrint = document.querySelector("[data-reader-print]");
const readerDownload = document.querySelector("[data-reader-download]");
const readerShare = document.querySelector("[data-reader-share]");

// THREE_READERS_SWITCHER_R1: the visible segmented controls in the top ribbon
// drive the hidden #reader-mode state holder, so query-string state and legacy
// ?readerMode= URLs keep working. Bible and Century are two views of the first
// reader; Base66 is the second reader and EXBase66 the third.
const readerSwitcherButtons = document.querySelectorAll("[data-reader-select]");

const readerTopSwitcherKey = (mode) => (mode === "reader" ? "bible" : mode);

// Reflects the current readerMode value onto the visible ribbon switcher so
// exactly one control is aria-pressed (Bible and Century stay distinct).
const syncReaderSwitcherUI = (mode) => {
  const key = readerTopSwitcherKey(mode);
  readerSwitcherButtons.forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.readerSelect === key)
    );
  });
};

const requestReaderMode = (mode) => {
  if (!readerMode) return;
  if (readerMode.value === mode) {
    syncReaderSwitcherUI(mode);
    return;
  }
  readerMode.value = mode;
  readerMode.dispatchEvent(new Event("change"));
};

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

  // No known English name: fall back honestly to the code itself, never a
  // fabricated language name.
  return nativeName ?? englishName ?? code;
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

// Language menus are ordered A–Z by the ENGLISH language name, never by the
// displayed (possibly native-script) label. Distinct governed codes stay as
// their own entries even when two codes render the same label; a code with no
// known English name falls back honestly to the code itself.
const getLanguageSortKey = (code) => englishLanguageNames[code] ?? code;

const getLanguagesFromEditions = (editions) => {
  const codes = [...new Set(editions.map(getLanguageCode).filter(Boolean))];
  return codes
    .map((code) => ({ code, name: getLanguageName(code) }))
    .sort((a, b) =>
      getLanguageSortKey(a.code).localeCompare(getLanguageSortKey(b.code), "en", {
        sensitivity: "base",
      })
    );
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

const getVerseRangeFromPassage = (passage = currentPassage, explicitRange = "") => {
  if (explicitRange) return String(explicitRange);

  const verses = passage?.Verses ?? passage?.verses ?? [];
  if (!Array.isArray(verses) || verses.length === 0) return "";

  const first = getVerseLabel(verses[0]);
  const last = getVerseLabel(verses[verses.length - 1]);

  if (!first) return "";
  if (!last || first === last) return String(first);
  return `${first}–${last}`;
};

// Builds the citation for any reader from the governed citation payload. A
// localized preformatted citation supplied by the Reader API is preferred so
// the citation stays in the selected Bible's language; otherwise the citation
// is assembled from edition-specific metadata. Returns "" when no metadata is
// available so callers can state that explicitly instead of substituting
// English details.
const formatTurabianWebCitation = (
  passage = currentPassage,
  citation = currentCitation,
  { verseRange = "", accessUrl = "" } = {}
) => {
  if (!passage) return "";

  const preformatted =
    citation?.text ??
    citation?.formatted ??
    citation?.citation ??
    citation?.turabian ??
    "";
  if (typeof preformatted === "string" && preformatted.trim()) {
    return preformatted.trim();
  }

  const rawBook =
    passage.BookCode ??
    passage.bookCode ??
    "";

  const book =
    scriptureBookAbbreviations[rawBook] ??
    rawBook;

  const chapter =
    passage.Chapter ??
    passage.chapter ??
    "";

  const range = getVerseRangeFromPassage(passage, verseRange);

  const editionTitle =
    citation?.editionTitle ??
    citation?.EditionTitle ??
    "";

  const editionAbbreviation =
    citation?.editionAbbreviation ??
    citation?.EditionAbbreviation ??
    "";

  const accessedDate = formatAccessedDate(
    citation?.accessedDate ??
    citation?.AccessedDate ??
    ""
  );

  const url = accessUrl || getReaderAccessUrl();

  let version = editionTitle;
  if (editionAbbreviation) {
    version = editionTitle
      ? `${editionTitle} (${editionAbbreviation})`
      : editionAbbreviation;
  }

  const reference =
    book && chapter
      ? `${book} ${chapter}${range ? `:${range}` : ""}`
      : "";

  const parts = [reference, version].filter(Boolean);

  if (accessedDate) {
    parts.push(`accessed ${accessedDate}`);
  }

  if (url) {
    parts.push(url);
  }

  return parts.length ? `${parts.join(", ")}.` : "";
};

// Renders the current citation at the BOTTOM of a reader's results area. When
// no governed metadata exists an explicit statement is shown rather than
// silently substituting English bibliographic details.
const CITATION_UNAVAILABLE = "Citation metadata unavailable for this edition.";

const appendCitationTo = (container, citationText) => {
  if (!container) return;
  const paragraph = document.createElement("p");
  paragraph.className = "reader-citation";
  paragraph.textContent = citationText || CITATION_UNAVAILABLE;
  container.appendChild(paragraph);
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
      } else {
        // Missing layers are stated explicitly rather than left silent.
        const originalNote = document.createElement("p");
        originalNote.className = "reader-base66-layer-note";
        originalNote.textContent = "Original-language layer unavailable for this verse.";
        verseBlock.appendChild(originalNote);
      }

      const strongValues = getVerseLexical(verse)
        .map(getLexicalStrong)
        .filter(Boolean);

      if (strongValues.length) {
        const strongLine = document.createElement("p");
        strongLine.className = "reader-base66-strong";
        strongLine.textContent = `Strong: ${strongValues.join(" · ")}`;
        verseBlock.appendChild(strongLine);
      } else {
        const strongNote = document.createElement("p");
        strongNote.className = "reader-base66-layer-note";
        strongNote.textContent = "Strong's layer unavailable for this verse.";
        verseBlock.appendChild(strongNote);
      }
    }

    verses.appendChild(verseBlock);
  }

  readerPassage.appendChild(verses);

  // Citation always renders at the BOTTOM of the reading area. When governed
  // metadata is missing an explicit statement is shown rather than English
  // substitution or silence.
  appendCitationTo(readerPassage, formatTurabianWebCitation());

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

// Legacy default governed edition, retained for the static markup note.
const exbase66EditionID = "eng-eng-asv";

// Only editions actually governed for EXBase66 display are offered. In this
// repository the verified verse-text binding covers eng-eng-asv (Psalm 23:1-6
// text records, hebwlc-ebible EXBase66 scope); no other language has a verified
// EXBase66 verse binding, so the menu is not padded with unverified editions.
const EXBASE66_GOVERNED_EDITION_IDS = new Set(["eng-eng-asv"]);

const EXBASE66_VERSE_UNAVAILABLE =
  "No verified EXBase66 verse binding exists for this selection";

// One verse per query: the chapter-wide evidence path is not offered at all.
const EXBASE66_VERSE_REQUIRED =
  "Select a verse before displaying evidence. EXBase66 displays one verse per query; there is no chapter-wide view.";
let exbase66BooksLoaded = false;
let exbase66MenusLoaded = false;
let exbase66Language = "";
let exbase66Edition = "";

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

const fillExbase66Select = (select, placeholder, entries, selectedValue = "") => {
  if (!select) return;

  const options = [makeExbase66Option(placeholder)];
  for (const entry of entries) {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent = entry.label;
    options.push(option);
  }

  select.replaceChildren(...options);
  select.disabled = entries.length === 0;
  select.value = entries.some((entry) => entry.value === selectedValue)
    ? selectedValue
    : "";
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

  // Only the verified Psalm 23 binding offers verses; every other selection
  // keeps the verse menu disabled because no governed verse list exists for it
  // and no verse-list endpoint is exposed. Nothing is inferred or fabricated,
  // and no chapter-wide display is offered anywhere.
  if (!isPsalm23) {
    resetExbase66VerseMenu(Boolean(chapter));
    return;
  }

  const options = [makeExbase66Option("Select verse")];

  for (let verse = 1; verse <= EXBASE66_PSALM23_VERSE_COUNT; verse += 1) {
    const option = document.createElement("option");
    option.value = String(verse);
    option.textContent = `Psalm 23:${verse}`;
    options.push(option);
  }

  readerExbase66Verse.replaceChildren(...options);
  readerExbase66Verse.disabled = false;
};

// Governed edition lookup for EXBase66. Only editions in
// EXBASE66_GOVERNED_EDITION_IDS are ever offered; when the catalog is
// unavailable the single verified governed edition is used as an honest
// fallback rather than padding the menu with unverified editions.
const getExbase66GovernedEditions = () =>
  readerEditions.filter((item) =>
    EXBASE66_GOVERNED_EDITION_IDS.has(getEditionID(item))
  );

const getExbase66EditionEntries = (languageCode = "") => {
  const governed = getExbase66GovernedEditions().filter(
    (edition) => !languageCode || getLanguageCode(edition) === languageCode
  );

  const entries = governed.map((edition) => ({
    value: getEditionID(edition),
    label: getEditionName(edition),
  }));

  const isFallbackLanguage = !languageCode || languageCode === "eng";
  if (entries.length === 0 && isFallbackLanguage) {
    entries.push({
      value: exbase66EditionID,
      label: "American Standard Version (1901)",
    });
  }

  return entries;
};

const populateExbase66EditionMenus = () => {
  if (!readerExbase66Language || !readerExbase66EditionSelect) return;

  const governed = getExbase66GovernedEditions();
  const languages = governed.length
    ? getLanguagesFromEditions(governed)
    : [{ code: "eng", name: getLanguageName("eng") }];

  fillExbase66Select(
    readerExbase66Language,
    "Select language",
    languages.map((language) => ({ value: language.code, label: language.name })),
    exbase66Language
  );

  readerExbase66EditionSelect.replaceChildren(
    makeExbase66Option("Select language first")
  );
  readerExbase66EditionSelect.disabled = true;
};

const loadExbase66Books = async () => {
  if (!readerExbase66Book || !exbase66Edition) return;

  readerExbase66Book.disabled = true;
  setExbase66Message("Loading EXBase66 books…");

  try {
    const response = await fetch(
      `${readerApiPrefix()}/reader/books?edition=${encodeURIComponent(
        exbase66Edition
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
      "Select a book, then a chapter and a verse. Evidence is displayed only when you press the Display-evidence button."
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

// Best-effort restoration of EXBase66's own selections from a ?readerMode=exbase66
// URL, so shared/cited links reopen the same one-verse query.
const restoreExbase66QueryState = async () => {
  if (!readerExbase66Language || !readerExbase66EditionSelect) return;

  const requestedEdition = initialReaderQuery.get("edition");
  const requestedLanguage =
    initialReaderQuery.get("language") ||
    (requestedEdition ? requestedEdition.split("-")[0] : "");

  const languageOption = [...readerExbase66Language.options].find(
    (option) => option.value === requestedLanguage
  );
  if (!languageOption) return;

  readerExbase66Language.value = requestedLanguage;
  handleExbase66LanguageChange();

  const editionOption = [...readerExbase66EditionSelect.options].find(
    (option) => option.value === requestedEdition
  );
  if (!editionOption) return;

  readerExbase66EditionSelect.value = requestedEdition;
  await handleExbase66EditionChange();

  const requestedBook = initialReaderQuery.get("book");
  const requestedChapter = initialReaderQuery.get("chapter");
  const requestedVerse = initialReaderQuery.get("verse");
  if (!requestedBook || !requestedChapter) return;

  const bookOption = [...readerExbase66Book.options].find(
    (option) => option.value === requestedBook
  );
  if (!bookOption) return;

  readerExbase66Book.value = requestedBook;
  await handleExbase66BookChange();

  const chapterOption = [...readerExbase66Chapter.options].find(
    (option) => option.value === requestedChapter
  );
  if (!chapterOption) return;

  readerExbase66Chapter.value = requestedChapter;
  handleExbase66ChapterChange();

  if (!requestedVerse) return;

  const verseOption = [...readerExbase66Verse.options].find(
    (option) => option.value === requestedVerse
  );
  if (!verseOption) return;

  readerExbase66Verse.value = requestedVerse;
  handleExbase66VerseChange();
};

const loadExbase66Editions = async () => {
  if (readerEditions.length === 0) {
    try {
      readerEditions = await fetchReaderEditions();
    } catch (error) {
      console.error("EXBase66 edition lookup failed:", error);
      readerEditions = [];
    }
  }

  // Falls back to the static governed menus already present in the markup
  // when the editions catalog is unavailable (no live Reader API).
  populateExbase66EditionMenus();

  if (initialReaderQuery.get("readerMode") === "exbase66") {
    await restoreExbase66QueryState();
  }
};

const ensureExbase66MenusLoaded = () => {
  // The governed edition lookup must not touch the main Reader menus, which
  // stay untouched while EXBase66 is open.
  if (exbase66MenusLoaded) return;
  exbase66MenusLoaded = true;
  void loadExbase66Editions();
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

const appendExbase66Psalm23Binding = (results, selectedVerse) => {
  const intro = document.createElement("p");
  intro.textContent = `Governed reference-to-passage-ID binding for Psalm 23, verse ${selectedVerse} (the campaign's verified verse scope):`;
  results.appendChild(intro);

  const bindings = document.createElement("ul");
  bindings.className = "reader-exbase66-relations";

  const item = document.createElement("li");
  item.textContent = `OT:PSA:23:${selectedVerse} — passage ID ${
    EXBASE66_PSALM23_FIRST_PASSAGE_ID + Number(selectedVerse) - 1
  }`;
  bindings.appendChild(item);

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

const appendExbase66VerseEvidence = (results, selectedVerse) => {
  const heading = document.createElement("h4");
  heading.textContent = "Verse-scoped evidence";
  results.appendChild(heading);

  const note = document.createElement("p");
  note.textContent = EXBASE66_TIER_LEGEND;
  results.appendChild(note);

  // Exactly the one selected verse: evidence is never summed across verses.
  appendExbase66VerseBlock(results, Number(selectedVerse));
};

const appendExbase66UnavailableSynthesis = (results) => {
  const unavailable = document.createElement("p");
  unavailable.className = "reader-exbase66-source-cite";
  unavailable.textContent = "Colibri synthesis unavailable for this selection.";
  results.appendChild(unavailable);
};

const appendExbase66ColibriSynthesis = (results, selectedVerse) => {
  const heading = document.createElement("h4");
  heading.textContent = "Colibri synthesis (existing artifact; ai_authority:false)";
  results.appendChild(heading);

  const note = document.createElement("p");
  note.textContent = `Embedded verbatim from ${EXBASE66_COLIBRI_DIR} (SHA256SUMS manifest) — no live Colibri call, no new synthesis, no inference.`;
  results.appendChild(note);

  // Only the one selected verse's existing synthesis artifact is shown.
  const data = EXBASE66_COLIBRI_SYNTHESIS[Number(selectedVerse)];

  if (!data) {
    appendExbase66UnavailableSynthesis(results);
    return;
  }

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
};

const appendExbase66IntegrationNote = (results) => {
  const details = document.createElement("details");
  details.className = "reader-exbase66-diagnostics";

  const summary = document.createElement("summary");
  summary.textContent = "Integration status";
  details.appendChild(summary);

  const note = document.createElement("p");
  note.textContent =
    "This is a menus-only, one-verse-per-query view: no search, no passage-ID entry, and no automatic inference. No live EXBase66 evidence endpoint is called. Verse selection is offered only where a verified governed binding exists — Psalm 23, verses 1-6 — and the verse menu stays disabled elsewhere because no verse list is exposed for those chapters.";
  details.appendChild(note);

  results.appendChild(details);
};

const getExbase66AccessUrl = () => {
  const params = new URLSearchParams();
  params.set("readerMode", "exbase66");
  if (exbase66Edition) params.set("edition", exbase66Edition);
  if (readerExbase66Book?.value) params.set("book", readerExbase66Book.value);
  if (readerExbase66Chapter?.value) {
    params.set("chapter", readerExbase66Chapter.value);
  }
  if (readerExbase66Verse?.value) params.set("verse", readerExbase66Verse.value);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
};

// Loads ONLY the selected verse's text, bound to the selected edition and verse,
// from the governed Reader API. Returns the payload so the citation can reuse
// the same governed citation metadata. No text, alignment, or evidence is
// fabricated.
const loadExbase66VerseText = async (editionID, bookCode, chapter, verse) => {
  try {
    const response = await fetch(
      `${readerApiPrefix()}/reader/passage?edition=${encodeURIComponent(
        editionID
      )}&book=${encodeURIComponent(bookCode)}&chapter=${encodeURIComponent(
        chapter
      )}`
    );

    if (!response.ok) throw new Error(`Passage HTTP ${response.status}`);

    const payload = await response.json();
    const passage = payload.passage ?? payload.Passage ?? payload;
    const verses = passage.Verses ?? passage.verses ?? [];
    const match = verses.find(
      (item) => String(getVerseLabel(item)) === String(verse)
    );

    return {
      passage,
      citation: payload.citation ?? payload.Citation ?? null,
      text: match ? getVerseText(match).trim() : "",
      label: match ? getVerseLabel(match) : "",
    };
  } catch (error) {
    console.error("EXBase66 verse text failed:", error);
    return { passage: null, citation: null, text: "", label: "" };
  }
};

const appendExbase66Citation = (results, loaded, verse) => {
  const citationText = loaded.passage
    ? formatTurabianWebCitation(loaded.passage, loaded.citation, {
        verseRange: String(verse),
        accessUrl: getExbase66AccessUrl(),
      })
    : "";
  appendCitationTo(results, citationText);
};

const renderExbase66Evidence = async () => {
  const results = readerExbase66Panel?.querySelector("[data-exbase66-results]");
  if (!results) return;

  const bookCode = readerExbase66Book?.value ?? "";
  const chapter = readerExbase66Chapter?.value ?? "";
  const verse = readerExbase66Verse?.value ?? "";

  if (!bookCode || !chapter) {
    setExbase66Message("Select a book and chapter before displaying evidence.");
    return;
  }

  // ONE VERSE PER QUERY: verse selection is required and there is no
  // chapter-wide fallback path.
  if (!verse || readerExbase66Verse?.disabled) {
    setExbase66Message(EXBASE66_VERSE_REQUIRED);
    return;
  }

  const editionID = exbase66Edition || exbase66EditionID;
  const bookLabel =
    readerExbase66Book?.selectedOptions?.[0]?.textContent?.trim() || bookCode;
  const editionLabel =
    readerExbase66EditionSelect?.selectedOptions?.[0]?.textContent?.trim() ||
    editionID;
  const reference = `${editionLabel} — ${bookLabel} ${chapter}:${verse}`;

  setExbase66Message("Loading the selected verse…");
  const loaded = await loadExbase66VerseText(
    editionID,
    bookCode,
    chapter,
    verse
  );

  results.replaceChildren();

  const heading = document.createElement("h4");
  heading.textContent = "Selected passage";
  results.appendChild(heading);

  const referenceLine = document.createElement("p");
  referenceLine.textContent = `Reference: ${reference}`;
  results.appendChild(referenceLine);

  const verseText = document.createElement("p");
  verseText.className = "reader-exbase66-translation";
  verseText.dir = "auto";
  verseText.textContent = loaded.text
    ? `${loaded.label || verse} ${loaded.text}`
    : "Selected verse text is unavailable from the Reader API for this edition. No text was fabricated.";
  results.appendChild(verseText);

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

  // Citation is the very last element: the BOTTOM of the results area, for
  // exactly the one verse.
  appendExbase66Citation(results, loaded, verse);

  setExbase66Message("");
};

// Clear rendered evidence and message so a changed selection can never leave
// stale evidence on screen until Display evidence is pressed again.
const clearExbase66Results = () => {
  const results = readerExbase66Panel?.querySelector("[data-exbase66-results]");
  if (results) results.replaceChildren();
  setExbase66Message("");
};

const resetExbase66Downstream = () => {
  clearExbase66Results();

  if (readerExbase66Book) {
    readerExbase66Book.replaceChildren(
      makeExbase66Option("Select Bible / Edition first")
    );
    readerExbase66Book.disabled = true;
  }

  if (readerExbase66Chapter) {
    readerExbase66Chapter.replaceChildren(
      makeExbase66Option("Select book first")
    );
    readerExbase66Chapter.disabled = true;
  }

  resetExbase66VerseMenu(false);
  if (readerExbase66Display) readerExbase66Display.disabled = true;
};

// Selection flow: Language → Bible/edition → Book → Chapter → Verse → Display.
// Every menu clears stale results, including the new language/edition menus.
const handleExbase66LanguageChange = () => {
  exbase66Language = readerExbase66Language.value;
  exbase66Edition = "";
  exbase66BooksLoaded = false;

  resetExbase66Downstream();

  const entries = getExbase66EditionEntries(exbase66Language);
  fillExbase66Select(
    readerExbase66EditionSelect,
    "Select Bible / Edition",
    entries,
    ""
  );

  setExbase66Message(
    !exbase66Language
      ? "Select a language."
      : entries.length
        ? "Select a Bible / edition."
        : "No governed EXBase66 edition is available for this language yet."
  );
};

const handleExbase66EditionChange = async () => {
  exbase66Edition = readerExbase66EditionSelect.value;
  exbase66BooksLoaded = false;

  resetExbase66Downstream();

  if (!exbase66Edition) {
    setExbase66Message("Select a Bible / edition.");
    return;
  }

  exbase66BooksLoaded = true;
  await loadExbase66Books();
};

const handleExbase66BookChange = async () => {
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
        exbase66Edition || exbase66EditionID
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
};

const handleExbase66ChapterChange = () => {
  const chapter = readerExbase66Chapter.value;
  const bookCode = readerExbase66Book?.value ?? "";

  clearExbase66Results();

  populateExbase66VerseMenu(bookCode, chapter);
  if (readerExbase66Display) readerExbase66Display.disabled = true;

  if (!chapter) {
    setExbase66Message("Select a chapter.");
  } else if (
    bookCode === EXBASE66_PSALM23_BOOK_CODE &&
    chapter === EXBASE66_PSALM23_CHAPTER
  ) {
    setExbase66Message("Select a verse to display its evidence.");
  } else {
    setExbase66Message(
      `${EXBASE66_VERSE_UNAVAILABLE}; no evidence can be displayed.`
    );
  }
};

const handleExbase66VerseChange = () => {
  clearExbase66Results();

  const verse = readerExbase66Verse.value;
  if (readerExbase66Display) readerExbase66Display.disabled = !verse;

  setExbase66Message(
    verse ? "Display evidence when ready." : EXBASE66_VERSE_REQUIRED
  );
};

readerExbase66Language?.addEventListener("change", handleExbase66LanguageChange);
readerExbase66EditionSelect?.addEventListener(
  "change",
  () => void handleExbase66EditionChange()
);
readerExbase66Book?.addEventListener(
  "change",
  () => void handleExbase66BookChange()
);
readerExbase66Chapter?.addEventListener("change", handleExbase66ChapterChange);
readerExbase66Verse?.addEventListener("change", handleExbase66VerseChange);
readerExbase66Display?.addEventListener("click", () => {
  void renderExbase66Evidence();
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

/* =====================================================================
   READER HELP (contextual)
   The ☰ SCRIPTUREi menu offers a Help topic per reader. A topic renders its
   description inside the Read Scripture content area and "Return to Scripture"
   restores the prior passage, reader/view, and selections from an in-memory
   snapshot — no fetch, AI, or enrichment call is made by opening or leaving Help.
   ===================================================================== */

const readerHelpPanel = document.querySelector("[data-reader-help-panel]");
const readerEditionName = document.querySelector("[data-reader-edition-name]");
const readerSiteMenuTrigger = document.querySelector("[data-reader-site-menu]");
const readerSiteMenuPanel = document.querySelector(
  "[data-reader-site-menu-panel]"
);
const readerNavigation = document.querySelector(".reader-navigation");
const readerToolsFooter = document.querySelector(".reader-tools");

const readerHelpContent = {
  bible: {
    title: "Bible Help",
    paragraphs: [
      "The Bible view is the first of four readers, chosen in the ribbon beside ☰ SCRIPTUREi: Bible, Century, Base66, and EXBase66.",
      "Open a published edition by choosing a language, then a Bible / Translation, then a book and a chapter. Language entries show the native name followed by the English name in parentheses — for example “Deutsch (German)” — and are ordered A–Z by the English name. Only editions published to this site appear.",
      "The reading controls below the passage adjust and share the text: A− and A+ change the on-screen font size, Print opens the browser's print dialog for the current passage, Download saves the passage as a text file, and Share uses the device share sheet (or copies the text) where the browser supports it. A control the browser cannot support stays disabled.",
      "Below the passage the reader shows a Turabian-style citation assembled from the selected edition's own metadata and kept in that Bible's language. When the governed metadata is missing, the reader states that rather than substituting English details.",
    ],
  },
  century: {
    title: "Century Help",
    paragraphs: [
      "The Century view is the first reader's other view. It browses published Scripture witnesses by the edition century metadata recorded for each edition.",
      "Choose a century, then the edition built in that century, then a book and a chapter. Selections pass through the same governed Reader path as the Bible view.",
      "Edition century is publication metadata for that edition only. It is not the date of the Biblical events described and not the date the text was composed.",
    ],
  },
  base66: {
    title: "Base66 Help",
    paragraphs: [
      "Base66 is the second reader. It presents a governed reading view built only from a designated set of Base66 edition identities, so the edition shown is the one the campaign has governed rather than an arbitrary one.",
      "Navigation mirrors the Bible view: language, Bible / Translation, book, and chapter. The passage is canonical Bible content; alongside it Base66 adds reference layers where the Reader data path provides them — a translation line, an original-language line, and lexical/Strong's values.",
      "Where a layer is not populated for a verse, Base66 states that the layer is unavailable instead of filling it in. The Bible text is canonical content; the original-language and lexical/Strong layers are governed reference material, not a second canon.",
    ],
  },
  exbase66: {
    title: "EXBase66 Help",
    paragraphs: [
      "EXBase66 is the third reader. It answers a single-verse query: choose a language, then a Bible / edition, then a book, a chapter, and a verse, then press Display evidence.",
      "Only the governed English binding eng-eng-asv (American Standard Version, 1901) has a verified EXBase66 verse binding today; no other language does. The right-side panel holds the query menus, the core and external layer lists, and the diagnostics block.",
      "Each layer is labelled with its evidence tier and source. The tiers keep different things apart: configured-only, populated, populated and validated, populated external evidence, validated gaps, and NO_EVIDENCE. A disabled layer menu means that layer is not available for display for the current query.",
      "Colibri synthesis is configuration only here: config records role SYNTHESIS_ONLY and authority false, and this repository never starts the Colibri server and the site makes no live Colibri calls. Existing synthesis artifacts are not ingested by the site. Missing evidence, candidate records, validation state, and AI synthesis are distinct states, and AI synthesis creates no Biblical or canonical authority.",
    ],
  },
};

let readerHelpSnapshot = null;

const buildReaderHelpTopic = (topic) => {
  const content = readerHelpContent[topic];
  if (!content || !readerHelpPanel) return null;

  readerHelpPanel.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = content.title;
  readerHelpPanel.appendChild(heading);

  for (const text of content.paragraphs) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    readerHelpPanel.appendChild(paragraph);
  }

  const returnButton = document.createElement("button");
  returnButton.type = "button";
  returnButton.className = "reader-help-return";
  returnButton.dataset.readerHelpReturn = "";
  returnButton.textContent = "Return to Scripture";
  readerHelpPanel.appendChild(returnButton);

  return returnButton;
};

const captureReaderHelpSnapshot = () => ({
  mode: readerMode?.value ?? "reader",
  activeMode: readerMode?.dataset.activeMode ?? "reader",
  returnMode: readerMode?.dataset.returnMode ?? null,
  language: readerLanguage?.value ?? "",
  edition: readerEdition?.value ?? "",
  book: readerBook?.value ?? "",
  chapter: readerChapter?.value ?? "",
  message: readerMessage?.textContent ?? "",
  editionName: readerEditionName?.textContent ?? "",
  passageHTML: readerPassage?.innerHTML ?? "",
  passageDir: readerPassage?.dir ?? "",
  base66Hidden: readerBase66Panel?.hidden ?? true,
  exbase66Hidden: readerExbase66Panel?.hidden ?? true,
  navigationHidden: readerNavigation?.hidden ?? false,
  toolsHidden: readerToolsFooter?.hidden ?? false,
  toolsEnabled: readerPrint ? !readerPrint.disabled : false,
  fontScale: readerFontScale,
  currentPassage,
  currentCitation,
});

const showReaderHelp = (topic) => {
  const returnButton = buildReaderHelpTopic(topic);
  if (!returnButton) return;

  if (!readerHelpSnapshot) readerHelpSnapshot = captureReaderHelpSnapshot();

  readerHelpPanel.hidden = false;
  if (readerEditionName) readerEditionName.hidden = true;
  if (readerMessage) readerMessage.hidden = true;
  if (readerPassage) readerPassage.hidden = true;
  if (readerBase66Panel) readerBase66Panel.hidden = true;
  if (readerExbase66Panel) readerExbase66Panel.hidden = true;
  if (readerNavigation) readerNavigation.hidden = true;
  if (readerToolsFooter) readerToolsFooter.hidden = true;

  returnButton.focus();
};

const returnToScripture = () => {
  const snapshot = readerHelpSnapshot;
  readerHelpSnapshot = null;

  if (readerHelpPanel) readerHelpPanel.hidden = true;
  if (!snapshot) return;

  if (readerEditionName) {
    readerEditionName.hidden = false;
    readerEditionName.textContent = snapshot.editionName;
  }
  if (readerMessage) {
    readerMessage.hidden = false;
    readerMessage.textContent = snapshot.message;
  }
  if (readerPassage) {
    readerPassage.hidden = false;
    readerPassage.dir = snapshot.passageDir;
    readerPassage.innerHTML = snapshot.passageHTML;
  }
  if (readerBase66Panel) readerBase66Panel.hidden = snapshot.base66Hidden;
  if (readerExbase66Panel) readerExbase66Panel.hidden = snapshot.exbase66Hidden;
  if (readerNavigation) readerNavigation.hidden = snapshot.navigationHidden;
  if (readerToolsFooter) readerToolsFooter.hidden = snapshot.toolsHidden;

  if (readerMode) {
    readerMode.value = snapshot.mode;
    readerMode.dataset.activeMode = snapshot.activeMode;
    if (snapshot.returnMode) readerMode.dataset.returnMode = snapshot.returnMode;
  }
  if (readerLanguage) readerLanguage.value = snapshot.language;
  if (readerEdition) readerEdition.value = snapshot.edition;
  if (readerBook) readerBook.value = snapshot.book;
  if (readerChapter) readerChapter.value = snapshot.chapter;

  readerFontScale = snapshot.fontScale;
  applyReaderFontScale();
  currentPassage = snapshot.currentPassage;
  currentCitation = snapshot.currentCitation;

  setReaderToolsEnabled(snapshot.toolsEnabled);
  syncReaderSwitcherUI(snapshot.mode);
  setPrimaryReaderLabel(snapshot.mode === "century" ? "Century" : "Language");

  readerSiteMenuTrigger?.focus();
};

const setReaderSiteMenuOpen = (open) => {
  if (!readerSiteMenuPanel || !readerSiteMenuTrigger) return;
  readerSiteMenuPanel.hidden = !open;
  readerSiteMenuTrigger.setAttribute("aria-expanded", String(open));
};

if (readerSiteMenuTrigger && readerSiteMenuPanel) {
  readerSiteMenuTrigger.addEventListener("click", () => {
    const willOpen = readerSiteMenuPanel.hidden;
    setReaderSiteMenuOpen(willOpen);
    if (willOpen) {
      readerSiteMenuPanel.querySelector("[data-reader-help]")?.focus();
    }
  });

  readerSiteMenuPanel.addEventListener("click", (event) => {
    const item = event.target.closest("[data-reader-help]");
    if (!item) return;
    setReaderSiteMenuOpen(false);
    showReaderHelp(item.dataset.readerHelp);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !readerSiteMenuPanel.hidden) {
      setReaderSiteMenuOpen(false);
      readerSiteMenuTrigger.focus();
    }
  });
}

readerHelpPanel?.addEventListener("click", (event) => {
  if (event.target.closest("[data-reader-help-return]")) returnToScripture();
});

if (readerLanguage && readerEdition && readerBook && readerChapter) {
  readerSwitcherButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.readerSelect;
      // "bible" is the first reader's standard view; "century" is the first
      // reader's century view that used to live in the separate Bible/Century
      // row and still runs the same governed code path.
      requestReaderMode(key === "bible" ? "reader" : key);
    });
  });

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
      syncReaderSwitcherUI(nextMode);
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
  setPrimaryReaderLabel(
    readerMode?.value === "century" ? "Century" : "Language"
  );

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

/* SCRIPTUREi READER MODE REFRESH R1
   Close visible Help before the existing ribbon mode handler runs.
   No document reload; preserve existing Reader navigation.
*/
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const ribbon = document.querySelector(".reader-ribbon-switcher");
  if (!ribbon) return;

  const control = event.target.closest("button, a, [role='tab']");
  if (!control || !ribbon.contains(control)) return;

  const mode = (control.textContent || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!["Bible", "Century", "Base66", "EXBase66"].includes(mode)) {
    return;
  }

  const returnButton = Array.from(
    document.querySelectorAll("button")
  ).find((button) =>
    button.textContent.trim() === "Return to Scripture" &&
    button.getClientRects().length > 0
  );

  if (returnButton) {
    returnButton.click();
  }

  // The existing ribbon handler continues processing this selection.
}, true);

/* END SCRIPTUREi READER MODE REFRESH R1 */
