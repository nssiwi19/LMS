# E16 LMS - Hệ Thống Quản Lý Đào Tạo Học Viện

Hệ thống Quản lý Học tập (LMS) và Quản lý Học sinh (SIS) cao cấp dành cho Học viện E16, tích hợp đầy đủ phân quyền và giao diện trực quan cho 7 vai trò người dùng.

---

## ⚡ Tính Năng Sắp Xếp Cột Mới (Click Column Header Sorting)
Hệ thống hỗ trợ click trực tiếp vào tiêu đề cột để sắp xếp động trên **17 bảng dữ liệu** (ở tất cả 12 file components):
* **Chỉ báo trực quan**: Trạng thái hiển thị qua ký tự `▲` (tăng dần), `▼` (giảm dần) và `↕` (có thể sắp xếp).
* **Trải nghiệm mượt mà**: Hiệu ứng hover đổi màu (`hover:text-white transition`) phong cách glassmorphism.
* **Độ tin cậy cao**: Sắp xếp chuẩn tiếng Việt có dấu (`localeCompare`), số học, ngày tháng và tự động giải quyết an toàn các đường dẫn đối tượng lồng nhau (nested paths).

---

## 👥 Phân Hệ Vai Trò
* **Admin**: Phân quyền, khóa/mở tài khoản, giám sát hệ thống.
* **Học vụ (Academic Admin)**: Quản lý năm học, học kỳ, khoa, ngành, sổ học bạ.
* **Giảng viên (Teacher)**: Soạn giáo trình, điểm danh học viên, chấm điểm bài tự luận.
* **Sinh viên (Student)**: Xem lịch học, học bài giảng, làm quiz trắc nghiệm, nộp bài tự luận, xem bảng điểm.
* **Phụ huynh (Parent)**: Giám sát tiến độ học, điểm chuyên cần, cảnh báo học thuật và học phí của con.
* **Kế toán (Finance)**: Duyệt giao dịch đóng học phí, quản lý sổ nợ học phí và tính lương giảng viên.
* **Lễ tân (Receptionist)**: Tra cứu hồ sơ sinh viên, đổi mật khẩu khẩn cấp và đăng ký nhập học nhanh.

---

## 🛠️ Hướng Dẫn Kỹ Thuật Nhanh

### 1. Cài đặt & Chạy Local
```bash
npm install
npm run dev   # Mặc định chạy tại http://localhost:3000
```

### 2. Kiểm thử & Xác thực
```bash
# Kiểm tra lỗi cú pháp/kiểu dữ liệu (TypeScript)
npm run lint  # Hoặc npm.cmd run lint trên Windows PS

# Chạy E2E test tích hợp
$env:E2E_BASE_URL="http://localhost:3000"; npm.cmd run test:e2e
```

### 3. Cấu hình Production & Deploy (Render)
Thiết lập các biến môi trường bắt buộc: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Các bước deploy:
```bash
npm ci && npm run db:migrate && npm run db:drift && npm run build && npm start
```

* **Smoke test sau deploy**: `DEPLOY_URL=https://yourdomain.com npm run smoke:deploy`
* **Quy trình rollback**: Xem hướng dẫn tại [rollback-checklist.md](file:///d:/LMS/docs/rollback-checklist.md).
