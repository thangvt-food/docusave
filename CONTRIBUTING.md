# Đóng góp

Cảm ơn bạn đã giúp DocuSave tiếp tục hoạt động. Phần lớn đóng góp thuộc một trong ba loại: một selector mà Studocu vừa đổi tên, một trang hiển thị trống hoặc bị mờ dù đáng lẽ không nên, hoặc một tính năng mới. Tài liệu này hướng dẫn cách xử lý từng loại.

## Thiết lập

Bạn cần Node.js 20 trở lên.

```
git clone https://github.com/thangvt-food/docusave.git
cd docusave
npm install
npm test
```

Nạp thư mục `src/` làm tiện ích chưa đóng gói trong Chrome (`chrome://extensions`, bật Developer mode, chọn Load unpacked) để chạy bản đang sửa. Sau khi sửa file, bấm biểu tượng tải lại trên thẻ tiện ích rồi tải lại tab Studocu. Trên Firefox, dùng `about:debugging`, mục This Firefox, Load Temporary Add-on và chọn `src/manifest.json`, hoặc chạy `npm run start:firefox`.

## Các file chính

| Đường dẫn | Nội dung |
| --- | --- |
| `src/content/common.js` | Namespace `DocuSave` dùng chung: danh sách selector, mô hình truy cập tài liệu (trang nào CDN sẽ phục vụ), hàm dựng URL, cài đặt. |
| `src/content/cleanup.js` | Dọn banner, huy hiệu, nút "Nâng cấp", phần gợi ý, nút tải xuống gốc của Studocu; thay logo. |
| `src/content/pages.js` | Xoá làm mờ, buộc các trang lazy tải, lấy lớp chữ, gắn nhãn trang bị khoá bản cao cấp. |
| `src/content/download.js` | Nút tải xuống và overlay in. |
| `src/content/main.js` | Kết nối mọi thứ với thay đổi DOM, sự kiện cuộn và vòng quét định kỳ. Không phần nào tự chạy nếu không được gọi. |
| `src/content/style.css` | Nạp trước khi script chạy. Ẩn các khối mời nâng cấp, quảng cáo và thanh công cụ AI bằng CSS tĩnh. |
| `src/popup/` | Popup trên thanh công cụ để sửa cài đặt. |
| `test/` | Các bộ test `node --test`. `test/fixtures/documents.mjs` tạo bốn dạng tài liệu mà tiện ích phải phân biệt. |
| `docs/ARCHITECTURE.md` | Cách Studocu phục vụ các trang và lý do một số trang không thể mở. Đọc file này trước khi sửa `pages.js`. |
| `site/` | Trang dự án, <https://thangvt-food.github.io/docusave/>. HTML và CSS thuần, được `.github/workflows/pages.yml` xuất bản nguyên trạng mỗi khi push lên `main` có thay đổi trong `site/`. Font là các bản subset nằm trong repo, tạo bằng `scripts/fetch-fonts.sh`; `test/site.test.mjs` kiểm tra các tham chiếu file cục bộ và token dark mode. |

## Sửa selector bị hỏng

Studocu dùng CSS modules, nên class có dạng `PremiumBannerBlobWrapper_abc12` và phần hash đổi sau mỗi lần triển khai. Vì vậy selector phải khớp theo một phần ổn định của class bằng `[class*="..."]`.

1. Mở trang tài liệu, chuột phải vào phần tử vừa quay lại, chọn Inspect, rồi tìm một phần ổn định trong tên class hoặc thuộc tính `data-test-selector`.
2. Thêm selector vào **cả hai** nơi: danh sách trong `SH.SELECTORS` ở `src/content/common.js` (để script xoá lại khi React mount lại) và rule tương ứng trong `src/content/style.css` (để phần tử không loé lên trước khi script chạy). Quảng cáo và thanh công cụ AI chỉ dùng CSS; đặt chúng trong các block `html:not([data-ds-...])` để công tắc trong popup vẫn hoạt động.
3. Chạy `npm test`. Có một test kiểm tra mọi selector đều là CSS hợp lệ.
4. Trong pull request, ghi rõ trang nào (studocu.com, studeersnel.nl, studocu.vn, studocu.id) và loại trang bạn gặp lỗi.

## Sửa trang trống hoặc bị mờ

Trước tiên hãy đọc `docs/ARCHITECTURE.md`. Tóm tắt: một trang hoặc có thể khôi phục (lớp chữ của nó nằm trong các tham số đã ký), hoặc bị khoá bản cao cấp (không có, và không có gì trình duyệt tải được chứa chữ của trang đó). Tiện ích không bao giờ được thay một trang bị khoá bằng ảnh nền chỉ có hình vẽ, vì như vậy sẽ in ra một tờ giấy trắng sạch. Pull request "sửa" hiện tượng mờ trên trang bị khoá bằng cách hoán đổi ảnh đó sẽ bị đóng; xem các test cho trang bị khoá và `docs/ARCHITECTURE.md` để hiểu lý do.

Khi báo cáo hoặc sửa lỗi trang, hãy kèm các dòng trong console trình duyệt bắt đầu bằng `DocuSave:`. Chúng cho biết trang nào đã khôi phục và trang nào bị khoá.

Thêm một fixture test trong `test/pages.test.mjs` cho dạng tài liệu bạn đang sửa. Fixture không cần mạng; hãy kiểm tra nhánh nào đã chạy (nhãn được thêm, có thử tải chữ, có bắt đầu chèn ảnh).

## Thêm tính năng

Hãy mở issue trước nếu tính năng thay đổi cách tiện ích tác động lên trang. Giữ tiện ích không có dependency lúc chạy: content script là các script thuần, nạp theo thứ tự trong manifest, và mọi thứ dùng chung đi qua namespace `DocuSave` trong `common.js`. Hành vi mới mà một số người có thể không muốn nên có công tắc trong popup (xem `DEFAULT_SETTINGS` trong `common.js`, `applySettingsToDocument` và `src/popup/`).

## Pull request

- Chạy `npm run check` (lint, test, build) trước khi push.
- Giữ thay đổi tập trung. Một bản sửa selector và một tính năng mới nên nằm trong các pull request riêng.
- Không commit file build. Bản phát hành được workflow tạo từ tag.
- Mô tả cách bạn đã kiểm tra: trình duyệt, trang, loại tài liệu (PDF gốc hay bản scan), và tài liệu có trang bị khoá hay không.
- Thêm một mục dưới "Chưa phát hành" trong `CHANGELOG.md`.

## Phong cách mã nguồn

ES2020 thuần, chạy không cần bundler trên Chrome và Firefox hiện tại. Thụt lề bốn dấu cách (xem `.editorconfig`). Ưu tiên `textContent` và `createElement` thay vì `innerHTML`; HTML duy nhất mà tiện ích chèn từ bên ngoài là một mảnh trang từ CDN, và nó phải đi qua `sanitizePageHtml` trước. Mọi `console.log` phải đi qua `SH.log` để người dùng lọc được theo tiền tố `DocuSave:`.

## Phát hành (người duy trì)

1. Tăng `version` trong `src/manifest.json` và `package.json`.
2. Chuyển các mục "Chưa phát hành" trong `CHANGELOG.md` xuống một tiêu đề `## X.Y.Z - YYYY-MM-DD` mới.
3. Commit, sau đó tạo tag và push:

   ```
   git tag vX.Y.Z
   git push origin main vX.Y.Z
   ```

4. Workflow phát hành sẽ chạy lint, test, build `dist/docusave-vX.Y.Z.zip`, rồi tạo GitHub release với phần changelog tương ứng làm nội dung. Bản phát hành chỉ có file zip, không kèm `.xpi`.
