/**
 * Google Apps Script untuk Task Management App
 * 
 * INSTRUKSI SETUP:
 * 1. Buka Google Sheets yang akan digunakan
 * 2. Pergi ke Extensions > Apps Script
 * 3. Ganti kode default dengan kode ini
 * 4. Ganti SPREADSHEET_ID dengan ID spreadsheet Anda
 * 5. Deploy sebagai Web App dengan akses "Anyone with the link"
 * 6. Copy URL Web App ke NEXT_PUBLIC_APPS_SCRIPT_URL di .env.local
 */

// GANTI DENGAN ID SPREADSHEET ANDA
const SPREADSHEET_ID = '1HfFmOx8iGWvA_XEWvz8RSBMxxbOZKCA459fOkD1JT_E';
const SHEET_NAME = 'Content Planner'; // Ganti jika nama sheet berbeda

// Konfigurasi kolom (sesuai dengan struktur spreadsheet)
const COLUMNS = {
  NO: 0,           // A
  TASK: 1,         // B
  PLATFORM: 2,     // C
  FORMAT: 3,       // D
  ASSIGNED_TO: 4,  // E
  DUE_DATE: 5,     // F
  DATE_LEFT: 6,    // G
  IN_PROGRESS: 7,  // H
  REFERENCE: 8,    // I
  RESULT: 9,       // J
  NOTES: 10        // K
};

const DATA_START_ROW = 17; // Baris mulai data
const HEADER_ROW = 16;     // Baris header

/**
 * Handler untuk GET requests
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getTasks';
    const callback = e.parameter.callback; // JSONP callback support

    let result;
    switch (action) {
      case 'getTasks':
        result = getTasksData();
        break;
      case 'getTask':
        result = getTaskData(parseInt(e.parameter.id, 10));
        break;
      case 'createTask':
        result = createTaskData(JSON.parse(e.parameter.data || '{}'));
        break;
      case 'updateTask':
        result = updateTaskData(parseInt(e.parameter.id, 10), JSON.parse(e.parameter.data || '{}'));
        break;
      case 'deleteTask':
        result = deleteTaskData(parseInt(e.parameter.id, 10));
        break;
      default:
        result = { error: 'Invalid action' };
    }

    return buildResponse(result, callback);
  } catch (error) {
    return buildResponse({ error: error.message }, e && e.parameter && e.parameter.callback);
  }
}

/**
 * Handler untuk POST requests
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case 'createTask':
        return createTask(data.data);
      case 'updateTask':
        return updateTask(data.id, data.data);
      case 'deleteTask':
        return deleteTask(data.id);
      default:
        return createResponse({ error: 'Invalid action' }, 400);
    }
  } catch (error) {
    return createResponse({ error: error.message }, 500);
  }
}

// =====================
// JSON/JSONP RESPONSES
// =====================
function buildResponse(data, callback) {
  const payload = JSON.stringify(data);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + payload + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Ambil semua tasks (kolom A-H)
 */
function getTasks() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < DATA_START_ROW) {
    return createResponse([]);
  }
  
  const range = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 8);
  const values = range.getValues();
  
  const tasks = values.map((row, index) => ({
    no: row[COLUMNS.NO] || DATA_START_ROW + index,
    task: row[COLUMNS.TASK] || '',
    platform: row[COLUMNS.PLATFORM] || '',
    format: row[COLUMNS.FORMAT] || '',
    assignedTo: row[COLUMNS.ASSIGNED_TO] || '',
    dueDate: row[COLUMNS.DUE_DATE] ? formatDate(row[COLUMNS.DUE_DATE]) : '',
    dateLeft: row[COLUMNS.DATE_LEFT] || 0,
    inProgress: row[COLUMNS.IN_PROGRESS] || ''
  }));
  
  return createResponse(tasks);
}

// Versi yang mengembalikan data mentah (untuk JSONP)
function getTasksData() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) {
    return [];
  }
  const range = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 8);
  const values = range.getValues();
  return values.map((row, index) => ({
    no: row[COLUMNS.NO] || DATA_START_ROW + index,
    task: row[COLUMNS.TASK] || '',
    platform: row[COLUMNS.PLATFORM] || '',
    format: row[COLUMNS.FORMAT] || '',
    assignedTo: row[COLUMNS.ASSIGNED_TO] || '',
    dueDate: row[COLUMNS.DUE_DATE] ? formatDate(row[COLUMNS.DUE_DATE]) : '',
    dateLeft: row[COLUMNS.DATE_LEFT] || 0,
    inProgress: row[COLUMNS.IN_PROGRESS] || ''
  }));
}

/**
 * Ambil detail task lengkap berdasarkan ID
 */
function getTask(id) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < DATA_START_ROW) {
    return createResponse({ error: 'Task not found' }, 404);
  }
  
  // Cari baris dengan nomor yang sesuai
  for (let row = DATA_START_ROW; row <= lastRow; row++) {
    const noValue = sheet.getRange(row, COLUMNS.NO + 1).getValue();
    if (noValue == id) {
      const range = sheet.getRange(row, 1, 1, 11);
      const values = range.getValues()[0];
      
      const task = {
        no: values[COLUMNS.NO] || id,
        task: values[COLUMNS.TASK] || '',
        platform: values[COLUMNS.PLATFORM] || '',
        format: values[COLUMNS.FORMAT] || '',
        assignedTo: values[COLUMNS.ASSIGNED_TO] || '',
        dueDate: values[COLUMNS.DUE_DATE] ? formatDate(values[COLUMNS.DUE_DATE]) : '',
        dateLeft: values[COLUMNS.DATE_LEFT] || 0,
        inProgress: values[COLUMNS.IN_PROGRESS] || '',
        reference: values[COLUMNS.REFERENCE] || '',
        result: values[COLUMNS.RESULT] || '',
        notes: values[COLUMNS.NOTES] || ''
      };
      
      return createResponse(task);
    }
  }
  
  return createResponse({ error: 'Task not found' }, 404);
}

// Versi yang mengembalikan data mentah (untuk JSONP)
function getTaskData(id) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) {
    return { error: 'Task not found' };
  }
  for (let row = DATA_START_ROW; row <= lastRow; row++) {
    const noValue = sheet.getRange(row, COLUMNS.NO + 1).getValue();
    if (noValue == id) {
      const values = sheet.getRange(row, 1, 1, 11).getValues()[0];
      return {
        no: values[COLUMNS.NO] || id,
        task: values[COLUMNS.TASK] || '',
        platform: values[COLUMNS.PLATFORM] || '',
        format: values[COLUMNS.FORMAT] || '',
        assignedTo: values[COLUMNS.ASSIGNED_TO] || '',
        dueDate: values[COLUMNS.DUE_DATE] ? formatDate(values[COLUMNS.DUE_DATE]) : '',
        dateLeft: values[COLUMNS.DATE_LEFT] || 0,
        inProgress: values[COLUMNS.IN_PROGRESS] || '',
        reference: values[COLUMNS.REFERENCE] || '',
        result: values[COLUMNS.RESULT] || '',
        notes: values[COLUMNS.NOTES] || ''
      };
    }
  }
  return { error: 'Task not found' };
}

/**
 * Buat task baru
 */
function createTask(taskData) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  // Tentukan baris terakhir yang memiliki nomor (kolom A) dan lanjutkan dari sana.
  let lastNumber = 0;
  let lastNumberRow = DATA_START_ROW - 1;
  if (lastRow >= DATA_START_ROW) {
    const colAValues = sheet.getRange(DATA_START_ROW, COLUMNS.NO + 1, lastRow - DATA_START_ROW + 1, 1).getValues();
    for (let i = colAValues.length - 1; i >= 0; i--) {
      const n = Number(colAValues[i][0]);
      if (!isNaN(n) && n > 0) { lastNumber = n; lastNumberRow = DATA_START_ROW + i; break; }
    }
  }
  const writeRow = Math.max(DATA_START_ROW, lastNumberRow + 1);
  
  // Generate nomor otomatis
  const newNo = lastNumber > 0 ? lastNumber + 1 : 1;
  
  // Set due date from string (avoid timezone shift by forcing midnight)
  const dueDate = new Date((taskData.dueDate || '') + 'T00:00:00');
  
  // Siapkan data untuk dimasukkan
  const rowData = [
    newNo,                    // A - no
    taskData.task,           // B - task
    taskData.platform,       // C - platform
    taskData.format,         // D - format
    taskData.assignedTo,     // E - assigned to
    dueDate,                 // F - due date
    '',                      // G - date left (akan diisi formula)
    taskData.inProgress,     // H - in progress
    taskData.reference || '', // I - reference
    taskData.result || '',   // J - result
    taskData.notes || ''     // K - notes
  ];
  
  // Masukkan data ke spreadsheet
  sheet.getRange(writeRow, 1, 1, 11).setValues([rowData]);
  // Set number format untuk tanggal agar konsisten
  sheet.getRange(writeRow, COLUMNS.DUE_DATE + 1).setNumberFormat('yyyy-mm-dd');
  // Isi formula date left = F{row} - TODAY()
  sheet.getRange(writeRow, COLUMNS.DATE_LEFT + 1).setFormula(`=F${writeRow}-TODAY()`);
  
  // Kembalikan data task yang baru dibuat
  const newTask = {
    no: newNo,
    task: taskData.task,
    platform: taskData.platform,
    format: taskData.format,
    assignedTo: taskData.assignedTo,
    dueDate: formatDate(dueDate),
    dateLeft: sheet.getRange(writeRow, COLUMNS.DATE_LEFT + 1).getValue(),
    inProgress: taskData.inProgress,
    reference: taskData.reference || '',
    result: taskData.result || '',
    notes: taskData.notes || ''
  };
  
  return createResponse(newTask);
}

// Versi yang mengembalikan data mentah (untuk JSONP)
function createTaskData(taskData) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const newRow = lastRow + 1;
  const newNo = lastRow >= DATA_START_ROW ? sheet.getRange(lastRow, COLUMNS.NO + 1).getValue() + 1 : 1;
  const dueDate = new Date((taskData.dueDate || '') + 'T00:00:00');
  const rowData = [
    newNo,
    taskData.task,
    taskData.platform,
    taskData.format,
    taskData.assignedTo,
    dueDate,
    '',
    taskData.inProgress,
    taskData.reference || '',
    taskData.result || '',
    taskData.notes || ''
  ];
  sheet.getRange(newRow, 1, 1, 11).setValues([rowData]);
  sheet.getRange(newRow, COLUMNS.DUE_DATE + 1).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(newRow, COLUMNS.DATE_LEFT + 1).setFormula(`=F${newRow}-TODAY()`);
  return {
    no: newNo,
    task: taskData.task,
    platform: taskData.platform,
    format: taskData.format,
    assignedTo: taskData.assignedTo,
    dueDate: formatDate(dueDate),
    dateLeft: sheet.getRange(newRow, COLUMNS.DATE_LEFT + 1).getValue(),
    inProgress: taskData.inProgress,
    reference: taskData.reference || '',
    result: taskData.result || '',
    notes: taskData.notes || ''
  };
}

/**
 * Update task berdasarkan ID
 */
function updateTask(id, taskData) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  
  // Cari baris dengan nomor yang sesuai
  for (let row = DATA_START_ROW; row <= lastRow; row++) {
    const noValue = sheet.getRange(row, COLUMNS.NO + 1).getValue();
    if (noValue == id) {
      // Update data yang ada
      if (taskData.task !== undefined) {
        sheet.getRange(row, COLUMNS.TASK + 1).setValue(taskData.task);
      }
      if (taskData.platform !== undefined) {
        sheet.getRange(row, COLUMNS.PLATFORM + 1).setValue(taskData.platform);
      }
      if (taskData.format !== undefined) {
        sheet.getRange(row, COLUMNS.FORMAT + 1).setValue(taskData.format);
      }
      if (taskData.assignedTo !== undefined) {
        sheet.getRange(row, COLUMNS.ASSIGNED_TO + 1).setValue(taskData.assignedTo);
      }
      if (taskData.dueDate !== undefined) {
        const dueDate = new Date((taskData.dueDate || '') + 'T00:00:00');
        sheet.getRange(row, COLUMNS.DUE_DATE + 1).setValue(dueDate).setNumberFormat('yyyy-mm-dd');
        // Pastikan formula tetap ada
        sheet.getRange(row, COLUMNS.DATE_LEFT + 1).setFormula(`=F${row}-TODAY()`);
      }
      if (taskData.inProgress !== undefined) {
        sheet.getRange(row, COLUMNS.IN_PROGRESS + 1).setValue(taskData.inProgress);
      }
      if (taskData.reference !== undefined) {
        sheet.getRange(row, COLUMNS.REFERENCE + 1).setValue(taskData.reference);
      }
      if (taskData.result !== undefined) {
        sheet.getRange(row, COLUMNS.RESULT + 1).setValue(taskData.result);
      }
      if (taskData.notes !== undefined) {
        sheet.getRange(row, COLUMNS.NOTES + 1).setValue(taskData.notes);
      }
      
      // Ambil data yang sudah diupdate
      return getTask(id);
    }
  }
  
  return createResponse({ error: 'Task not found' }, 404);
}

// Versi yang mengembalikan data mentah (untuk JSONP)
function updateTaskData(id, taskData) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  for (let row = DATA_START_ROW; row <= lastRow; row++) {
    const noValue = sheet.getRange(row, COLUMNS.NO + 1).getValue();
    if (noValue == id) {
      if (taskData.task !== undefined) sheet.getRange(row, COLUMNS.TASK + 1).setValue(taskData.task);
      if (taskData.platform !== undefined) sheet.getRange(row, COLUMNS.PLATFORM + 1).setValue(taskData.platform);
      if (taskData.format !== undefined) sheet.getRange(row, COLUMNS.FORMAT + 1).setValue(taskData.format);
      if (taskData.assignedTo !== undefined) sheet.getRange(row, COLUMNS.ASSIGNED_TO + 1).setValue(taskData.assignedTo);
      if (taskData.dueDate !== undefined) {
        const dueDate = new Date((taskData.dueDate || '') + 'T00:00:00');
        sheet.getRange(row, COLUMNS.DUE_DATE + 1).setValue(dueDate).setNumberFormat('yyyy-mm-dd');
        sheet.getRange(row, COLUMNS.DATE_LEFT + 1).setFormula(`=F${row}-TODAY()`);
      }
      if (taskData.inProgress !== undefined) sheet.getRange(row, COLUMNS.IN_PROGRESS + 1).setValue(taskData.inProgress);
      if (taskData.reference !== undefined) sheet.getRange(row, COLUMNS.REFERENCE + 1).setValue(taskData.reference);
      if (taskData.result !== undefined) sheet.getRange(row, COLUMNS.RESULT + 1).setValue(taskData.result);
      if (taskData.notes !== undefined) sheet.getRange(row, COLUMNS.NOTES + 1).setValue(taskData.notes);
      return getTaskData(id);
    }
  }
  return { error: 'Task not found' };
}

/**
 * Hapus task berdasarkan ID
 */
function deleteTask(id) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  
  // Cari baris dengan nomor yang sesuai
  for (let row = DATA_START_ROW; row <= lastRow; row++) {
    const noValue = sheet.getRange(row, COLUMNS.NO + 1).getValue();
    if (noValue == id) {
      // Clear baris (hapus isi tapi biarkan baris kosong)
      const range = sheet.getRange(row, 1, 1, 11); // A sampai K
      range.clearContent();
      return createResponse({ message: 'Task deleted successfully' });
    }
  }
  
  return createResponse({ error: 'Task not found' }, 404);
}

// Versi yang mengembalikan data mentah (untuk JSONP)
function deleteTaskData(id) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  for (let row = DATA_START_ROW; row <= lastRow; row++) {
    const noValue = sheet.getRange(row, COLUMNS.NO + 1).getValue();
    if (noValue == id) {
      // Clear baris (hapus isi tapi biarkan baris kosong)
      const range = sheet.getRange(row, 1, 1, 11); // A sampai K
      range.clearContent();
      return { message: 'Task deleted successfully' };
    }
  }
  return { error: 'Task not found' };
}

/**
 * Helper function untuk mendapatkan sheet
 */
function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(SHEET_NAME);
}

/**
 * Helper function untuk format tanggal
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // Format YYYY-MM-DD
}

/**
 * Helper function untuk membuat response JSON
 */
function createResponse(data, statusCode = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
