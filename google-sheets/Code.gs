/**
 * Bundly — submissions sheet.
 *
 * This script turns one Google Sheet into the whole content pipeline:
 *
 *   doPost   — the website appends a new submission (Status = "In Process").
 *   doGet    — the website reads back every Approved row to render the site.
 *   onEdit   — changing a Status cell pings the website, which refreshes its
 *              cache and emails the developer about the decision.
 *
 * Setup lives in README.md in this folder. Run `initialiseSheet` once, then
 * `installTriggers` once.
 */

/* -------------------------------------------------------------------------- */
/* Config — must match the website's environment variables                     */
/* -------------------------------------------------------------------------- */

/** Must equal SHEETS_SECRET on the website. */
const SHARED_SECRET = 'change-me';

/** Your deployed site, no trailing slash. */
const SITE_URL = 'https://your-site.vercel.app';

const SHEET_NAME = 'Submissions';

/**
 * The spreadsheet's id — the long string in its URL:
 *   docs.google.com/spreadsheets/d/THIS_PART/edit
 *
 * Required when this script is a STANDALONE project. Leave empty only if the
 * script was created from inside the sheet (Extensions -> Apps Script), where
 * getActiveSpreadsheet() works on its own.
 */
const SPREADSHEET_ID = '';

/* -------------------------------------------------------------------------- */
/* Columns                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Order matters — it defines the sheet layout AND the append order.
 * Status sits second so it's the first thing a reviewer can reach.
 */
const HEADERS = [
  'Timestamp',      // A
  'Status',         // B  <- the only cell you normally edit
  'Reviewer Notes', // C  <- included in the rejection email
  'Game Name',      // D
  'Steam AppID',    // E
  'Steam Link',     // F
  'Developer',      // G
  'Publishers',     // H
  'Price',          // I
  'Release Date',   // J
  'Genres',         // K
  'Platforms',      // L
  'Tags',           // M
  'Review Score',   // N
  'Positive %',     // O
  'Capsule URL',    // P
  'Description',    // Q
  'Steam Key',      // R  <- never sent to the public site
  'Email',          // S  <- never sent to the public site
  'Additional Info',// T
  'Ours',           // U  <- Yes = show on the /games page
  'Featured',       // V  <- Yes = the single top slot on /games
];

/** Field name on the incoming JSON, per column. */
const FIELDS = [
  'timestamp', 'status', 'reviewerNotes', 'gameName', 'steamAppId', 'steamLink',
  'developer', 'publishers', 'price', 'releaseDate', 'genres', 'platforms',
  'tags', 'reviewScore', 'positive', 'capsule', 'description', 'steamKey',
  'email', 'additionalInfo', 'ours', 'featured',
];

const COL = {};
HEADERS.forEach(function (h, i) { COL[h] = i + 1; }); // 1-based

const STATUSES = ['In Process', 'Approved', 'Rejected', 'Hidden'];

/* -------------------------------------------------------------------------- */
/* Web endpoints                                                               */
/* -------------------------------------------------------------------------- */

/** Website -> sheet: append a submission. */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (SHARED_SECRET && body.secret !== SHARED_SECRET) {
      return json({ ok: false, error: 'Unauthorized' });
    }

    const sheet = getSheet();
    const row = FIELDS.map(function (field) {
      if (field === 'timestamp') return body.timestamp || new Date().toISOString();
      if (field === 'status') return body.status || 'In Process';
      return body[field] || '';
    });

    sheet.appendRow(row);
    sheet.getRange(sheet.getLastRow(), 1, 1, HEADERS.length)
      .setVerticalAlignment('top');

    return json({ ok: true, row: sheet.getLastRow() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/**
 * Sheet -> website: every Approved row.
 *
 * Steam Key is excluded. Email is included because matching needs to know who
 * owns each game — the website keeps it server-side and never sends it to the
 * browser. The secret gates this endpoint.
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};

    if (SHARED_SECRET && params.secret !== SHARED_SECRET) {
      return json({ ok: false, error: 'Unauthorized' });
    }

    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return json({ ok: true, games: [] });

    const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    const games = [];

    for (var i = 0; i < values.length; i++) {
      const r = values[i];
      const status = String(r[COL['Status'] - 1] || '').trim().toLowerCase();
      if (status !== 'approved') continue;

      games.push({
        gameName:    String(r[COL['Game Name'] - 1] || ''),
        steamAppId:  String(r[COL['Steam AppID'] - 1] || ''),
        steamLink:   String(r[COL['Steam Link'] - 1] || ''),
        developer:   String(r[COL['Developer'] - 1] || ''),
        publishers:  String(r[COL['Publishers'] - 1] || ''),
        price:       String(r[COL['Price'] - 1] || ''),
        releaseDate: String(r[COL['Release Date'] - 1] || ''),
        genres:      String(r[COL['Genres'] - 1] || ''),
        platforms:   String(r[COL['Platforms'] - 1] || ''),
        tags:        String(r[COL['Tags'] - 1] || ''),
        reviewScore: String(r[COL['Review Score'] - 1] || ''),
        positive:    String(r[COL['Positive %'] - 1] || ''),
        capsule:     String(r[COL['Capsule URL'] - 1] || ''),
        description: String(r[COL['Description'] - 1] || ''),
        // Owner email: needed server-side to work out who matched with whom.
        // The website never forwards this to the browser.
        ownerEmail:  String(r[COL['Email'] - 1] || ''),
        ours:        String(r[COL['Ours'] - 1] || ''),
        featured:    String(r[COL['Featured'] - 1] || ''),
      });
    }

    return json({ ok: true, games: games, count: games.length });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* -------------------------------------------------------------------------- */
/* Status-change trigger                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Installable onEdit trigger. Fires on every edit, but only acts when a Status
 * cell in the Submissions sheet actually changed.
 *
 * Must be installed via `installTriggers` — a simple onEdit cannot call
 * external URLs.
 */
function onStatusEdit(e) {
  try {
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    if (sheet.getName() !== SHEET_NAME) return;
    if (e.range.getColumn() !== COL['Status']) return;
    if (e.range.getRow() < 2) return;

    const newStatus = String(e.value || '').trim();
    const oldStatus = String(e.oldValue || '').trim();
    if (newStatus === oldStatus) return;

    const row = e.range.getRow();
    const values = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];

    notifySite({
      secret: SHARED_SECRET,
      status: newStatus,
      statusChanged: true,
      gameName: String(values[COL['Game Name'] - 1] || ''),
      email: String(values[COL['Email'] - 1] || ''),
      reviewerNotes: String(values[COL['Reviewer Notes'] - 1] || ''),
    });
  } catch (err) {
    console.error('onStatusEdit failed: ' + err);
  }
}

/** POSTs the status change to the website. */
function notifySite(payload) {
  if (!SITE_URL || SITE_URL.indexOf('example') !== -1) {
    console.warn('SITE_URL is not set — skipping website notification.');
    return;
  }

  const res = UrlFetchApp.fetch(SITE_URL + '/api/sheet-hook', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  console.log('sheet-hook -> ' + res.getResponseCode() + ' ' + res.getContentText());
}

/* -------------------------------------------------------------------------- */
/* One-time setup — run these manually from the editor                         */
/* -------------------------------------------------------------------------- */

/**
 * Resolves the spreadsheet whether this script is bound to it or standalone.
 *
 * getActiveSpreadsheet() returns null in a standalone project, which surfaces
 * as "Cannot read properties of null" — so fall back to opening by id.
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  throw new Error(
    'No spreadsheet found. This script is standalone, so set SPREADSHEET_ID ' +
      'at the top of Code.gs to the id in your sheet URL ' +
      '(docs.google.com/spreadsheets/d/THIS_PART/edit).'
  );
}

/** Builds the sheet layout: headers, freezing, widths, banding, validation. */
function initialiseSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  setupSheet(sheet);
  // console.log, not getUi().alert — a standalone script has no UI context
  // and alert() would throw after the work has already succeeded.
  console.log('Sheet ready: \'' + SHEET_NAME + '\' built. Now run installTriggers().');
}

/**
 * Installs the onEdit trigger. Safe to run repeatedly — it clears its own
 * previous triggers first, so you don't end up firing the hook several times
 * per edit.
 */
function installTriggers() {
  const existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'onStatusEdit') {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }

  ScriptApp.newTrigger('onStatusEdit')
    .forSpreadsheet(getSpreadsheet())
    .onEdit()
    .create();

  console.log('Status trigger installed on ' + SHEET_NAME + '.');
}

/** Sends a test payload so you can confirm the site is reachable. */
function testSiteConnection() {
  notifySite({
    secret: SHARED_SECRET,
    status: 'In Process',
    statusChanged: false,
    gameName: 'Connection test',
    email: '',
  });
  console.log('Test payload sent to ' + SITE_URL + '/api/sheet-hook');
}

function setupSheet(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  const header = sheet.getRange(1, 1, 1, HEADERS.length);
  header.setFontWeight('bold');
  header.setBackground('#1f1f23');
  header.setFontColor('#ffffff');
  header.setVerticalAlignment('middle');

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2); // Timestamp + Status stay visible while scrolling
  sheet.setRowHeight(1, 38);

  const widths = [
    160, 120, 260, 200, 100, 280, 160, 180, 90, 120,
    200, 140, 260, 150, 90, 320, 340, 200, 220, 300,
    80, 90, // Ours, Featured
  ];
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });

  const body = sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), HEADERS.length);
  body.setVerticalAlignment('top');

  // Clear existing banding first. applyRowBanding() throws if the range is
  // already banded, so without this the function can only ever run once — and
  // it needs re-running whenever columns are added.
  const bandings = sheet.getBandings();
  for (var b = 0; b < bandings.length; b++) bandings[b].remove();
  body.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);

  applyStatusRules(sheet);
}

/** Status column: dropdown + colour coding. */
function applyStatusRules(sheet) {
  const lastRow = Math.max(sheet.getMaxRows(), 1000);
  const statusRange = sheet.getRange(2, COL['Status'], lastRow - 1, 1);

  statusRange.setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(STATUSES, true)
      .setAllowInvalid(false)
      .setHelpText('Approved puts the game live. Rejected/Hidden pull it down.')
      .build()
  );

  const colours = [
    { value: 'Approved',   bg: '#d7f5dd', fg: '#0b6b26' },
    { value: 'Rejected',   bg: '#fbdcdc', fg: '#a51b1b' },
    { value: 'Hidden',     bg: '#e8e8ea', fg: '#52525b' },
    { value: 'In Process', bg: '#fdf1cf', fg: '#8a6100' },
  ];

  const rules = colours.map(function (c) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(c.value)
      .setBackground(c.bg)
      .setFontColor(c.fg)
      .setBold(true)
      .setRanges([statusRange])
      .build();
  });

  sheet.setConditionalFormatRules(rules);
}

function getSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    setupSheet(sheet);
  }
  return sheet;
}

/**
 * Apps Script web apps ALWAYS respond 200 — ContentService cannot set a status
 * code. Success/failure is carried in the body: callers must check `ok`.
 */
function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
