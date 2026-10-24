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

## 3. Thay ảnh — sửa ngay trên website

Ảnh được thay và căn chỉnh **ngay trên trang web thật**, thấy kết quả tức thì:

1. Mở website kèm chữ `?sua-anh` ở cuối địa chỉ:
   **https://ducminhnguyenvietnam-sketch.github.io/tien-nong-group-website/?sua-anh**
   Góc dưới màn hình hiện thanh **Chế độ sửa ảnh**; mọi ảnh có viền đứt và nút **✎ Thay / căn ảnh**
   (ô chưa có ảnh: **＋ Thêm ảnh**). Chế độ này vẫn bật khi chuyển sang trang khác.
2. Bấm vào ảnh cần sửa:
   - **Chọn ảnh khác…** để lấy ảnh từ máy/điện thoại;
   - **kéo ảnh ngay trong khung** để chọn phần hiển thị, kéo thanh **Phóng to** nếu cần;
   - **Về giữa** để căn lại từ đầu.
3. Bấm **Lưu**. Lần đầu sẽ được hỏi **mã GitHub** (xem bên dưới). Sau khoảng 2 phút bảng báo
   *Website đã cập nhật ✓*.
4. Bấm **Thoát** trên thanh dưới cùng để tắt chế độ sửa.

Ảnh tải lên được tự thu nhỏ (tối đa 2400 px) và nén, nên không cần xử lý trước. Có thể căn lại
ảnh bất cứ lúc nào mà không phải tải lại.

### Mã GitHub (làm một lần trên mỗi máy/điện thoại)

1. Mở https://github.com/settings/personal-access-tokens/new (đăng nhập GitHub nếu được hỏi).
2. **Token name**: `Sửa ảnh website`. **Expiration**: chọn thời hạn, ví dụ 1 năm.
3. **Repository access** → **Only select repositories** → chọn `tien-nong-group-website`.
4. **Permissions → Repository permissions**: **Contents** = *Read and write*; **Actions** = *Read-only*.
5. Bấm **Generate token**, sao chép mã (bắt đầu bằng `github_pat_`) và dán vào ô trên website.

Mã chỉ lưu trong trình duyệt của máy đó. Không gửi mã cho người khác; khi đổi máy hoặc mã hết hạn
thì tạo mã mới. Muốn gỡ mã khỏi máy: bấm **Đã kết nối GitHub ✓ → Ngắt kết nối**.

Vẫn có thể tải ảnh trong trang quản trị (ô **Ảnh** trong từng mục), nhưng khi đó không căn chỉnh
trực quan được.

## Slide đầu trang chủ, poster Sản phẩm, trang Văn hóa doanh nghiệp

- **Slide đầu trang chủ**: *Các trang → Trang chủ → 01 · Slide đầu trang*. Mỗi slide có dòng chữ
  nhỏ, tiêu đề, mô tả, 2 nút (chữ + đường dẫn) và ảnh. Bấm **Add** để thêm slide, kéo ⋮⋮ để đổi thứ tự.
  Nếu ảnh là poster đã thiết kế sẵn chữ (ví dụ ảnh chiến dịch NPK hữu cơ vi sinh), **tắt "Hiện chữ
  trên ảnh"** để website chỉ hiện ảnh. Slide tự chuyển sau 6 giây; ở chế độ sửa ảnh (`?sua-anh`)
  slide đứng yên — bấm chấm tròn bên dưới để chuyển tới slide cần thay ảnh.
- **Poster trang Sản phẩm**: *Các trang → Sản phẩm → Poster đầu trang* — tải ảnh thiết kế tỉ lệ khoảng
  3:1 (ví dụ 2400×800 px); có thể điền đường dẫn để khi bấm vào poster thì mở trang chiến dịch.
- **Văn hóa doanh nghiệp** (menu *Về Tiến Nông → Văn hóa doanh nghiệp*): sửa tại *Các trang → Văn hóa
  doanh nghiệp*. Điền **5 điều tâm niệm**, các **bài thơ** (mỗi câu thơ một dòng) và **video bài hát**:
  dán đường dẫn YouTube (khuyên dùng) hoặc tải tệp mp4. Các chỗ trong [ngoặc vuông] là chỗ cần điền.
- **Tên các mục menu** và menu con: *Thông tin chung → Đầu trang (menu)*.

## 4. Sửa chữ

Mỗi dòng chữ trên trang là một ô riêng, tên ô ghi loại chữ và vài chữ đầu, ví dụ
*Tiêu đề: Khoa học nền tảng, đồng ruộng là thước đo*. Sửa trực tiếp rồi bấm **Save**.

- Để xoá một dòng chữ, xoá hết chữ trong ô rồi Save — website sẽ để trống chỗ đó.
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
