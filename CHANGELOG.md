# Nhật ký thay đổi

Mọi thay đổi đáng chú ý của dự án được ghi ở đây. Định dạng theo [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), dự án dùng [Semantic Versioning](https://semver.org/).

## Chưa phát hành

### Thay đổi

- Trang dự án chuyển hoàn toàn sang tiếng Việt, bổ sung hướng dẫn cài riêng cho Chrome/Brave/Edge và Firefox, và nhắc đợi Studocu tải xong trước khi bấm Tải xuống.
- Trang dự án dùng tên miền riêng <https://docusave.yangio.id.vn/>; địa chỉ GitHub Pages cũ chuyển hướng về đây.
- Font của trang dùng Manrope thay Instrument Sans để có đủ dấu tiếng Việt; bộ subset vẫn giữ JetBrains Mono.

## 2.12.2 - 2026-10-20

### Thêm

- Công tắc bật/tắt toàn bộ tiện ích trong popup. Khi tắt, trang Studocu được trả về nguyên bản và tab tự tải lại.
- Script nền xoá cookie của mọi trang được hỗ trợ sau mỗi lần truy cập, bất kể công tắc chính, để trang "Access Blocked" của Studocu không bị kẹt. Việc này khiến người dùng bị đăng xuất khỏi Studocu.

### Thay đổi

- Popup và các nhãn trên trang đã được Việt hoá.

### Sửa

- Ảnh nền dự phòng không còn phủ lên chữ sau khi trình xem dựng ảnh thật. Rebrand đã đổi selector dọn ảnh sang `data-ds-injected-img` nhưng đoạn code gắn marker vẫn dùng tên cũ, nên ảnh nền chỉ có hình vẽ ở lại trên trang và che mất chữ trong bảng/sơ đồ. Marker đã được thống nhất và có test hồi quy.
- PDF in ra không còn bị thu nhỏ hoặc lệch trên những tài liệu mà stylesheet pdf2htmlEX dùng một khổ trang khi hiển thị và một khổ khác khi in. Kích thước tờ giấy được đo với rule in của tài liệu được bật, và chiều cao lẻ được làm tròn lên để không tràn sang một tờ trắng thừa. Firefox giờ nhận cùng khổ trang với Chrome vì có thêm một rule `@page` không tên đi kèm các rule `@page` có tên.

## 2.12.1 - 2026-09-26

### Sửa

- Hộp đăng nhập "You're one step away from the full document" không còn che tài liệu. Studocu hiển thị hộp này, không có nút đóng, làm tối trang và khoá cuộn, với những người bị đánh dấu là bot. Tài liệu bên dưới vẫn tải bình thường, nên tiện ích ẩn hộp này và gỡ khoá cuộn; trình xem và nút Tải xuống hoạt động như các trang khác. Các hộp đăng nhập do bạn tự mở (Sign in, Save) không bị ảnh hưởng.

### Thêm

- Trang dự án tại <https://thangvt-food.github.io/docusave/>, dựng từ `site/` và xuất bản bằng workflow Pages.

### Thay đổi

- Bản phát hành chỉ đính kèm file `.zip`; không phát hành `.xpi`. Firefox nạp tạm qua `about:debugging`.

## 2.12.0 - 2026-09-20

### Thêm

- Hỗ trợ trang Indonesia, [studocu.id](https://www.studocu.id).

## 2.11.0 - 2026-09-18

### Sửa

- Khôi phục chữ cho trang 10 trở đi. Các mảnh chữ `.page` được đánh số thập phân, không phải hex như ảnh nền; từ 2.9.0 tiện ích dựng chúng bằng hex nên request tự tải cho mọi trang sau trang 9 âm thầm trả 403 và những trang đó chỉ hiện khi trình xem tự tải. Đã kiểm tra với request của chính trình xem trên một tài liệu premium 63 trang.
- Người đọc không còn bị bỏ lại ở trang 50 sau lượt tự tải mọi trang. Các wrapper của trình xem không tự cuộn (cửa sổ mới cuộn), nên vị trí đã lưu được khôi phục vào sai phần tử. Bản chụp tải xuống cũng khôi phục vị trí theo cách này.
- Nút Tải xuống gốc của Studocu lại bị gỡ. Hash class của nó đã đổi (`Button-module-scss-module__…`), nên việc khớp chuyển sang nhãn nút theo nhiều ngôn ngữ của trang ("Downloaden", "Scarica", "Télécharger" và các ngôn ngữ khác), trong khi các liên kết như "Download the app" vẫn được giữ nguyên.
- Các mảnh chữ tham chiếu lớp hình vẽ bằng đường dẫn tương đối (`src="bga.png"`), nên bị phân giải theo URL của trang và trả 403 cho đến lần quét sau. Tham chiếu được đổi sang URL CDN có chữ ký khi chèn.
- PDF in ra dùng đúng khổ trang của tài liệu. Mỗi tờ được đặt kích thước theo trang nó chứa (rule `@page` có tên, để tài liệu trộn khổ dọc/ngang vẫn đúng) thay vì khổ giấy mặc định của trình duyệt, vốn để lại dải trắng cuối mỗi trang A4 khi in trên Letter.
- Một wrapper banner premium rỗng còn sót lại sau khi dọn banner cũng được ẩn.

### Thêm

- Popup trên thanh công cụ với các cài đặt: tắt riêng nút tải xuống, tự tải trang, ẩn quảng cáo, ẩn thanh công cụ AI và thay logo. Cài đặt được lưu trong `chrome.storage.sync`.
- Esc đóng bản xem trước tải xuống; bản xem trước hiện số trang và gợi ý chọn "Save as PDF".
- Bộ test (`npm test`) với fixture jsdom cho bốn dạng tài liệu: PDF gốc có trang bị khoá, PDF gốc đọc được toàn bộ, PDF gốc bị khoá toàn bộ và bản scan.
- Script build (`npm run build`) đóng gói `src/` vào `dist/`, workflow CI và workflow phát hành để build, ký và phát hành khi có tag `v*`.
- `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, mẫu issue và pull request.

### Thay đổi

- Mã tiện ích chuyển vào `src/`; content script được tách thành `common.js`, `cleanup.js`, `pages.js`, `download.js` và `main.js`, dùng chung một namespace thay vì lặp lại selector và logic URL.
- Quảng cáo, thanh công cụ AI và nút tải xuống gốc của Studocu được ẩn bằng CSS dựa trên các thuộc tính `html[data-ds-*]`, nên bật/tắt một tính năng không cần đổi stylesheet.
- Cảnh báo "không tìm thấy trang tài liệu" giờ là một thông báo trong trang.
- Chữ tải về được chèn dưới dạng node DOM đã làm sạch thay vì qua `innerHTML`.
- Vòng kiểm tra định kỳ tạm dừng khi tab bị ẩn.
- Manifest khai báo `data_collection_permissions: none` cho Firefox, nâng phiên bản Firefox tối thiểu lên 142.

### Đã bỏ

- Các file `.xpi` và `.zip` đóng gói sẵn trong repository. Chúng được đính kèm vào từng GitHub release và tạo bằng `npm run build`.
- `remove-previewBanner.js`, vì selector và observer của nó chỉ là tập con của script chính.
- Nút phiên bản trong trang, vì nó nhắm tới bố cục header mà Studocu không còn dùng. Phiên bản được hiện trong popup.
- `firefox-add.txt`; manifest đã có cài đặt Firefox từ 2.7.0.

## 2.10.0 - 2026-08-14

### Sửa

- Các trang bị khoá bản cao cấp không còn bị dựng lại mà thiếu chữ. Studocu chỉ ký lớp chữ cho những trang được phép đọc; 2.9.0 quay về dùng ảnh nền chỉ có hình vẽ cho các trang còn lại và in ra tờ trắng. Trang bị khoá giờ giữ bản xem trước mờ của Studocu và được gắn nhãn, cả trong trình xem lẫn bản tải xuống.
- Tài liệu mà mọi trang đều bị khoá (`pages: []`) không còn bị nhầm là bản scan và bị làm trắng.
- Bản vá trạng thái mờ không còn xoá metadata của tài liệu trước khi bộ tải trang đọc nó.
- Việc hoán đổi ảnh rõ nét quay về ảnh xem trước gốc thay vì để lại ảnh hỏng khi máy chủ từ chối.
- Đánh số trang không còn tính cả các bản clone của overlay tải xuống.

## 2.9.0 - 2026-07-12

### Sửa

- Trang premium và trang mờ bị trống: tham số ảnh có chữ ký được phân giải tổng quát (`png` hoặc `global`), nên tài liệu scan tải lại được; mọi trang được buộc tải và ảnh nền được chèn cho những trang trình xem đã unmount; sửa lỗi đánh số trang bằng hex và lỗi URL không hợp lệ.
- Tài liệu được mồi khi mở để trang premium tải và hết mờ mà không cần cuộn tay.
- Chữ của trang được khôi phục ở nơi máy chủ phục vụ; luồng tải xuống cũng khớp theo.

## 2.8.0 - 2026-05-23

### Thay đổi

- Viết lại chức năng tải tài liệu. Các trang được chụp dần khi tải, ảnh độ phân giải đầy đủ được dựng lại theo số trang, ảnh được nhúng dưới dạng data URI, và kết quả hiện trong overlay cùng tab với nút Print / Save as PDF.

### Thêm

- Dọn quảng cáo (Refinery89, Google Publisher Tag, Adagio).
- Dọn thanh công cụ "Ask a question" của AI và các nút Mock exam / Summary / Quiz.

## 2.7.0 - 2026-03-14

### Thêm

- Hoán đổi ảnh mờ phía máy chủ bằng tham số CDN có chữ ký; vá React fiber và `__NEXT_DATA__` để trang giữ nguyên trạng thái không mờ qua các lần render lại; xử lý khung trang `.pf` (nhờ bản fork của mrtrkmn).
- Dọn huy hiệu premium, nhãn premium và nút tải xuống gốc của Studocu.
- Logo mới và nút tải xuống được tạo kiểu lại.
- `browser_specific_settings` với gecko id cho Firefox Manifest V3.

## 2.6.0 - 2026-02-21

### Sửa

- Cập nhật selector và cách xoá làm mờ cho cấu trúc Studocu và Studeersnel hiện tại; sửa popup tải xuống; thay logo hỏng bằng SVG nội tuyến; thêm xoá làm mờ theo cuộn cho các trang tải lazy.

## 2.5.0 - 2025-07-13

- Tăng phiên bản và làm mới gói.

## Các bản trước

2.4.1 (2024-04-20), 2.4.0 (2024-03-10), 2.3.0 (2024-02-09), 2.2.0 (2023-08-05), 2.1.0 (2023-07-20), 2.0.0 (2023-07-20) và 1.0.0 (2023-07-19).
