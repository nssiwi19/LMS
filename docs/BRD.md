# TÀI LIỆU YÊU CẦU NGHIỆP VỤ (BUSINESS REQUIREMENTS DOCUMENT - BRD)
## HỆ THỐNG QUẢN LÝ ĐÀO TẠO TOÀN DIỆN (E16 LMS PLATFORM)

---

## 1. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)
Hệ thống **E16 LMS** là một nền tảng quản lý đào tạo (Learning Management System) toàn diện, được thiết kế để kết nối chặt chẽ tất cả các bên tham gia vào quá trình giáo dục bao gồm: Ban giám đốc/Admin, Học vụ, Giảng viên, Lễ tân, Sinh viên, Phụ huynh và Cố vấn học tập. Nền tảng không chỉ quản lý giáo trình và đánh giá học thuật, mà còn tự động hóa các quy trình giám sát chuyên cần, phát hành và thu hồi học phí, cùng với các cảnh báo học tập thông minh nhằm tối ưu hóa chất lượng giảng dạy và quản trị vận hành.

---

## 2. CƠ CẤU VAI TRÒ & PHÂN QUYỀN (ROLES & PERMISSIONS)

Hệ thống phân quyền nghiêm ngặt dựa trên 7 vai trò cốt lõi:

| Vai trò | Phân hệ (Panel) | Quyền hạn & Trách nhiệm chính |
| :--- | :--- | :--- |
| **Super Admin / Admin** | `AdminPanel.tsx` | - Cấu hình hệ thống, quản trị niên khóa và học kỳ đào tạo.<br>- Tạo mới, khóa/mở khóa tài khoản, cấp lại mật khẩu cho tất cả nhân sự.<br>- Phê duyệt/từ chối xuất bản khóa học mới của giảng viên (yêu cầu điền lý do từ chối).<br>- Giám sát hệ thống qua Audit Logs và bảng theo dõi cảnh báo học thuật toàn trường. |
| **Học vụ (Academic Admin)** | `AcademicPanel.tsx` | - **Chịu trách nhiệm điểm danh chính**: Khởi tạo và chốt danh sách điểm danh hàng ngày.<br>- Giám sát sự tuân thủ điểm danh của giảng viên phụ trách môn học.<br>- Gửi email cảnh cáo giảng viên trễ hạn nộp chuyên cần.<br>- Quản lý và xử lý các cảnh báo học tập của sinh viên trễ đóng học phí hoặc chuyên cần kém (<80%). |
| **Giảng viên (Teacher)** | `TeacherPanel.tsx` | - Soạn thảo và xây dựng giáo trình bài giảng (Lessons) theo từng chương mục.<br>- Thiết lập các đề thi đánh giá học lực: Đề thi trắc nghiệm (Quizzes) và Đề tự luận thực hành (Assignments).<br>- Tiến hành chấm điểm sản phẩm tự luận của sinh viên, cung cấp điểm số cùng nhận xét/phản hồi chi tiết (Feedback). |
| **Lễ tân (Receptionist)** | `ReceptionPanel.tsx` | - Tiếp nhận thông tin, tư vấn chương trình và đăng ký nhập học cho sinh viên mới.<br>- Quản trị thông tin và hỗ trợ cấp lại mật khẩu tức thì cho học viên khi gặp sự cố. |
| **Học viên / Sinh viên (Student)** | `StudentPanel.tsx` | - Xem danh mục khóa học, đăng ký môn học trực tuyến.<br>- Học tập qua video, tài liệu bài giảng và tham gia thảo luận trên diễn đàn khóa học.<br>- Làm bài trắc nghiệm tính giờ (QuizConsole - tự động nộp bài khi hết giờ) & nộp sản phẩm tự luận có đính kèm tệp tin đa định dạng.<br>- Xem tiến độ học tập, chuyên cần, tra cứu bảng điểm và tạo đơn phúc khảo điểm số.<br>- Thanh toán học phí thông qua quét mã QR ngân hàng (tự động hóa giao dịch sang trạng thái chờ duyệt). |
| **Phụ huynh (Parent)** | `ParentPanel.tsx` | - Giám sát trực tiếp quá trình chuyên cần học tập hàng tuần của con.<br>- Xem các cảnh báo đỏ học tập phát ra từ hệ thống hoặc cố vấn học tập.<br>- Tra cứu bảng điểm thành phần chi tiết của con (Tự luận thuyết 30% & Trắc nghiệm thực hành 70%) cùng kết quả học lực.<br>- Nhận thông báo đóng học phí và theo dõi tiến trình hoàn tất nghĩa vụ tài chính của con. |
| **Cố vấn học tập (Advisor)** | `AdvisorPanel.tsx` | - Theo dõi sát sao hồ sơ học tập chi tiết của danh sách sinh viên được phân công phụ trách.<br>- Viết ghi chú cố vấn học tập (Advisor Notes) thường niên hoặc khẩn cấp khi phát hiện sinh viên sa sút học lực hoặc dính cảnh báo. |

---

## 3. CÁC LUỒNG NGHIỆP VỤ CỐT LÕI (CORE BUSINESS WORKFLOWS)

### 3.1. Luồng Phê duyệt & Đào tạo Khóa học (Academic & Course Approval Workflow)
1. **Soạn thảo**: Giảng viên khởi tạo khóa học mới, nhập đầy đủ thông tin (Tên môn, mô tả, phân loại, học phí, cấp trình độ, từ khóa tìm kiếm) và thiết lập giáo trình chi tiết. Khóa học được lưu ở trạng thái nháp (`pending`).
2. **Yêu cầu duyệt**: Giảng viên gửi yêu cầu xuất bản khóa học lên Ban giám đốc.
3. **Phê duyệt**: Admin xem xét nội dung khóa học:
   - Nếu đạt chuẩn: Admin bấm **Phê duyệt** -> Khóa học chuyển sang trạng thái hoạt động (`published`), sinh viên có thể nhìn thấy trên danh mục để đăng ký.
   - Nếu chưa đạt chuẩn: Admin bấm **Từ chối** -> Hệ thống hiển thị hộp thoại bắt buộc nhập lý do từ chối. Lý do này được ghi nhận và gửi thẳng tới giảng viên để chỉnh sửa lại.

### 3.2. Luồng Khảo sát & Đánh giá (Quizzes & Assignments)
- **Đề trắc nghiệm (Quizzes)**:
  - Giảng viên cấu hình: Tên đề thi, điểm đạt yêu cầu (%), thời gian làm bài giới hạn (phút), số lượt làm bài tối đa.
  - Sinh viên bắt đầu làm bài: Hệ thống hiển thị màn hình làm bài tập trung (`QuizConsole.tsx`) có bộ đếm ngược thời gian thực.
  - Hết giờ làm bài: Hệ thống tự động khóa bài làm và kích hoạt hàm nộp bài tự động (`handleAutoSubmitQuiz`) gửi kết quả về server để đối soát điểm.
- **Đề tự luận / Thách thức thực hành (Assignments)**:
  - Sinh viên thực hiện làm bài bằng cách nhập văn bản/mã nguồn hoặc tải lên tệp tin đính kèm (PDF, ZIP, ảnh...).
  - **Quy tắc cập nhật bài nộp**: Khi cập nhật bài làm cũ, hệ thống tự động bóc tách loại bỏ các chuỗi định dạng đính kèm cũ (`[Tệp đính kèm: ...]`) để sinh viên tập trung chỉnh sửa văn bản gốc. Nếu sinh viên giữ nguyên tệp, hệ thống sẽ bảo toàn tệp cũ; nếu sinh viên chọn tải lên tệp mới, tệp mới sẽ thay thế hoàn toàn tệp cũ và giao diện sẽ hiển thị chỉ dẫn trực quan.

### 3.3. Luồng Quản trị Chuyên cần & Điểm danh (Attendance Control Workflow)
Để đảm bảo tính khách quan và kiểm soát chất lượng, **chức năng điểm danh đã được chuyển giao hoàn toàn từ Giảng viên sang phòng Học vụ**:
1. **Giám sát sự tuân thủ**: Hệ thống tự động liệt kê các lớp học phần chưa được điểm danh buổi nào trong kỳ. Cán bộ Học vụ có thể bấm nút **"Bắn mail Cảnh cáo"** gửi cảnh báo kỷ luật trực tiếp đến email giảng viên phụ trách môn học đó.
2. **Khởi tạo buổi học**: Học vụ thực hiện chọn môn học và bấm **"Bắt đầu buổi học mới"**, điền ngày học, giờ học và chủ đề bài học.
3. **Chốt danh sách**: Học vụ tích chọn trạng thái điểm danh cho từng sinh viên (Đúng giờ, Đi muộn, Có phép, Vắng mặt) và bấm lưu. Hệ thống tự động ghi nhận dữ liệu chuyên cần thực tế vào cơ sở dữ liệu.

### 3.4. Luồng Quản lý Tài chính & Thu học phí (Finance & Tuition Fee Payments)
1. **Phát hành học phí hàng loạt**: Cán bộ Kế toán chọn học kỳ và bấm **"Phát nợ học phí hàng loạt"** -> Hệ thống tự động quét toàn bộ sinh viên đang hoạt động trong niên học khóa, tạo hóa đơn học phí mặc định (15.000.000 VND) kèm theo hạn đóng 30 ngày và gửi thông báo nhắc nhở tới sinh viên/phụ huynh.
2. **Sinh viên thanh toán**: Sinh viên quét mã QR ngân hàng trên cổng thông tin để thực hiện chuyển khoản. Hệ thống tạo một giao dịch chờ duyệt (`pending`) gắn với mã hóa đơn học phí tương ứng.
3. **Ghi thu & Biên lai**:
   - Thủ quỹ thực hiện đối soát tài khoản và phê duyệt giao dịch chuyển khoản trên cổng kế toán, hoặc kế toán bấm **"Ghi thu"** trực tiếp trên danh sách học phí của sinh viên.
   - Khi hoàn tất thanh toán, hệ thống tự động:
     - Tạo mã biên lai giao dịch duy nhất (`RECEIPT-XXXXXX`).
     - Tự động chuyển trạng thái hóa đơn sang `paid` (hoặc `partial` nếu nộp một phần).
     - **Tự động mở khóa học tập**: Gỡ bỏ trạng thái tạm dừng học thuật do nợ phí (`feeHold = false`) trên hồ sơ sinh viên.
     - **Tự động xóa cảnh báo**: Đánh dấu đã khắc phục xử lý (`isResolved = true`) cho cảnh báo nợ xấu trễ hạn học phí của sinh viên đó.

### 3.5. Luồng Giám sát & Hỗ trợ Học tập (Academic Warnings & Academic Advising)
- **Quét cảnh báo tự động**:
  - **Quét trễ chuyên cần**: Hệ thống quét tỉ lệ chuyên cần thực tế của sinh viên trong từng môn học. Sinh viên có tỉ lệ có mặt dưới 80% sẽ bị hệ thống tự động phát ra Cảnh báo học tập mức độ Đỏ (Cảnh báo chuyên cần) và gửi cảnh báo tới sinh viên và phụ huynh.
  - **Quét trễ học phí**: Hệ thống quét các hóa đơn học phí chưa thanh toán và đã quá hạn định mức nộp bài. Tự động phát Cảnh báo học phí trễ hạn.
- **Hỗ trợ học tập từ Cố vấn**: Cố vấn học tập dựa trên danh sách cảnh báo đỏ của lớp phụ trách để thực hiện liên hệ, trao đổi và viết Ghi chú cố vấn học tập nhằm đưa ra lộ trình cải thiện và giải quyết cảnh báo cho sinh viên.

---

## 4. CÁC QUY TẮC NGHIỆP VỤ QUAN TRỌNG (BUSINESS RULES & SYSTEM CONSTRAINTS)

### 4.1. Quy tắc Tính Điểm môn học thực tế
Điểm tổng kết của mỗi học phần được tính toán động dựa trên trọng số chuẩn của nhà trường:
$$Điểm\ Tổng\ Kết = (Avg\ Assignment\ Score \times 30\%) + (Max\ Quiz\ Score \times 70\%)$$
- **Tự luận lý thuyết (Assignments)**: Chiếm **30%** tổng số điểm, tính bằng điểm số trung bình của các bài tập tự luận đã được giảng viên chấm điểm thực tế.
- **Trắc nghiệm thực hành (Quizzes)**: Chiếm **70%** tổng số điểm, tính bằng điểm số cao nhất đạt được trong số các lượt làm bài trắc nghiệm của sinh viên.
- **Xếp loại Học lực của sinh viên**:
  - Điểm Tổng Kết $\ge 90\%$: Học lực **Xuất sắc** (GPA 4.0).
  - Điểm Tổng Kết $\ge 80\%$: Học lực **Giỏi** (GPA 3.0).
  - Điểm Tổng Kết $\ge 70\%$: Học lực **Khá** (GPA 2.0).
  - Điểm Tổng Kết $\ge 60\%$: Học lực **Trung bình** (GPA 1.0).
  - Điểm Tổng Kết $< 60\%$: Học lực **Yếu / Không đạt** (GPA 0.0 - Cần học lại môn).

### 4.2. Quy tắc Điều kiện Học thuật & Chuyên cần
- **Điều kiện thi cử & Học bạ**: Sinh viên phải đảm bảo tỉ lệ chuyên cần tối thiểu từ **80% trở lên** trong suốt thời gian diễn ra môn học. Nếu chuyên cần dưới 80%, sinh viên sẽ bị khóa điều kiện thi cử cuối khóa và bị hệ thống tự động phát thông báo nhắc nhở khẩn cấp.
- **Khóa hồ sơ do nợ học phí**: Sinh viên quá hạn đóng học phí sẽ bị gắn cờ giữ hồ sơ học phí (`feeHold = true`), tạm đình chỉ quyền đăng ký môn học mới và quyền thi học kỳ cho đến khi hoàn thành nghĩa vụ học phí.

### 4.3. Quy tắc Giao diện & Trải nghiệm Người dùng (UI/UX Standards)
- **Cơ chế Portal chống vỡ modal**: Tất cả các modal popup chỉnh sửa thông tin khóa học, cập nhật điểm, chấm điểm tự luận phải được render thông qua `ModalPortal.tsx` trực tiếp vào `document.body`. Quy tắc này ngăn chặn triệt để lỗi chứa khối (Containing Block) của CSS Tailwind làm modal bị lệch vị trí hoặc biến mất khi người dùng đang cuộn trang ở các phân hệ chính có sử dụng thuộc tính `filter` / `backdrop-blur`.
- **Giới hạn an toàn dữ liệu SVG**: Biểu đồ tiến độ thu học phí SVG của bộ phận Kế toán bắt buộc phải giới hạn chiều rộng hiển thị tối đa của thanh tiến trình là 140px bằng hàm `Math.min(collectionRate, 100)` để ngăn ngừa vỡ giao diện trong các trường hợp số liệu thu vượt mức 100%.

### 4.4. Quy tắc Bảo mật & Đồng bộ dữ liệu Kế toán
- **An toàn luồng tài chính**: Luồng thanh toán học phí, cảnh báo tài chính và đăng ký môn học bắt buộc phải được xử lý trực tiếp và duy nhất thông qua cơ sở dữ liệu thực của backend (`server.ts` và `financeRepository`).
- **Cơ chế chống đè dữ liệu**: Hàm đồng bộ hóa client store lên server `syncClientStoreToDb` bắt buộc phải **bỏ qua hoàn toàn** việc đồng bộ ngược từ dữ liệu client-side đè lên database đối với các bảng: `tuition_fees`, `transactions`, `academic_warnings`, và `enrollments` nhằm triệt tiêu hoàn toàn lỗi đè trạng thái học phí cũ của client lên trạng thái thanh toán mới của DB.

---

## 5. TIÊU CHUẨN XÁC MINH VÀ NGHIỆM THU (VERIFICATION & ACCEPTANCE CRITERIA)

Để hệ thống E16 LMS được coi là sẵn sàng vận hành thực tế, các tiêu chí sau phải được đáp ứng đầy đủ:

1. **Biên dịch**: Mã nguồn biên dịch hoàn toàn thành công qua trình biên dịch TypeScript không có bất kỳ lỗi cảnh báo hoặc lỗi kiểu (`tsc --noEmit` trả về mã thoát 0).
2. **An toàn Modal**: Khi cuộn trang xuống dưới cùng ở phân hệ Giảng viên, Học vụ, Lễ tân và bấm mở bất kỳ modal nào, modal đó phải luôn luôn hiển thị cân đối và tập trung ngay chính giữa màn hình (Viewport).
3. **Đồng bộ hóa Học phí**: Khi kế toán ghi nhận thanh toán học phí thành công, hóa đơn tương ứng trên database phải chuyển sang `paid`, cảnh báo học tập liên quan phải chuyển thành `isResolved = true` và cờ khóa hồ sơ `feeHold` trên học viên phải tự động gỡ bỏ ngay lập tức sau khi refresh.
4. **Phụ huynh xem điểm**: Tài khoản Phụ huynh đăng nhập vào hệ thống phải hiển thị chính xác bảng điểm chi tiết thành phần (30% Assignment, 70% Quiz) và điểm tổng kết được tính động theo thời gian thực thay vì hiển thị dữ liệu tĩnh (mock).
5. **Đính kèm bài làm**: Khi học viên bấm cập nhật bài làm tự luận nhiều lần, nội dung trong ô soạn thảo không được xuất hiện chuỗi đính kèm file lặp lại gây phình to văn bản.
