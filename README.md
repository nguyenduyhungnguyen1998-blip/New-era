# 🎮 TAM THÁI TỬ - THÁP HÀ NỘI

> Game giáo dục về bài toán Tháp Hà Nội với visualization thuật toán đệ quy

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![HTML5](https://img.shields.io/badge/HTML5-E34F26)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E)

## ✨ Tính năng chính

### 🎯 5 Chế độ chơi
1. **Play** - Chơi tự do, timer, best score
2. **Teach** - Học với gợi ý từng bước
3. **Learn** - Visualization đệ quy với call stack
4. **Challenge** - Giới hạn thời gian (3 độ khó)
5. **Sandbox** - Tùy chỉnh cột (3-6), đĩa (2-8), luật

### 🏆 Achievement System
- **39 achievements** với danh hiệu unlock
- **6 super hard achievements**
- **15 sandbox-exclusive achievements**
- **Creativity Score System** (0-999 điểm)
- **✨ NEW: Progress bars** cho achievements chưa unlock

### 🎯 Daily Challenge (NEW v1.2.0)
- **Challenge mới mỗi ngày** (seed-based random)
- **Streak tracking** với visual display
- **24h countdown** timer
- **Achievements riêng** cho daily completions

### 🎨 UI/UX
- Dark/Light mode
- 4 theme: Classic, Burger, Rescue, Neon, Dark
- Responsive mobile
- Drag & drop
- Keyboard shortcuts
- Custom audio
- **✨ NEW: Visual effects** (disk glow, trail, pole highlight)
- **✨ NEW: Statistics Dashboard** (chi tiết game stats)
- **✨ NEW: Share & Export** (URL-based replay sharing)

### 🧮 Thuật toán
- **Classic Hanoi**: Recursive O(2^n)
- **Frame-Stewart**: Multi-pole (4-6 cột)
- Xử lý tối đa 12 đĩa

## 🚀 Chạy game

```bash
# Mở file
open index.html

# Hoặc dùng server
python -m http.server 8000
# http://localhost:8000
```

**Yêu cầu:** Browser hiện đại (Chrome 90+, Firefox 88+, Safari 14+)

## 📁 Cấu trúc

```
.
├── index.html          # Main HTML
├── ap2.js             # Game logic (1977 lines)
├── stylesen1.css      # Styles
├── manifest.json      # PWA
└── assets/            # Audio files
```

## 🎮 Controls

**Mouse:**
- Click & Drag đĩa
- Undo - Hoàn tác
- Reset - Bắt đầu lại

**Keyboard (Learn Mode):**
- `←/→` - Previous/Next
- `Space` - Play/Pause
- `Home/End` - Start/End
- `C` - Collapse
- `X` - Close

## 🏅 Achievements

**Dễ:**
- 🔰 Tân Binh - 3 đĩa
- 🎯 Tối Ưu - Số bước tối thiểu
- 🎓 Người Thầy - Teach 4+ đĩa

**Trung bình:**
- 🏗️ Kiến Trúc Sư - 8 đĩa
- ⚡ Tốc Độ - Challenge Medium
- 🧠 Học Giả - Learn mode

**Siêu khó:**
- 💪 Bất Bại - 10+ đĩa optimal no undo
- 💎 Hoàn Mỹ - 12 đĩa optimal
- ⚡️ Tốc Độ - 8+ đĩa trong 2 phút
- 🏛️ Sandbox Architect - 7+ cột (Sandbox)
- 🌟 Thập Toàn - 10+ đĩa 4 cột (Sandbox)
- 🌌 Vũ Trụ - 8+ đĩa 6 cột (Sandbox)

**Sandbox đặc biệt (12 achievements):**
- 🔗 Bậc Thầy Liền Kề - Adjacent rules 5+ đĩa
- 🔄 Hiền Giả Tuần Hoàn - Cyclic rules 5+ đĩa
- 🌊 Thiên Tài Phân Tán - Spread start 6+ đĩa
- ↩️ Kiến Trúc Đảo Ngược - Last pole start 6+ đĩa
- ⚡ Người Tối Giản - 3 cột, 8 đĩa special rules <5min
- 🎭 Chúa Tể Phức Tạp - 6 cột, 8 đĩa adjacent
- 💫 Combo Tối Thượng - 6 cột, 8 đĩa cyclic+spread
- 🎨 Linh Hồn Sáng Tạo - 10 configs hoàn thành
- ⚙️ Thần Hiệu Suất - Adjacent 5+ đĩa <300 bước
- 🏃 Tốc Hành Sandbox - 7 đĩa <3 phút
- 🧪 Nhà Khoa Học Điên - 6 cột, 8 đĩa last_pole
- 🌟 Huyền Thoại Sandbox - Unlock 8+ sandbox achievements

## 💻 Technical

### Algorithms
```
Classic: T(n) = 2^n - 1
Frame-Stewart: T(k,n) = min{2·T(k,i) + T(k-1,n-i)}
```

### Performance
- 60 FPS animation
- LocalStorage persistence
- Mobile-optimized touch

### Browser Support
| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 90+     | ✅ |
| Firefox | 88+     | ✅ |
| Safari  | 14+     | ✅ |
| Edge    | 90+     | ✅ |

## 🐛 Debug

Open console và dùng:
```javascript
HanoiDebug.state()      // Game state
HanoiDebug.errors()     // Error logs
HanoiDebug.info()       // Build info
HanoiDebug.resetAch()   // Reset achievements
```

## 📊 Stats

- **Total code:** ~3400 lines (+900 enhancements)
- **Achievements:** 39 (12 Sandbox-exclusive)
- **Game modes:** 5 + Daily Challenge
- **Max disks:** 12
- **Theme variants:** 5
- **Creativity Score:** 0-999 điểm cho Sandbox
- **NEW Features:** 5 major enhancements (v1.2.0)

## 📜 License

MIT License - Free for education

## 👨‍💻 Author

6 Team 10A1 © 2025

---

**v1.0.0** | Build: 2025-11-02 | Made with ❤️
