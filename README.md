# Task Management App - HTML Version

Aplikasi web sederhana untuk mengelola task yang terhubung langsung dengan Google Spreadsheet melalui Google Apps Script WebApp.

## 🚀 Fitur

- **Dashboard Interaktif**: Tampilan tabel responsif dengan animasi hover
- **CRUD Operations**: Create, Read, Update, Delete tasks
- **Modal Detail**: Pop-up detail task dengan form editable
- **Form Input**: Form untuk menambah task baru dengan validasi
- **Real-time Updates**: Data sinkron dengan Google Spreadsheet
- **Mobile Responsive**: Optimized untuk desktop dan mobile
- **Smooth Animations**: CSS animations dan transitions
- **Toast Notifications**: Notifikasi untuk feedback user

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Styling**: Custom CSS dengan responsive design
- **Animations**: CSS animations dan transitions
- **Icons**: Font Awesome
- **Backend**: Google Apps Script
- **Database**: Google Spreadsheet
- **Deployment**: GitHub Pages

## 📋 Prerequisites

- Google Account dengan akses ke Google Sheets
- Google Spreadsheet dengan struktur yang sesuai
- GitHub Account untuk deployment

## 🔧 Setup Instructions

### 1. Clone Repository

```bash
git clone <repository-url>
cd task-management-app
```

### 2. Setup Google Spreadsheet

1. Buat Google Spreadsheet baru atau gunakan yang sudah ada
2. Pastikan struktur kolom sesuai dengan spesifikasi:
   - **Baris 16**: Header (A=no, B=task, C=platform, D=format, E=assigned to, F=due date, G=date left, H=in progress, I=reference, J=result, K=notes)
   - **Baris 17+**: Data dimulai dari sini

### 3. Setup Google Apps Script

1. Di Google Sheets, klik **Extensions** > **Apps Script**
2. Ganti kode default dengan kode dari file `apps-script/Code.gs`
3. Ganti `YOUR_SPREADSHEET_ID_HERE` dengan ID spreadsheet Anda
4. Ganti `SHEET_NAME` jika nama sheet berbeda dari "Sheet1"

### 4. Deploy Google Apps Script

1. Klik **Deploy** > **New deployment**
2. Pilih **Type**: Web app
3. **Description**: Task Management API
4. **Execute as**: Me
5. **Who has access**: Anyone with the link
6. Klik **Deploy**
7. **Copy URL Web App** yang dihasilkan

### 5. Update Configuration

Edit file `script.js` dan ganti URL di bagian CONFIG:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://script.google.com/macros/s/YOUR_ACTUAL_SCRIPT_ID/exec',
    DEFAULT_DATE: new Date().toISOString().split('T')[0]
};
```

### 6. Deploy ke GitHub Pages

1. Push code ke GitHub repository
2. Go to repository Settings
3. Scroll down ke "Pages" section
4. Select source: "Deploy from a branch"
5. Select branch: "main" (atau "master")
6. Select folder: "/ (root)"
7. Click "Save"
8. Wait for deployment (biasanya 1-2 menit)
9. Access aplikasi di: `https://yourusername.github.io/repository-name`

## 📱 Usage

### Dashboard
- Lihat semua task dalam tabel responsif
- Klik baris untuk melihat detail task
- Statistik task (total, on time, deadline dekat, overdue)

### Menambah Task
- Klik tombol "Tambah Task"
- Isi form dengan data yang diperlukan
- Field wajib: task, platform, format, assigned to, due date, progress

### Edit Task
- Klik task di tabel untuk buka modal detail
- Klik tombol "Edit" untuk mode editing
- Simpan perubahan atau batalkan

### Hapus Task
- Buka modal detail task
- Klik tombol "Hapus"
- Konfirmasi penghapusan

## 🎨 Customization

### Styling
- Edit `styles.css` untuk mengubah tema dan colors
- Modifikasi CSS variables untuk konsistensi
- Tambah custom animations di bagian animations

### Data Options
- Edit dropdown options di HTML form
- Tambah validasi custom di JavaScript

### API Endpoints
- Semua endpoint sudah di-handle di `apps-script/Code.gs`
- Modifikasi sesuai kebutuhan di `script.js`

## 🚀 Deployment

### GitHub Pages
1. Push code ke GitHub
2. Enable GitHub Pages di repository settings
3. Select source branch
4. Access via GitHub Pages URL

### Custom Domain (Optional)
1. Add CNAME file dengan custom domain
2. Update DNS settings di domain provider
3. Wait for propagation

## 🔍 API Endpoints

- `GET ?action=getTasks` - List all tasks
- `GET ?action=getTask&id={id}` - Get task detail
- `POST` dengan `action=createTask` - Create new task
- `POST` dengan `action=updateTask` - Update task
- `POST` dengan `action=deleteTask` - Delete task

## 🐛 Troubleshooting

### Data tidak muncul
- Pastikan spreadsheet memiliki data di baris 17+
- Check URL Apps Script di `script.js`
- Pastikan Web App sudah deployed dengan permission yang benar

### Error saat CRUD operations
- Check browser console untuk error details
- Pastikan struktur spreadsheet sesuai spesifikasi
- Verify Apps Script code sudah benar

### GitHub Pages tidak update
- Check repository settings
- Verify branch dan folder selection
- Wait for deployment (bisa sampai 10 menit)

### Mobile responsiveness issues
- Test di berbagai ukuran screen
- Check CSS media queries
- Verify viewport meta tag

## 📊 Performance

### Optimization
- Minified CSS dan JavaScript (optional)
- Optimized images
- Efficient DOM manipulation
- Lazy loading untuk large datasets

### Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🔒 Security

### Apps Script Security
- Web App hanya accessible via HTTPS
- Input validation di semua endpoints
- Rate limiting untuk prevent abuse

### Frontend Security
- Input sanitization di forms
- XSS protection dengan proper escaping
- CSRF protection (jika diperlukan)

## 📞 Support

Jika ada pertanyaan atau issues:
1. Check browser console untuk errors
2. Verify Apps Script execution logs
3. Test dengan sample data
4. Create issue di repository

## 📄 License

MIT License - bebas digunakan untuk project apapun.

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

**Aplikasi siap digunakan di GitHub Pages!** 🎉