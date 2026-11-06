# Hướng dẫn cập nhật website Tiến Nông

Website được quản trị bằng **Pages CMS** — trang quản trị miễn phí, đăng nhập bằng tài khoản GitHub.
Mỗi lần bấm **Save**, website tự cập nhật sau khoảng **3–5 phút**. Nếu lần sửa đó làm web dựng lỗi,
web đang chạy giữ nguyên bản cũ (xem tab **Actions** của repo để biết lỗi).

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
   **https://tiennong.com/?sua-anh** (trước khi chuyển tên miền: https://ducminhnguyenvietnam-sketch.github.io/tien-nong-group-website/?sua-anh)
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
2. **Token name**: `Sửa ảnh website`. **Expiration**: 90 ngày (hết hạn thì tạo mã mới).
3. **Repository access** → **Only select repositories** → chọn `tien-nong-group-website`.
4. **Permissions → Repository permissions**: **Contents** = *Read and write*; **Actions** = *Read-only*.
5. Bấm **Generate token**, sao chép mã (bắt đầu bằng `github_pat_`) và dán vào ô trên website.

Mã chỉ lưu trong trình duyệt và **tự xoá khi đóng trình duyệt**. Trên máy riêng của mình có thể tích
**Ghi nhớ trên máy này** để không phải dán lại; không tích ô này trên máy dùng chung. Không gửi mã cho
người khác. Muốn gỡ mã: bấm **Đã kết nối GitHub ✓ → Ngắt kết nối**. Nếu nghi lộ mã, xoá mã đó ngay
ở https://github.com/settings/personal-access-tokens.

Vẫn có thể tải ảnh trong trang quản trị (ô **Ảnh** trong từng mục), nhưng khi đó không căn chỉnh
trực quan được.

## Slide đầu trang chủ, poster Sản phẩm, trang Văn hóa doanh nghiệp

- **Slide đầu trang chủ**: *Các trang → Trang chủ → 01 · Slide đầu trang*. Mỗi slide có dòng chữ
  nhỏ, tiêu đề, mô tả, 2 nút (chữ + đường dẫn) và ảnh. Bấm **Add** để thêm slide, kéo ⋮⋮ để đổi thứ tự.
  Nếu ảnh là poster đã thiết kế sẵn chữ (ví dụ ảnh chiến dịch NPK hữu cơ vi sinh), **tắt "Hiện chữ
  trên ảnh"** để website chỉ hiện ảnh. Slide tự chuyển sau 6 giây; ở chế độ sửa ảnh (`?sua-anh`)
  slide đứng yên — bấm chấm tròn bên dưới để chuyển tới slide cần thay ảnh.
- **Poster trang Sản phẩm**: *Các trang → Sản phẩm → Poster đầu trang* — tải ảnh thiết kế khổ lớn tràn ngang
  như ảnh đầu trang chủ (khoảng 2400×1200 px, đặt chữ và sản phẩm ở giữa ảnh vì trên điện thoại hai bên bị cắt bớt); có thể điền đường dẫn để khi bấm vào poster thì mở trang chiến dịch.
- **Văn hóa doanh nghiệp** (menu *Về Tiến Nông → Văn hóa doanh nghiệp*): sửa tại *Các trang → Văn hóa
  doanh nghiệp*. Điền **5 điều tâm niệm**, các **bài thơ** (mỗi câu thơ một dòng) và **video bài hát**:
  dán đường dẫn YouTube (khuyên dùng) hoặc tải tệp mp4. Các chỗ trong [ngoặc vuông] là chỗ cần điền.
- **Tên các mục menu** và menu con: *Thông tin chung → Đầu trang (menu)*.
- **Trở thành đối tác** (nút xanh trên menu): sửa tại *Các trang → Trở thành đối tác*. Điền quyền lợi,
  điều kiện, **đại lý và nhà phân phối tiêu biểu** (tên, địa chỉ, số liệu, lời chia sẻ, ảnh).
  Ở mục **07 · Giám đốc kinh doanh**, mỗi người có họ tên, số điện thoại và ô **Tỉnh/thành phụ trách**
  (chọn nhiều tỉnh trong danh sách 34 tỉnh, thành). Khách chọn tỉnh nào thì thấy người phụ trách tỉnh đó
  và nút **Liên hệ** để gọi ngay. Bản đồ Việt Nam có sẵn; nếu muốn dùng ảnh bản đồ tự thiết kế thì tải
  vào ô *Ảnh bản đồ thiết kế riêng*.
- **Trang Giải pháp → Theo vấn đề**: *Các trang → Giải pháp → 03 · Theo vấn đề – các vấn đề*. Mỗi vấn đề
  có 3 bước: biểu hiện + ảnh vấn đề → lý giải khoa học (mỗi dòng một ý) → giải pháp + ảnh bao bì + ảnh
  kết quả thực tế. Phần **Hỏi đáp** sửa ở *Hỏi đáp – câu hỏi thường gặp*.
- **Google Maps cho trụ sở, nhà máy**: *Các trang → Liên hệ → 03 · Văn phòng & nhà máy*. Dán link chia sẻ
  từ Google Maps vào từng ô; để trống thì website tự tìm theo địa chỉ.

## 4. Sửa chữ

Mỗi dòng chữ trên trang là một ô riêng, tên ô ghi loại chữ và vài chữ đầu, ví dụ
*Tiêu đề: Khoa học nền tảng, đồng ruộng là thước đo*. Sửa trực tiếp rồi bấm **Save**.

- Để xoá một dòng chữ, xoá hết chữ trong ô rồi Save — website sẽ để trống chỗ đó.
- Các ô **Đường dẫn** (link mạng xã hội, bài báo, PDF…): dán địa chỉ đầy đủ `https://…`.
  Để trống thì liên kết chưa dẫn đi đâu.
- Ô có chữ **Tệp/đường dẫn** (catalogue, hồ sơ năng lực…): tải PDF lên trực tiếp.
- Danh sách (sản phẩm, vị trí tuyển dụng, đại lý, hỏi đáp, các mốc lịch sử…): bấm **Add** để thêm,
  kéo biểu tượng ⋮⋮ để đổi thứ tự, biểu tượng thùng rác để xoá.
- **Căn lề chữ**: cuối mỗi trang trong CMS có nhóm *Căn lề chữ (tuỳ chọn)*.
  - *Cả trang*: kiểu căn cho mọi đoạn văn của trang (mặc định *Đều 2 bên*).
  - *Căn riêng từng mục*: bấm **Add**, chọn **Mục** (ví dụ *Lời chào của Tổng Giám đốc*) và **Kiểu căn lề**
    (giữa / trái / phải / đều). Căn giữa, trái, phải áp dụng cho cả tiêu đề lẫn đoạn văn của mục đó.
  - Muốn trở lại như cũ thì xoá dòng đó đi rồi Save.
- **Các mốc lịch sử cùng một năm** (ví dụ hai mốc 2014) chỉ hiện một năm trên dòng thời gian; khi đến năm
  đó, hai nội dung lần lượt hiện ra (có ghi 1/2, 2/2).

## 5. Đăng bài tin tức

1. **Tin tức – bài viết → Add an entry**.
2. Điền **Tiêu đề**, chọn **Chuyên mục**, **Ngày đăng**, viết **Tóm tắt** (1–2 câu).
3. Tải **Ảnh đại diện** (xem kích thước ở mục *Ảnh cho bài viết* bên dưới).
4. Viết **Nội dung bài viết**. Chèn ảnh: đặt con trỏ ở chỗ cần chèn, gõ **/** rồi chọn **Image** (Ảnh) → **Upload**
   ảnh từ máy. Không dán ảnh trực tiếp từ Word: ảnh dán từ Word chỉ là đường dẫn trong máy người viết
   (`file:/C:/…`), lên web sẽ không hiện.
5. Bật **Ghim làm tin nổi bật** nếu muốn bài hiện ô lớn đầu trang Tin tức (chỉ nên ghim 1 bài).
6. Bấm **Save**.

Địa chỉ bài viết được tạo từ tiêu đề lúc lưu lần đầu. Bài còn để nguyên dòng mẫu **[Nội dung bài viết]**
được coi là bản nháp: chưa hiện trên web cho tới khi viết nội dung thật.

### Ảnh cho bài viết — kích thước và dung lượng

Pages CMS **chỉ nhận tệp tối đa khoảng 3 MB** (lớn hơn sẽ báo lỗi *Failed to upload file: 413*) — giới hạn
này nằm ở máy chủ của Pages CMS, website không nâng được. Dưới mức đó cứ tải ảnh gốc lên: **website tự nén
và thu nhỏ** cả ảnh đại diện lẫn ảnh trong bài (bản rộng tối đa 1600–2000 px, khoảng 200–400 KB), nên trang
vẫn tải nhanh.

| Ảnh | Nên dùng | Tối đa |
| --- | --- | --- |
| Ảnh đại diện | ảnh ngang, rộng từ 2080 px (tỉ lệ khoảng 16:9) | dưới 3 MB |
| Ảnh trong bài | rộng từ 1600 px | dưới 3 MB |

Ảnh lớn hơn 3 MB (thường là ảnh chụp điện thoại đời mới, 4–10 MB): mở <https://squoosh.app>, kéo ảnh vào,
ở **Resize** gõ chiều rộng 2400, chọn **MozJPEG**, chất lượng 85 → **Download** (thường còn 1–2 MB, nhìn
không khác ảnh gốc). Hoặc trên Windows: chuột phải ảnh → **Mở bằng Photos** → **…** → **Đổi kích cỡ ảnh**.

**Cách không cần thu nhỏ (ảnh đại diện và album):** sau khi lưu bài lần đầu và web đã cập nhật (~2 phút),
mở bài trên web kèm `?sua-anh` ở cuối địa chỉ, bấm vào ảnh đại diện để tải ảnh lên — website tự thu nhỏ và
nén ảnh, không giới hạn dung lượng (xem mục 3).

## 6. Sau khi bấm Save

Website cập nhật sau khoảng 2 phút. Nếu sau 5 phút chưa thấy thay đổi, xem tab **Actions** của kho
GitHub: dấu ✗ đỏ nghĩa là lần cập nhật bị lỗi — liên hệ người phụ trách kỹ thuật.

Mọi lần lưu đều được ghi lại trong lịch sử GitHub, nên có thể khôi phục bản cũ nếu sửa nhầm.

## 7. Bản tiếng Anh và tiếng Trung

Website có ba thứ tiếng: tiếng Việt (địa chỉ gốc, ví dụ `/ve-tien-nong/`), tiếng Anh (`/en/about/`) và tiếng Trung giản thể (`/zh/about/`). Nút **Tiếng Việt · English · 中文** trên đầu trang chuyển sang đúng trang đó ở thứ tiếng kia.

- **Ảnh, đường dẫn, bố cục dùng chung**: thay ảnh ở bản tiếng Việt thì bản tiếng Anh và tiếng Trung đổi theo, không phải làm lại.
- **Chữ dịch nằm trong mục "Bản tiếng Anh & tiếng Trung"** ở menu trái. Mỗi trang có một danh sách hai cột: câu tiếng Việt (giữ nguyên) và bản dịch. Muốn sửa câu tiếng Anh/tiếng Trung thì sửa cột bản dịch rồi bấm Save.
- **Khi sửa một câu tiếng Việt**, bản tiếng Anh/tiếng Trung của câu đó sẽ hiện tiếng Việt cho đến khi có bản dịch mới. Vào đúng danh sách, bấm "Add an entry", dán câu tiếng Việt mới vào cột 1 và bản dịch vào cột 2. (Kỹ thuật viên có thể chạy `npm run i18n` để máy tự liệt kê các câu còn thiếu.)
- **Tin tức chỉ có tiếng Việt**: bản tiếng Anh/tiếng Trung không có mục Tin tức trên menu, không hiện khối tin mới ở trang chủ.
- **Nguyên tắc riêng cho bản tiếng Trung (chốt 6/11/2026)**: không có trang "Xanh hoá Trường Sa" và không hiện bất kỳ nội dung nào nhắc tới Hoàng Sa, Trường Sa (thẻ, chương trình, nhãn trên bản đồ). Website tự lọc theo chữ tiếng Việt, nên bài/thẻ mới có nhắc tới hai quần đảo cũng tự ẩn ở bản tiếng Trung.
- **Tên người, địa danh**: giữ nguyên tiếng Việt có dấu ở cả hai bản (ví dụ Nguyễn Hồng Phong, Thanh Hóa); tên thương hiệu luôn là **Tiến Nông**.

## Thay đổi từ bản giao diện mới (10/2026)

- **Nội dung chưa nhập không còn lộ ra ngoài.** Ô nào còn chữ trong ngoặc vuông (ví dụ `[Họ và tên]`, `[x]`)
  hoặc để trống thì tự ẩn trên trang. Nhập nội dung thật là mục đó tự hiện lại, không cần làm gì thêm.
- **Ô ảnh trống** hiện một ô màu xanh nhạt có logo thay cho khung nét đứt. Khung nét đứt và nút "＋ Thêm ảnh"
  vẫn hiện như cũ khi mở trang với `?sua-anh`.
- **Ảnh tải lên được tự thu nhỏ** khi đăng trang (bản WebP nhiều cỡ), nên cứ tải ảnh gốc chất lượng tốt;
  trang vẫn nhẹ trên điện thoại.
- **Trường mới:** *Cài đặt chung → Công ty → Hotline kỹ sư* (dùng cho nút "Gọi kỹ sư" trên điện thoại) và
  *Về Tiến Nông → 06 · Thành tựu → Tệp hồ sơ năng lực (PDF)* (nút tải chỉ hiện khi đã có tệp).
- **Biểu mẫu** (Đăng ký nông dân, Liên hệ, Dự án) chỉ hoạt động khi đã khai báo địa chỉ nhận dữ liệu
  (biến `FORM_ENDPOINT` của repo). Khi chưa có, trang hiện nút Gọi / Zalo / Email thay cho biểu mẫu.
- **Kiểm tra nội dung còn thiếu:** mỗi lần đăng, mục *Actions* của GitHub liệt kê các ô còn nội dung mẫu,
  ảnh còn trống và bài viết chưa có ngày (bước "check:content").

## Đăng web lên tiennong.com (hosting Mắt Bão)

Website là trang tĩnh: GitHub dựng sẵn các tệp HTML và ảnh rồi tải lên hosting qua FTPS (FTP có mã hoá).
Không có cơ sở dữ liệu hay trang đăng nhập trên hosting.

- Quy trình **Deploy to tiennong.com (Mắt Bão)** (`.github/workflows/deploy-mat-bao.yml`) chạy sau mỗi
  thay đổi trên nhánh `main`, kể cả mỗi lần lưu trong Pages CMS. Bước dựng hoặc kiểm tra lỗi thì không tải gì lên.
- Thông tin FTP nằm ở **Settings → Secrets and variables → Actions → Secrets**: `FTP_SERVER`, `FTP_USERNAME`,
  `FTP_PASSWORD`. Dùng một tài khoản FTP riêng chỉ vào được thư mục web; không ghi mật khẩu vào tệp nào.
- Tuỳ chọn (tab **Variables**): `SITE_URL` (mặc định `https://tiennong.com`), `FTP_DIR` (mặc định `public_html/`),
  `FTP_SECURITY` (mặc định `strict`: kiểm tra chứng chỉ máy chủ FTP để mật khẩu chỉ đi đến đúng máy chủ.
  Nếu lần chạy báo lỗi chứng chỉ, ưu tiên đổi `FTP_SERVER` sang tên máy chủ Mắt Bão ghi trong chứng chỉ;
  chỉ đặt `loose` khi không còn cách khác).
- **Trước lần đăng đầu tiên**: sao lưu thư mục `public_html` cũ rồi xoá hết tệp cũ trong đó (đặc biệt
  `index.php`, WordPress cũ). Website mới không chạy mã PHP nào; `.htaccess` chặn mọi tệp mã máy chủ.
- Tệp `public/.htaccess` ép https, bỏ `www`, chặn tệp ẩn và tệp mã máy chủ, đặt các lớp bảo vệ trình duyệt
  (CSP, HSTS, chống nhúng trang) và trang 404.
- Bản xem thử trên GitHub Pages chỉ chạy khi repo để public; repo private thì bỏ qua bước đó.

## Bảo mật — việc định kỳ

- **Tài khoản**: bật xác thực 2 lớp (2FA) cho GitHub, Mắt Bão và hộp thư info@; mỗi người dùng tài khoản riêng.
- **Cập nhật tự động**: Dependabot mở pull request cập nhật thư viện (hằng tuần) và GitHub Actions (hằng tháng).
  Chỉ merge khi bước kiểm tra của pull request báo xanh.
- **Các bước đăng web** chỉ dùng phiên bản cố định của từng công cụ (ghi rõ mã commit), bản thay thế đến qua
  Dependabot nên không ai đổi được công cụ ở giữa chừng.
- **Biểu mẫu Liên hệ**: sau khi hộp thư bấm xác nhận FormSubmit lần đầu, dán chuỗi bí danh trong thư
  xác nhận vào *Các trang → Liên hệ → Biểu mẫu → Mã bí danh FormSubmit*.
- **Mã sửa ảnh GitHub**: đặt hạn 90 ngày, xoá mã của người đã nghỉ việc ở trang quản lý mã của GitHub.
