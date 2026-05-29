# E16 LMS - Hệ Thống Quản Lý Đào Tạo Học Viện Cao Cấp

Hệ thống Quản lý Học tập (LMS) và Quản lý Học sinh (SIS) cao cấp dành cho Học viện E16. Hệ thống được tích hợp đầy đủ các phân hệ bảo mật, phân quyền nghiêm ngặt và giao diện người dùng trực quan, tối ưu trải nghiệm học tập và giảng dạy trực tuyến chuyên nghiệp.

---

## 👥 Phân Hệ Vai Trò & Chức Năng Chi Tiết

Hệ thống E16 LMS được xây dựng dựa trên cơ chế phân quyền dựa trên vai trò (RBAC - Role-Based Access Control) chặt chẽ với 8 phân hệ người dùng chính:

### 1. Ban Quản Trị (Admin / Super Admin)
* **Quản lý Tài khoản**: Khởi tạo tài khoản đơn lẻ hoặc nhập dữ liệu hàng loạt (Bulk Import) thông qua tập tin văn bản/CSV. Cho phép cập nhật thông tin cá nhân và thay đổi vai trò (role) người dùng.
* **Tự động Đồng bộ Hồ sơ**: Khi chuyển đổi vai trò sang Học viên, hệ thống tự động khởi tạo hồ sơ học thuật (`student_profiles`) tương ứng.
* **Bảo mật Khẩn cấp**: Khóa hoặc mở khóa tài khoản ngay lập tức khi phát hiện hành vi truy cập đáng ngờ hoặc vi phạm quy định.
* **Giám sát Hoạt động**: Truy cập Sổ nhật ký hệ thống (`Audit Logs`) toàn diện để theo dõi mọi hoạt động nhạy cảm của các vai trò khác nhau.

### 2. Phòng Học Vụ (Academic Admin)
* **Quản lý Cơ sở Học thuật**: Thiết lập và cập nhật danh mục Năm học (`academic_years`), Học kỳ (`semesters`), Khoa chuyên môn (`departments`), và Ngành học (`programs`).
* **Xây dựng Khung Đào tạo**: Thiết kế chương trình đào tạo chuẩn (`Curriculums`), phân loại các môn học bắt buộc (`Required`) hoặc tự chọn (`Elective`) cùng số lượng tín chỉ yêu cầu.
* **Lập lịch Lớp Học phần**: Khởi tạo các lớp học phần (`Course Sections`), phân công giảng viên trực tiếp và thiết lập thời khóa biểu.
* **Học bạ & Sổ ghi danh**: Quản lý hồ sơ học tập chi tiết của toàn bộ sinh viên. Phát hành Cảnh báo Học thuật (`Academic Warnings`) khi phát hiện sinh viên sa sút kết quả (GPA < 2.0) hoặc vi phạm chuyên cần.

### 3. Cố Vấn Học Tập (Academic Advisor)
* **Giám sát Tiến trình & At-Risk**: Theo dõi danh sách học viên được phân công. Nhận diện sớm sinh viên có nguy cơ học thuật sa sút (At-Risk) dựa trên tiêu chí GPA thấp (< 2.0) hoặc có cảnh báo chuyên cần chưa xử lý.
* **Xử lý Cảnh báo Học tập**: Rà soát các cảnh báo học thuật do giảng viên hoặc học vụ gửi lên, thực hiện tư vấn trực tiếp và đánh dấu giải quyết cảnh báo sau khi hỗ trợ sinh viên thành công.
* **Bản đồ Học phần & Tín chỉ**: Tra cứu chi tiết tiến trình tích lũy tín chỉ của sinh viên so với khung đào tạo chuẩn của ngành học.
* **Nhật ký Tư vấn**: Ghi chép nhật ký tư vấn chi tiết (Học thuật, Kỷ luật, Tài chính), hỗ trợ tùy chọn chia sẻ tức thì thông tin này đến tài khoản của Phụ huynh để cùng phối hợp.
* **Lập Kế hoạch Đăng ký Môn học**: Biên soạn và phê duyệt lộ trình đăng ký lớp học đề xuất cho học kỳ tiếp theo của sinh viên nhằm tối ưu kết quả GPA.

### 4. Giảng Viên (Teacher)
* **Quản lý Lớp học phần**: Theo dõi danh sách sinh viên ghi danh trong các lớp học được phân công giảng dạy.
* **Biên soạn Giáo án số**: Cập nhật giáo trình bài học đa phương tiện (video/tài liệu), ngân hàng câu hỏi trắc nghiệm (`Quizzes`) tự động chấm điểm, và bài tập tự luận (`Assignments`).
* **Điểm danh Chuyên cần**: Điểm danh chuyên cần chi tiết hàng ngày cho sinh viên, hỗ trợ tự động ghi nhận tỷ lệ nghỉ học/đi muộn.
* **Chấm điểm & Phản hồi**: Rà soát các bài nộp tự luận của sinh viên, cho điểm số trực tiếp, viết lời nhận xét học thuật và đồng bộ dữ liệu vào Sổ điểm tổng hợp (`Gradebook`).
* **Cảnh báo Học tập**: Gửi yêu cầu hỗ trợ hoặc cảnh báo học thuật khẩn cấp lên Cố vấn học tập khi sinh viên vắng quá số buổi quy định.

### 5. Sinh Viên (Student)
* **Lộ trình & Thời khóa biểu**: Tra cứu thời khóa biểu học tập hàng ngày, lịch thi và theo dõi tiến độ hoàn thành các chương trình đào tạo cá nhân.
* **Học tập & Kiểm tra**: Xem video bài giảng, thực hiện các bài thi trắc nghiệm tính giờ trực tuyến và nhận kết quả điểm số/phản hồi ngay lập tức.
* **Nộp Bài tập Tự luận**: Tải lên bài làm tự luận trực tiếp lên hệ thống trước khi hết hạn chót.
* **Quản lý Công nợ Học phí**: Theo dõi chi tiết hóa đơn học phí của từng học kỳ, tra cứu lịch sử đóng tiền và thực hiện thanh toán trực tuyến nhanh chóng.
* **Học bạ & Lộ trình đề xuất**: Theo dõi điểm số GPA (Hệ 4.0), xem các nhận xét và lộ trình đăng ký lớp học đề xuất được Cố vấn học tập phê duyệt.

### 6. Phòng Tài Chính (Finance)
* **Quản lý Danh mục Biểu phí**: Thiết lập định mức học phí cho các môn học và cấu hình các khoản công nợ phải thu (`Tuition Fees`) của sinh viên theo từng học kỳ.
* **Đối soát & Phê duyệt**: Kiểm tra và phê duyệt thủ công các giao dịch thanh toán học phí từ sinh viên, xuất hóa đơn điện tử chính thức.
* **Kiểm soát Nợ quá hạn**: Lọc danh sách sinh viên nợ phí quá hạn để đề xuất tạm dừng đăng ký môn học hoặc đình chỉ thi học kỳ.
* **Tính toán Lương Giảng viên**: Tính toán bảng lương giảng viên tự động dựa trên số tiết giảng dạy thực tế, quy mô sĩ số lớp học và hoa hồng chiêu sinh. Thực hiện phê duyệt và phát lương định kỳ.

### 7. Quầy Tiếp Tân (Receptionist)
* **Tra cứu Hồ sơ nhanh**: Tiếp nhận yêu cầu hỗ trợ trực tiếp từ khách truy cập và sinh viên, tra cứu thông tin lý lịch và học bạ cơ bản.
* **Hỗ trợ Tài khoản**: Thực hiện đổi mật khẩu khẩn cấp (Reset Password) hoặc mở khóa tài khoản tức thì cho sinh viên khi được yêu cầu trực tiếp.
* **Tiếp nhận Tuyển sinh**: Nhập thông tin đăng ký nhập học của tân sinh viên, tạo tài khoản ban đầu và hỗ trợ phân lớp tạm thời.

### 8. Phụ Huynh (Parent)
* **Giám sát Trực tuyến**: Đăng nhập tài khoản liên kết để theo dõi sát sao quá trình học tập của con em mình.
* **Theo dõi Kết quả**: Cập nhật bảng điểm thành phần, điểm thi cuối kỳ, và biểu đồ tiến trình hoàn thành tín chỉ tốt nghiệp của con.
* **Kiểm tra Chuyên cần**: Theo dõi số buổi đi học, nghỉ học có phép/không phép và trạng thái đi muộn của con em trong từng môn.
* **Đóng học phí tiện lợi**: Kiểm tra trạng thái hóa đơn học phí của con em, tra cứu lịch sử đóng tiền và phối hợp đóng học phí đúng thời hạn.
* **Nhận Cảnh báo Học thuật**: Đọc các thông báo cảnh báo chuyên cần hoặc các nhật ký tư vấn, hướng dẫn lộ trình do Cố vấn học tập chia sẻ.

---

## 🛠️ Hướng Dẫn Kỹ Thuật Chi Tiết (Technical Guidelines)

Lập trình viên và quản trị viên hệ thống cần tuân thủ nghiêm ngặt các chỉ dẫn kỹ thuật dưới đây để cài đặt, vận hành và phát triển dự án.

### 1. Cấu Trúc Mã Nguồn Quan Trọng
* `src/components/`: Chứa các giao diện Panel và Manager riêng biệt cho 8 vai trò người dùng.
* `src/store/`: Quản lý trạng thái Client-side (`AppStore`) và cơ chế đồng bộ dữ liệu.
* `src/server/`: Chứa toàn bộ logic backend bao gồm repositories kết nối PostgreSQL, cache Redis, bộ xác thực JWT, và lập lịch Scheduler tự động.
* `scripts/`: Chứa các kịch bản kiểm thử E2E, Migration cấu trúc database, và Seeding dữ liệu mẫu.
* `server.ts`: Điểm khởi chạy máy chủ Express kết hợp proxy máy chủ phát triển Vite.

### 2. Thiết Lập Môi Trường Cục Bộ (Local Setup)

#### Bước 1: Yêu cầu cài đặt sẵn
* Cài đặt **Node.js** phiên bản v18 trở lên.
* Cài đặt cơ sở dữ liệu **PostgreSQL** và dịch vụ cache **Redis** (khuyên dùng dịch vụ Supabase và Upstash hoặc cài đặt cục bộ).

#### Bước 2: Cài đặt thư viện
```bash
npm install
```

#### Bước 3: Cấu hình biến môi trường
Tạo tệp tin `.env` ở thư mục gốc của dự án dựa trên file `.env.example` và thiết lập các tham số:
```env
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/e16_lms_db
JWT_SECRET=thiet_lap_chuoi_bao_mat_jwt_cuc_ky_dai_va_kho_giai_ma
DISABLE_RATE_LIMIT=true
```
*Lưu ý: `DATABASE_URL` là bắt buộc để thực hiện các thao tác di chuyển dữ liệu cấu trúc bảng.*

#### Bước 4: Khởi tạo và Đồng bộ Cơ sở Dữ liệu
* **Áp dụng các thay đổi cấu trúc bảng (Migrations)**:
  ```bash
  npm run db:migrate
  ```
* **Nạp cơ sở dữ liệu giả lập ban đầu (Seeding)**:
  ```bash
  npm run db:seed
  ```
  *Lệnh này sẽ khởi tạo đầy đủ các tài khoản mẫu cho cả 8 vai trò (Admin, Học vụ, Cố vấn, Giảng viên, Sinh viên, Kế toán, Lễ tân, Phụ huynh) để phục vụ kiểm thử.*
* **Đối soát độ lệch cấu trúc (Drift Check)**:
  ```bash
  npm run db:drift
  ```

#### Bước 5: Khởi chạy máy chủ phát triển cục bộ (Local Development)
```bash
npm run dev
```
Ứng dụng sẽ khởi động và lắng nghe tại địa chỉ: **http://localhost:3000**

---

### 3. Kiểm Tra Tĩnh & Khắc Phục Lỗi TypeScript (Linting)

Trước khi thực hiện biên dịch hoặc tạo các pull request, bắt buộc phải chạy chương trình kiểm tra lỗi kiểu dữ liệu tĩnh để tránh phát sinh lỗi runtime:
```bash
npm run lint
```
**Lưu ý trên hệ điều hành Windows (PowerShell)**: Nếu PowerShell chặn quyền chạy scripts, vui lòng thực hiện bypass Execution Policy hoặc gọi trực tiếp trình thực thi CMD:
```powershell
npm.cmd run lint
```

---

### 4. Kiểm Thử Tích Hợp Đóng Gói (E2E Integration Testing)

Hệ thống hỗ trợ kiểm thử tự động toàn bộ luồng hoạt động học thuật thông qua script mô phỏng. Đảm bảo máy chủ cục bộ đang chạy ở cổng `3000` trước khi thực hiện lệnh test.

* **Trên Linux / macOS / Git Bash**:
  ```bash
  E2E_BASE_URL=http://localhost:3000 npm run test:e2e
  ```
* **Trên Windows PowerShell**:
  ```powershell
  $env:E2E_BASE_URL="http://localhost:3000"
  npm.cmd run test:e2e
  ```
*Kịch bản E2E sẽ mô phỏng tuần tự các hành động: Khởi tạo sinh viên mới -> Đăng ký môn -> Giảng viên điểm danh và chấm điểm -> Sinh viên thanh toán học phí -> Kế toán duyệt giao dịch -> Cố vấn học tập giải quyết các cảnh báo phát sinh.*

---

### 5. Biên Dịch & Vận Hành Production (Production Deploy)

Hệ thống hỗ trợ cấu trúc đóng gói độc lập để triển khai trên các dịch vụ đám mây (như Render, Heroku, AWS).

#### Quy trình biên dịch:
```bash
npm run build
```
*Lệnh này sẽ thực hiện song song: Sử dụng `vite build` để đóng gói giao diện React SPA tối ưu tại thư mục `dist/client`, đồng thời sử dụng `esbuild` đóng gói file khởi chạy backend `server.ts` thành tệp tin CJS duy nhất tại `dist/server.cjs`.*

#### Quy trình khởi chạy trên máy chủ sản phẩm thực tế:
```bash
# Khởi động dịch vụ Node.js chạy production từ file đóng gói
npm start
```

#### Các biến môi trường bắt buộc trên Production:
* `NODE_ENV=production`
* `DATABASE_URL` (Đường dẫn kết nối CSDL PostgreSQL production an toàn)
* `JWT_SECRET` (Khóa bảo mật mạnh để mã hóa các session cookie phiên làm việc)
* `PORT` (Cổng dịch vụ do đám mây phân phối, mặc định: 3000)

#### Quy trình triển khai sạch và cấu trúc lệnh đầy đủ trên server:
```bash
npm ci                          # Cài đặt sạch các gói thư viện đúng theo lockfile
npm run db:migrate              # Chạy cập nhật cấu trúc database mới nhất
npm run build                   # Biên dịch tối ưu toàn bộ mã nguồn frontend và backend
npm start                       # Khởi chạy dịch vụ chính thức
```

---

### 6. Smoke Test & Khôi Phục Lỗi Khẩn Cấp (Smoke Test & Rollback)

#### Smoke Test sau khi triển khai:
Để kiểm tra nhanh tính khả dụng của API và hệ thống sau khi quá trình CI/CD hoàn tất trên server production:
```bash
DEPLOY_URL=https://lms-domain-cua-ban.com npm run smoke:deploy
```

#### Quy trình khôi phục lỗi khẩn cấp (Rollback Protocol):
Nếu quá trình triển khai phiên bản mới gặp sự cố runtime nghiêm trọng gây treo ứng dụng:
1. Xác định phiên bản Git commit hoạt động ổn định gần nhất.
2. Thực hiện cấu hình CI/CD để build lại commit ổn định đó hoặc chạy deploy thủ công.
3. Nếu cấu trúc bảng Database bị thay đổi trái phép hoặc lỗi dữ liệu do migration mới, áp dụng quy trình phục hồi sao lưu (Database Snapshot Restore) và thực hiện các bước đối soát cụ thể theo hướng dẫn chi tiết tại [Tài liệu Khôi phục Lỗi khẩn cấp](file:///d:/LMS/docs/rollback-checklist.md).
