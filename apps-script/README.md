# Instruksi Setup Google Apps Script

## Langkah-langkah Setup:

### 1. Persiapan Google Spreadsheet
- Buka Google Sheets yang akan digunakan
- Pastikan struktur kolom sesuai dengan spesifikasi:
  - Baris 16: Header (A=no, B=task, C=platform, D=format, E=assigned to, F=due date, G=date left, H=in progress, I=reference, J=result, K=notes)
  - Baris 17+: Data dimulai dari sini

### 2. Setup Google Apps Script
1. Di Google Sheets, klik **Extensions** > **Apps Script**
2. Ganti kode default dengan kode dari file `Code.gs`
3. Ganti `YOUR_SPREADSHEET_ID_HERE` dengan ID spreadsheet Anda
4. Ganti `SHEET_NAME` jika nama sheet berbeda dari "Sheet1"

### 3. Deploy sebagai Web App
1. Klik **Deploy** > **New deployment**
2. Pilih **Type**: Web app
3. **Description**: Task Management API
4. **Execute as**: Me
5. **Who has access**: Anyone with the link
6. Klik **Deploy**
7. **Copy URL Web App** yang dihasilkan

### 4. Setup Environment Variables
Buat file `.env.local` di root project:
```
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 5. Testing
- Test endpoint dengan Postman atau browser:
  - GET: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getTasks`
  - POST: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec` dengan body JSON

## Catatan Penting:
- Pastikan spreadsheet memiliki data di baris 17+ untuk testing
- Kolom G (date left) akan dihitung otomatis berdasarkan due date
- Nomor (kolom A) akan di-generate otomatis saat membuat task baru
- Semua operasi CRUD sudah di-handle dengan proper error handling
