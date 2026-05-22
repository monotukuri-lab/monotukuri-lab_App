/**
 * 舞鶴高専 ものつくりラボ アプリ統合自己完結APIスクリプト (Api.gs)
 * 
 * [設置方法]
 * 1. Google ドライブ (drive.google.com) または script.google.com を開きます。
 * 2. 左上の「＋新規」または「新しいプロジェクト」をクリックして、新しい独立したGoogle Apps Scriptを作成します。
 * 3. プロジェクト名をご自由に（例：「ものつくりラボAPI」）設定します。
 * 4. 元々ある「myFunction」の記述をすべて消去し、このファイルのコードを丸ごと貼り付けて保存します。
 * 5. 右上の「デプロイ」>「新しいデプロイ」をクリックし、
 *    - 種類: ウェブアプリ
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 全員 (または g.maizuru-ct.ac.jpの全員)
 *    としてデプロイを実行し、発行された新しいURLをアプリの設定に入力してください。
 */

// ============================================================================
// 1. 基本設定（既存の3Dプリンター管理原本と連動するためのID等）
// ============================================================================

// 原本スプレッドシートのID（舞鶴高専のものつくりラボ3Dプリンター管理スプレッドシート）
var SPREADSHEET_ID = '1TJwyivkS81Yf6gR7vZbmxnH5D3y1mrf-kZq_n6tar5o';
var SHEET_NAME = 'シート1'; // プリンターデータが保存されているシート名

// プリンターのリスト
var PRINTER_LIST = [
  'Adventurer 4 ①',
  'Adventurer 4 ②',
  'Adventurer 4 ③',
  'Adventurer 4 ④',
  'Raise3D Pro3 ①'
];

// ============================================================================
// 2. Webアプリのエントリーポイント (CORS回避のためすべてGETで処理)
// ============================================================================
function doGet(e) {
  var action = e.parameter.action;
  var result = { success: false, message: '不明なアクションです' };
  
  try {
    if (!action) {
      return HtmlService.createHtmlOutput('<h1>ものつくりラボ 統合API (自己完結版)</h1><p>このURLはアプリ連携用です。アプリの設定に入力してください。</p>');
    }
    
    // アクションに応じた分岐処理
    switch (action) {
      // --- 3Dプリンター管理 (内包された関数を呼び出し) ---
      case 'getPrinterStatus':
        var statusMap = getPrinterStatus();
        return jsonResponse_(statusMap);
        
      case 'startUsage':
        var startForm = {
          printerName: e.parameter.printerName,
          grade: e.parameter.grade,
          dept: e.parameter.dept,
          sid: e.parameter.sid,
          name: e.parameter.name
        };
        result = startUsage(startForm);
        break;
        
      case 'endUsage':
        var endForm = {
          printerName: e.parameter.printerName,
          checkSid: e.parameter.checkSid
        };
        result = endUsage(endForm);
        break;
        
      // --- シフト管理 ---
      case 'getShifts':
        var shifts = getShifts_();
        return jsonResponse_(shifts);
        
      case 'joinShift':
        var updatedShiftsJoin = joinShift_(e.parameter.date, e.parameter.userName, e.parameter.userRole);
        return jsonResponse_(updatedShiftsJoin);
        
      case 'leaveShift':
        var updatedShiftsLeave = leaveShift_(e.parameter.date, e.parameter.userName, e.parameter.userRole);
        return jsonResponse_(updatedShiftsLeave);
        
      case 'deleteShiftFrame':
        var updatedShiftsDel = deleteShiftFrame_(e.parameter.date);
        return jsonResponse_(updatedShiftsDel);
        
      case 'restoreShiftFrame':
        var updatedShiftsRes = restoreShiftFrame_(e.parameter.date);
        return jsonResponse_(updatedShiftsRes);
        
      // --- お知らせ機能 ---
      case 'getAnnouncements':
        var announcements = getAnnouncements_();
        return jsonResponse_(announcements);
        
      case 'addAnnouncement':
        var title = e.parameter.title;
        var content = e.parameter.content;
        var important = e.parameter.important === 'true';
        var updatedAnnsAdd = addAnnouncement_(title, content, important);
        return jsonResponse_(updatedAnnsAdd);
        
      case 'deleteAnnouncement':
        var id = e.parameter.id;
        var updatedAnnsDel = deleteAnnouncement_(id);
        return jsonResponse_(updatedAnnsDel);

      // --- 固定希望シフト ＆ 特定予定管理 ---
      case 'getShiftPreferences':
        var prefs = getShiftPreferences_();
        return jsonResponse_(prefs);
        
      case 'saveShiftPreferences':
        var updatedPrefs = saveShiftPreferences_(e.parameter.prefsJson);
        return jsonResponse_(updatedPrefs);
        
      case 'getIrregularPeriods':
        var periods = getIrregularPeriods_();
        return jsonResponse_(periods);
        
      case 'saveIrregularPeriod':
        var updatedPeriods = saveIrregularPeriod_(e.parameter.periodJson);
        return jsonResponse_(updatedPeriods);
        
      case 'deleteIrregularPeriod':
        var id = e.parameter.id;
        var updatedPeriodsDel = deleteIrregularPeriod_(id);
        return jsonResponse_(updatedPeriodsDel);
    }
  } catch (err) {
    result = { success: false, message: 'システムエラーが発生しました: ' + err.toString() };
  }
  
  return jsonResponse_(result);
}

// ============================================================================
// 3. 3Dプリンター管理ロジック (既存の Code.js から移植・自己完結化)
// ============================================================================

/**
 * プリンターの稼働状況を取得する
 */
function getPrinterStatus() {
  var sheet = getSheet_();
  var data = sheet.getDataRange().getValues();
  var rows = data.slice(1); // ヘッダー行を除く

  var statusMap = {};

  // 初期化
  PRINTER_LIST.forEach(function(name) {
    statusMap[name] = { status: 'free' };
  });

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var pName = row[0];
    var startTime = row[1];
    var endTime = row[2];
    var grade = row[3];
    var department = row[4];
    var studentId = row[5];
    var userName = row[6];

    if (statusMap[pName] && (endTime === '' || endTime === null)) {
      statusMap[pName] = {
        status: 'busy',
        startTime: formatDate_(startTime),
        grade: grade,
        department: department,
        studentId: studentId,
        userName: userName,
        rowIndex: i + 2
      };
    }
  }

  return statusMap;
}

/**
 * 使用開始を記録する
 */
function startUsage(formObject) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var sheet = getSheet_();
    var pName = formObject.printerName;

    var currentStatus = getPrinterStatus();
    if (currentStatus[pName] && currentStatus[pName].status === 'busy') {
      return { success: false, message: 'このプリンターは既に使用中です。画面を更新してください。' };
    }

    var now = new Date();
    sheet.appendRow([
      pName,            // A: プリンター名
      now,              // B: 開始日時
      '',               // C: 終了日時 (空欄)
      formObject.grade, // D: 学年
      formObject.dept,  // E: 所属
      formObject.sid,   // F: 学籍番号
      formObject.name   // G: 氏名
    ]);

    return { success: true, message: '使用開始を記録しました。' };

  } catch (e) {
    return { success: false, message: 'エラーが発生しました: ' + e.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 使用終了を記録する
 */
function endUsage(formObject) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var sheet = getSheet_();
    var data = sheet.getDataRange().getValues();
    var pName = formObject.printerName;
    var checkSid = formObject.checkSid;

    var targetRowIndex = -1;
    var targetRowData = null;

    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      if (row[0] === pName && (row[2] === '' || row[2] === null)) {
        targetRowIndex = i + 1;
        targetRowData = row;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, message: '使用中の記録が見つかりませんでした。' };
    }

    var recordedSid = targetRowData[5];

    if (String(recordedSid).trim() !== String(checkSid).trim()) {
       return { success: false, message: '学籍番号が一致しません。' };
    }

    var now = new Date();
    sheet.getRange(targetRowIndex, 3).setValue(now);

    return { success: true, message: '使用終了を記録しました。' };

  } catch (e) {
    return { success: false, message: 'エラーが発生しました: ' + e.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ID指定で原本スプレッドシートからシートを取得する
 */
function getSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
  }
  return sheet;
}

/**
 * 3Dプリンター用の日付フォーマット
 */
function formatDate_(date) {
  if (!date) return '';
  try {
    return Utilities.formatDate(new Date(date), Session.getScriptTimeZone() || 'Asia/Tokyo', 'MM/dd HH:mm');
  } catch (e) {
    return date;
  }
}

// ============================================================================
// 4. シフト管理ロジック
// ============================================================================

/**
 * シフト一覧の取得
 */
function getShifts_() {
  var sheet = getOrCreateSheet_('シフト', ['日付', '時間帯', 'メンバー', '削除フラグ']);
  var data = sheet.getDataRange().getValues();
  var rows = data.slice(1);
  var shifts = [];
  
  rows.forEach(function(row) {
    var dateStr = formatDateStr_(row[0]);
    if (!dateStr) return;
    
    var timeRange = row[1] || '16:15 〜 18:15';
    var times = timeRange.split('〜');
    var startTime = (times[0] || '16:15').trim();
    var endTime = (times[1] || '18:15').trim();
    
    var members = [];
    if (row[2]) {
      members = String(row[2]).split(',').map(function(m) { return m.trim(); }).filter(Boolean);
    }
    
    var isDeleted = String(row[3]).toUpperCase() === 'TRUE';
    
    shifts.push({
      id: 'shift_' + dateStr,
      date: dateStr,
      startTime: startTime,
      endTime: endTime,
      memberNames: members,
      isDeleted: isDeleted
    });
  });
  
  return shifts;
}

/**
 * シフトへの参加登録
 */
function joinShift_(dateStr, userName, userRole) {
  var sheet = getOrCreateSheet_('シフト', ['日付', '時間帯', 'メンバー', '削除フラグ']);
  var data = sheet.getDataRange().getValues();
  var formattedName = userName + ' (' + (userRole === 'ta' ? 'TA' : '教員') + ')';
  
  var targetRowIndex = -1;
  var currentMembers = [];
  var isDeleted = false;
  
  for (var i = 1; i < data.length; i++) {
    var rowDate = formatDateStr_(data[i][0]);
    if (rowDate === dateStr) {
      targetRowIndex = i + 1;
      if (data[i][2]) {
        currentMembers = String(data[i][2]).split(',').map(function(m) { return m.trim(); }).filter(Boolean);
      }
      isDeleted = String(data[i][3]).toUpperCase() === 'TRUE';
      break;
    }
  }
  
  if (isDeleted) {
    throw new Error('この日は休館（シフト休止）のため登録できません。');
  }
  
  if (currentMembers.indexOf(formattedName) === -1) {
    currentMembers.push(formattedName);
  }
  
  var membersStr = currentMembers.join(',');
  
  if (targetRowIndex !== -1) {
    sheet.getRange(targetRowIndex, 3).setValue(membersStr);
    sheet.getRange(targetRowIndex, 4).setValue('FALSE');
  } else {
    sheet.appendRow([dateStr, '16:15 〜 18:15', membersStr, 'FALSE']);
  }
  
  return getShifts_();
}

/**
 * シフトからの離脱
 */
function leaveShift_(dateStr, userName, userRole) {
  var sheet = getOrCreateSheet_('シフト', ['日付', '時間帯', 'メンバー', '削除フラグ']);
  var data = sheet.getDataRange().getValues();
  var formattedName = userName + ' (' + (userRole === 'ta' ? 'TA' : '教員') + ')';
  
  var targetRowIndex = -1;
  var currentMembers = [];
  
  for (var i = 1; i < data.length; i++) {
    var rowDate = formatDateStr_(data[i][0]);
    if (rowDate === dateStr) {
      targetRowIndex = i + 1;
      if (data[i][2]) {
        currentMembers = String(data[i][2]).split(',').map(function(m) { return m.trim(); }).filter(Boolean);
      }
      break;
    }
  }
  
  if (targetRowIndex !== -1) {
    var updatedMembers = currentMembers.filter(function(name) {
      return name !== formattedName;
    });
    sheet.getRange(targetRowIndex, 3).setValue(updatedMembers.join(','));
  }
  
  return getShifts_();
}

/**
 * シフト枠の削除（休館日設定）
 */
function deleteShiftFrame_(dateStr) {
  var sheet = getOrCreateSheet_('シフト', ['日付', '時間帯', 'メンバー', '削除フラグ']);
  var data = sheet.getDataRange().getValues();
  
  var targetRowIndex = -1;
  
  for (var i = 1; i < data.length; i++) {
    var rowDate = formatDateStr_(data[i][0]);
    if (rowDate === dateStr) {
      targetRowIndex = i + 1;
      break;
    }
  }
  
  if (targetRowIndex !== -1) {
    sheet.getRange(targetRowIndex, 3).setValue('');
    sheet.getRange(targetRowIndex, 4).setValue('TRUE');
  } else {
    sheet.appendRow([dateStr, '16:15 〜 18:15', '', 'TRUE']);
  }
  
  return getShifts_();
}

/**
 * 削除されたシフト枠の復活
 */
function restoreShiftFrame_(dateStr) {
  var sheet = getOrCreateSheet_('シフト', ['日付', '時間帯', 'メンバー', '削除フラグ']);
  var data = sheet.getDataRange().getValues();
  
  var targetRowIndex = -1;
  
  for (var i = 1; i < data.length; i++) {
    var rowDate = formatDateStr_(data[i][0]);
    if (rowDate === dateStr) {
      targetRowIndex = i + 1;
      break;
    }
  }
  
  if (targetRowIndex !== -1) {
    sheet.getRange(targetRowIndex, 4).setValue('FALSE');
  }
  
  return getShifts_();
}

// ============================================================================
// 5. お知らせ機能ロジック
// ============================================================================

/**
 * お知らせの取得（シート自動生成付き）
 */
function getAnnouncements_() {
  var sheet = getOrCreateSheet_('お知らせ', ['ID', 'タイトル', '本文', '日付', '重要フラグ']);
  var data = sheet.getDataRange().getValues();
  
  if (data.length === 1) {
    var todayStr = formatDateStr_(new Date());
    var initialAnnouncements = [
      ['ann_1', 'ものつくりラボアプリ公開', 'ものづくりラボの管理用アプリを公開しました。', todayStr, 'TRUE'],
      ['ann_2', '3Dプリンター Raise3D メンテナンス完了', 'ノズルの目詰まりが発生していた「Raise3D Pro3 ①」のメンテナンスが完了し、本日より通常通り使用可能となりました。フィラメント交換の際は、手順書に従って丁寧に行ってください。', todayStr, 'FALSE'],
    ];
    
    initialAnnouncements.forEach(function(row) {
      sheet.appendRow(row);
    });
    data = sheet.getDataRange().getValues();
  }
  
  var rows = data.slice(1);
  var announcements = [];
  
  rows.forEach(function(row) {
    announcements.push({
      id: row[0],
      title: row[1],
      content: row[2],
      date: formatDateStr_(row[3]),
      important: String(row[4]).toUpperCase() === 'TRUE'
    });
  });
  
  return announcements.sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });
}

/**
 * お知らせの新規追加
 */
function addAnnouncement_(title, content, important) {
  var sheet = getOrCreateSheet_('お知らせ', ['ID', 'タイトル', '本文', '日付', '重要フラグ']);
  var todayStr = formatDateStr_(new Date());
  var id = 'ann_' + new Date().getTime(); // ユニークなタイムスタンプID
  
  sheet.appendRow([id, title, content, todayStr, String(important).toUpperCase()]);
  
  return getAnnouncements_();
}

/**
 * お知らせの削除
 */
function deleteAnnouncement_(id) {
  var sheet = getOrCreateSheet_('お知らせ', ['ID', 'タイトル', '本文', '日付', '重要フラグ']);
  var data = sheet.getDataRange().getValues();
  
  var targetRowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      targetRowIndex = i + 1;
      break;
    }
  }
  
  if (targetRowIndex !== -1) {
    sheet.deleteRow(targetRowIndex);
  }
  
  return getAnnouncements_();
}

// ============================================================================
// 6. 固定希望シフト ＆ 特定予定（テスト期間・祝日等）管理ロジック
// ============================================================================

/**
 * 曜日ごとの固定希望シフト情報の取得（初期データ自動生成付き）
 */
function getShiftPreferences_() {
  var sheet = getOrCreateSheet_('希望', ['曜日', 'スロット1', 'スロット2']);
  var data = sheet.getDataRange().getValues();
  
  // 初期データがない場合は月〜金を空で作成
  if (data.length === 1) {
    var initialPrefs = [
      [1, '', ''],
      [2, '', ''],
      [3, '', ''],
      [4, '', ''],
      [5, '', '']
    ];
    initialPrefs.forEach(function(row) {
      sheet.appendRow(row);
    });
    data = sheet.getDataRange().getValues();
  }
  
  var rows = data.slice(1);
  var prefs = [];
  
  rows.forEach(function(row) {
    prefs.push({
      dayOfWeek: Number(row[0]),
      slot1: row[1] ? String(row[1]) : '',
      slot2: row[2] ? String(row[2]) : ''
    });
  });
  
  return prefs;
}

/**
 * 曜日ごとの固定希望シフト情報の保存
 */
function saveShiftPreferences_(prefsJson) {
  var sheet = getOrCreateSheet_('希望', ['曜日', 'スロット1', 'スロット2']);
  var prefs = JSON.parse(prefsJson);
  var data = sheet.getDataRange().getValues();
  
  prefs.forEach(function(pref) {
    var targetRow = -1;
    for (var i = 1; i < data.length; i++) {
      if (Number(data[i][0]) === Number(pref.dayOfWeek)) {
        targetRow = i + 1;
        break;
      }
    }
    if (targetRow !== -1) {
      sheet.getRange(targetRow, 2).setValue(pref.slot1 || '');
      sheet.getRange(targetRow, 3).setValue(pref.slot2 || '');
    } else {
      sheet.appendRow([pref.dayOfWeek, pref.slot1 || '', pref.slot2 || '']);
    }
  });
  
  return getShiftPreferences_();
}

/**
 * 特定日程（イレギュラー期間）の取得（初期データ自動生成付き）
 */
function getIrregularPeriods_() {
  var sheet = getOrCreateSheet_('特定予定', ['ID', '名称', '開始日', '終了日', '区分', '開館フラグ']);
  var data = sheet.getDataRange().getValues();
  
  // 初期モックデータ作成
  if (data.length === 1) {
    var initialPeriods = [
      ['irr_1', '中間試験 (休館)', '2026-05-25', '2026-05-28', 'exam', 'FALSE'],
      ['irr_2', '開校記念日 (休館)', '2026-06-08', '2026-06-08', 'holiday', 'FALSE']
    ];
    initialPeriods.forEach(function(row) {
      sheet.appendRow(row);
    });
    data = sheet.getDataRange().getValues();
  }
  
  var rows = data.slice(1);
  var periods = [];
  
  rows.forEach(function(row) {
    if (!row[0]) return;
    periods.push({
      id: String(row[0]),
      name: String(row[1]),
      startDate: formatDateStr_(row[2]),
      endDate: formatDateStr_(row[3]),
      type: String(row[4]),
      isOpen: String(row[5]).toUpperCase() === 'TRUE'
    });
  });
  
  return periods;
}

/**
 * 特定日程（イレギュラー期間）の追加・更新
 */
function saveIrregularPeriod_(periodJson) {
  var sheet = getOrCreateSheet_('特定予定', ['ID', '名称', '開始日', '終了日', '区分', '開館フラグ']);
  var period = JSON.parse(periodJson);
  var data = sheet.getDataRange().getValues();
  
  var targetRowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(period.id)) {
      targetRowIndex = i + 1;
      break;
    }
  }
  
  var rowData = [
    period.id,
    period.name,
    period.startDate,
    period.endDate,
    period.type,
    String(period.isOpen).toUpperCase()
  ];
  
  if (targetRowIndex !== -1) {
    sheet.getRange(targetRowIndex, 1, 1, 6).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  // 休館日（isOpen === false）が新しく追加・更新された場合、その範囲内の既存確定シフトメンバーをアトミックに強制クリアする
  if (period.isOpen === false) {
    var shiftSheet = getOrCreateSheet_('シフト', ['日付', '時間帯', 'メンバー', '削除フラグ']);
    var shiftData = shiftSheet.getDataRange().getValues();
    var todayStr = formatDateStr_(new Date());
    
    for (var i = 1; i < shiftData.length; i++) {
      var rowDate = formatDateStr_(shiftData[i][0]);
      // 今日以降で、かつ休館期間に重なるシフト
      if (rowDate >= todayStr && rowDate >= period.startDate && rowDate <= period.endDate) {
        shiftSheet.getRange(i + 1, 3).setValue('');
        shiftSheet.getRange(i + 1, 4).setValue('TRUE');
      }
    }
  }
  
  return getIrregularPeriods_();
}

/**
 * 特定日程（イレギュラー期間）の削除
 */
function deleteIrregularPeriod_(id) {
  var sheet = getOrCreateSheet_('特定予定', ['ID', '名称', '開始日', '終了日', '区分', '開館フラグ']);
  var data = sheet.getDataRange().getValues();
  
  var targetRowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      targetRowIndex = i + 1;
      break;
    }
  }
  
  if (targetRowIndex !== -1) {
    sheet.deleteRow(targetRowIndex);
  }
  
  return getIrregularPeriods_();
}

// ============================================================================
// 7. 共通内部ヘルパー関数
// ============================================================================

/**
 * 指定名のシートを取得するか、なければ新規作成する
 */
function getOrCreateSheet_(name, headers) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * YYYY-MM-DD フォーマットの文字列へ変換
 */
function formatDateStr_(dateVal) {
  if (!dateVal) return '';
  try {
    var d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  } catch (e) {
    return String(dateVal);
  }
}

/**
 * CORSエラーのないJSONレスポンスを返却
 */
function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
