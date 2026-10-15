# Hướng dẫn cập nhật website Tiến Nông

Website được quản trị bằng **Pages CMS** — trang quản trị miễn phí, đăng nhập bằng tài khoản GitHub.
Mỗi lần bấm **Save**, website tự cập nhật sau khoảng **2 phút**.

## 1. Đăng nhập lần đầu

1. Mở **https://app.pagescms.org** và bấm **Sign in with GitHub**.
2. Lần đầu, Pages CMS sẽ hỏi cài ứng dụng GitHub: chọn tài khoản `ducminhnguyenvietnam-sketch`,
   chọn **Only select repositories** → `tien-nong-group-website` → **Install**.
3. Chọn kho `tien-nong-group-website`, nhánh **main**.

Mời đồng nghiệp: trong Pages CMS, bấm mục **Collaborators** ở menu bên trái, nhập email người cần mời.
Người được mời đăng nhập bằng email, không cần tài khoản GitHub.

## 2. Menu bên trái

| Mục | Dùng để |
| --- | --- |
| **Tin tức – bài viết** | Thêm, sửa, xoá bài viết. Bài mới nhất tự hiện ở trang chủ và trang Tin tức. |
| **Các trang** | Mỗi trang (Trang chủ, Về Tiến Nông, Sản phẩm…) chia theo từng mục trên trang, theo đúng thứ tự từ trên xuống. |
| **Thông tin chung** | Tên công ty, địa chỉ, điện thoại, mã số DN, mạng xã hội, tên các mục menu, chân trang. |
| **Media** | Toàn bộ ảnh và tệp PDF đã tải lên. |

## 3. Thay ảnh

Mỗi ô ảnh có 4 dòng:

- **Ảnh** — kéo thả ảnh vào hoặc bấm để chọn. Dòng mô tả bên dưới cho biết kích thước khung (ví dụ
  *Khung ảnh khoảng 576×420 px — nên dùng ảnh rộng ít nhất 1152 px*).
- **Giữ phần nào của ảnh khi khung cắt bớt** — ảnh luôn lấp đầy khung, phần thừa bị cắt. Chọn
  *Phía trên* nếu muốn giữ khuôn mặt/phần trên, *Phía dưới* nếu muốn giữ phần dưới…
- **Phóng to** — phóng ảnh lên 110–200% để cắt sát hơn (phóng về phía điểm đã chọn ở trên).
- **Mô tả ảnh** — một câu mô tả nội dung ảnh (tốt cho Google).

Để trống ô **Ảnh** thì website hiện khung chờ ảnh như bản thiết kế.

Mẹo: ảnh nên là JPG/WebP, dung lượng dưới 500 KB để trang tải nhanh (có thể nén tại squoosh.app).

## 4. Sửa chữ

Mỗi dòng chữ trên trang là một ô riêng, tên ô ghi loại chữ và vài chữ đầu, ví dụ
*Tiêu đề: Khoa học nền tảng, đồng ruộng là thước đo*. Sửa trực tiếp rồi bấm **Save**.

- Các ô **Đường dẫn** (link mạng xã hội, bài báo, PDF…): dán địa chỉ đầy đủ `https://…`.
  Để trống thì liên kết chưa dẫn đi đâu.
- Ô có chữ **Tệp/đường dẫn** (catalogue, hồ sơ năng lực…): tải PDF lên trực tiếp.
- Danh sách (sản phẩm, vị trí tuyển dụng, đại lý, hỏi đáp, các mốc lịch sử…): bấm **Add** để thêm,
  kéo biểu tượng ⋮⋮ để đổi thứ tự, biểu tượng thùng rác để xoá.

## 5. Đăng bài tin tức

1. **Tin tức – bài viết → Add an entry**.
2. Điền **Tiêu đề**, chọn **Chuyên mục**, **Ngày đăng**, viết **Tóm tắt** (1–2 câu).
3. Tải **Ảnh đại diện**.
4. Viết **Nội dung bài viết**: dùng thanh công cụ để tạo tiêu đề phụ, in đậm, trích dẫn, chèn ảnh.
5. Bật **Ghim làm tin nổi bật** nếu muốn bài hiện ô lớn đầu trang Tin tức (chỉ nên ghim 1 bài).
6. Bấm **Save**.

Địa chỉ bài viết được tạo từ tiêu đề lúc lưu lần đầu.

## 6. Sau khi bấm Save

Website cập nhật sau khoảng 2 phút. Nếu sau 5 phút chưa thấy thay đổi, xem tab **Actions** của kho
GitHub: dấu ✗ đỏ nghĩa là lần cập nhật bị lỗi — liên hệ người phụ trách kỹ thuật.

Mọi lần lưu đều được ghi lại trong lịch sử GitHub, nên có thể khôi phục bản cũ nếu sửa nhầm.
