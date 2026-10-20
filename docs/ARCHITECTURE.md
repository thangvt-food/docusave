# Cách DocuSave hoạt động

Đây là tài liệu tham chiếu cho người muốn sửa `src/content/pages.js` hoặc `download.js`. Nó ghi lại những gì đã được đo trên trang thật, vì phần lớn lỗi trong quá khứ đến từ việc đoán thay vì kiểm chứng.

## Trình xem

Studocu dựng một PDF gốc bằng [pdf2htmlEX](https://github.com/pdf2htmlEX/pdf2htmlEX) ở chế độ chia trang và hiển thị qua một virtual scroller của React:

- Một container `.p2hv` (đồng thời có class `Viewer_page-container__*`) chứa một phần tử `.pf` cho mỗi trang.
- Mỗi `.pf` gồm một ảnh nền (`img.bi`, lớp hình vẽ) và một lớp chữ HTML định vị: các `<span>` thật, chọn được, dùng font `@font-face` tên `ff1`, `ff2`...
- Stylesheet của pdf2htmlEX (font và cách định vị `.p2hv .pc { position: absolute; ... }`) là stylesheet riêng của từng tài liệu trên CDN, được nạp vào `<head>`. Các rule của nó nằm dưới `.p2hv`, nên bất cứ thứ gì tái sử dụng các trang phải giữ class đó trên wrapper.
- Scroller tải asset của một trang khi trang vào vùng nhìn và unmount những trang đã cuộn quá xa. Một trang bị unmount là `.pf` rỗng; một trang chưa từng vào vùng nhìn có thể chứa `<img loading="lazy">` chưa tải, hoặc một thumbnail 140x198.

Hai hành vi đó giải thích vì sao người dùng thấy trang trống: asset không hỏng, chỉ là DOM chưa chứa chúng. Lượt "Tải mọi trang khi mở" trong `pages.js` cuộn qua tài liệu một lần để trình xem tải hết, và bản chụp tải xuống chụp từng trang khi trang đang trong vùng nhìn.

## CDN và các tham số có chữ ký

Asset nằm tại `https://doc-assets.studocu.com/{objectKey}/html/`. Với mỗi trang:

| Asset | Đường dẫn | Cách đánh số | Ghi chú |
| --- | --- | --- | --- |
| Lớp hình vẽ | `bg{n}.png` | hex (`bg12.png` là trang 18) | Đường kẻ, viền bảng, ký hiệu đầu dòng, ô màu. Không có chữ. pdf2htmlEX ghi các file này bằng `%x`. |
| Lớp chữ | `{objectKey}{n}.page` | thập phân (`{objectKey}18.page` là trang 18) | Các `<span>` định vị. Được ký theo từng trang. Đã kiểm tra với request của chính trình xem; trước 2.11.0 tiện ích dựng các file này bằng hex nên việc khôi phục chữ cho trang 10 trở đi âm thầm trả 403. |
| Ảnh xem trước mờ | `pages/blurred/page{n}.webp` | thập phân | Thumbnail nhỏ, hiệu ứng mờ đã nằm trong ảnh. |
| Ảnh raster rõ | `pages/page{n}.webp` | thập phân | Trả 403 trên trang premium. |
| Stylesheet | `{objectKey}.css` | | Font và bố cục. |

Các khóa ký nằm trong `#__NEXT_DATA__` của trang, dưới `props.pageProps.documentAccess.signedQueryParams`; cấu trúc object này thay đổi tùy loại tài liệu:

- **Tài liệu scan / ảnh**: `{ global }`. Một chuỗi wildcard cho phép `/html/*.png`. Ảnh nền chính là nội dung trang. `hasBlurredPages` là false.
- **Tài liệu chữ gốc**: `{ html, css, png, blurredPage, pages }`. `png` là wildcard cho `/html/*.png`. `pages` là một **mảng** `{ pageNumber, signedQueryParams }`, mỗi entry ứng với một trang có chữ mà người đọc được phép xem. Nó không phải chuỗi; từng có lần nối nó vào URL tạo ra request `bg8.png[object Object]`.

`SH.parseDocumentAccess` trong `common.js` chuẩn hóa cả hai dạng. `SH.pickParam` chỉ trả về chuỗi.

## Trang nào có thể khôi phục

Đo trên một tài liệu premium 19 trang vào tháng 8/2026, với một trang **không** nằm trong `pages`:

| Request | Kết quả |
| --- | --- |
| `{objectKey}{n}.page` với mọi tham số client đang có | 403 |
| `pages/page{n}.webp` | 403 |
| `pages/page{n}.png` | 404 |
| `{objectKey}.html` | 200, nhưng chỉ là khung 1 KB gồm các div `.pf` rỗng |
| `previewTextData.text` trong `__NEXT_DATA__` | chỉ bao gồm các trang có trong danh sách |
| `pages/blurred/page{n}.webp` | 200, thumbnail 140x198 |
| `bg{n}.png` | 200, khoảng 9 KB hình vẽ và không có chữ |

Bản ghi CDP của một lần cuộn hết tài liệu cho thấy trình xem không bao giờ yêu cầu file `.page` cho những trang đó; nó chỉ tải thumbnail mờ. Vì vậy chữ của một trang bị khoá bản cao cấp không hề có trên client dưới bất kỳ dạng nào, và không tiện ích nào có thể tạo ra nó.

Quy tắc rút ra:

> Một trang là **premium-locked** khi `Array.isArray(signedQueryParams.pages)` và trang không có entry trong mảng đó. Điều kiện dựa trên sự tồn tại của `pages`, không dựa vào độ dài: `pages: []` nghĩa là mọi trang đều bị khoá, không phải tài liệu scan.

`SH.isTextGated` thực hiện quy tắc này. Nó cố ý không đọc `hasBlurredPages`, vì `pages.patchNextData` ghi lại cờ đó thành `false` trong DOM để ngăn React làm mờ lại; đọc lại sau đó sẽ báo một tài liệu premium là tài liệu miễn phí. Mô hình truy cập được đọc một lần từ JSON gốc trước khi vá và được cache.

Với một trang bị khoá, tiện ích giữ ảnh xem trước mờ của Studocu làm ảnh trang và thêm nhãn `.ds-gated-note`. Nó tuyệt đối không được thay bằng `bg{n}.png`: ảnh đó chỉ có lớp hình vẽ, nên kết quả là một tờ giấy trắng sạch, tệ hơn cả ảnh mờ.

## Tải dữ liệu

Các request ảnh và chữ dùng `credentials: 'omit'`. Máy chủ asset không gửi `Access-Control-Allow-Origin` cho request có thông tin đăng nhập, nên `credentials: 'include'` sẽ hỏng CORS.

Một mảnh `.page` tải về phải đi qua `pages.sanitizePageHtml` trước khi chèn: nó được parse trong một document trơ, các phần tử `script`, `iframe`, `object`, `embed`, `link`, `style` bị bỏ, thuộc tính `on*` và URL `javascript:` bị xoá, rồi các node còn lại được đưa vào trang. Mảnh này chỉ là chữ định vị thông thường, nên không mất nội dung hợp lệ.

## Vòng cập nhật (`main.js`)

Studocu là ứng dụng React và render lại trang khi bạn cuộn, khiến hiệu ứng mờ quay lại. Vì vậy `main.js` chạy các lượt dọn dẹp và xử lý trang:

- một lần lúc bắt đầu, khi `DOMContentLoaded` và khi `load`;
- khi DOM thay đổi (debounce 50 ms), chạy ngay nếu mutation thêm ảnh mờ hoặc class mờ;
- khi cuộn (debounce 100 ms);
- mỗi 2 giây trong 30 giây đầu, sau đó mỗi 5 giây, bỏ qua khi tab bị ẩn.

`patchReactBlurState` đi qua React fiber của từng `.pf` và đặt `isBlurred` cùng `hasBlurredImage` thành `false` trong `memoizedProps`, để lần render lại không gắn lại bộ lọc.

## Tải xuống (`download.js`)

1. Với từng `.pf` theo thứ tự: cuộn vào vùng nhìn, chờ đến khi trang render xong và kích thước ổn định (hoặc hết 4,5 giây), rồi clone trang.
2. Đặt các bản clone vào một div `.p2hv` mới. Chỉ giữ class đó; các class của scroller mang theo bố cục sẽ hỏng khi ra khỏi trình xem.
3. Trỏ ảnh nền của mỗi bản clone vào `bg{n}.png` độ phân giải đầy đủ (hoặc ảnh rõ tương ứng của URL mờ). Trang bị khoá giữ ảnh xem trước mờ và nhận nhãn.
4. Tải mọi ảnh CDN và thay `src` bằng data URI, sáu ảnh một lần.
5. Hiện kết quả trong một overlay cố định cùng tab. Quá trình chụp cố ý chạy cùng tab: tab nền bị làm chậm timer và tạm dừng lazy-load.
6. `body.ds-dl-open` bật các rule in trong `style.css`, ẩn mọi thứ trừ overlay và ngắt trang bằng `break-after: page`. `applyPageSizes` đo từng trang với rule `@media print` của tài liệu được bật tạm thời, rồi phát ra một rule `@page` có tên cho mỗi kích thước khác nhau, để tờ in khớp bố cục thật khi tài liệu được in. Điều này quan trọng vì pdf2htmlEX có kích thước màn hình (`px`) và kích thước in (`pt`) riêng: chỉ đo bố cục màn hình sẽ tạo ra tờ giấy nhỏ hơn và Chrome thu nhỏ toàn bộ trang để vừa. Một rule `@page` không tên luôn được phát kèm, vì Firefox bỏ qua `size` trên named page khi không có rule không tên. Kích thước được làm tròn lên vì chiều cao lẻ sẽ tràn sang một tờ trắng thừa. Người dùng in ra PDF.

Cả quá trình chụp và lượt tự tải đều lưu và khôi phục vị trí người đọc qua `SH.saveScroll` / `SH.restoreScroll`. Trên trang hiện tại, các wrapper của trình xem cao bằng nội dung và cửa sổ mới là phần cuộn, nên `SH.getScroller` chỉ trả về wrapper thực sự bị tràn và nếu không có thì dùng `document.scrollingElement`.

## Cài đặt

Sáu giá trị boolean trong `chrome.storage.sync`, được popup sửa, `common.js` đọc một lần khi trang tải. Các tính năng chỉ dùng CSS được bật/tắt qua thuộc tính trên `<html>` (`data-ds-ads`, `data-ds-ai`, `data-ds-download`) mà các rule trong `style.css` loại trừ, nên tính năng bị tắt không cần đổi stylesheet và tính năng đang bật không bị loé lên.

`enabled` là công tắc chính. `applySettingsToDocument` ghi `data-ds-enabled="off"` và mọi rule tác động lên trang của Studocu đều được chặn bởi `html:not([data-ds-enabled="off"])`; các rule cho overlay tải xuống không bị chặn vì không có gì tạo các phần tử đó khi tiện ích tắt. Khi popup đổi công tắc chính, nó gửi `{ type: 'docusave:reload' }` tới tab đang hoạt động và content script tải lại trang, qua đó gỡ các observer và trả trang về nguyên bản ở lần tải tiếp theo.

Script nền (`src/background.js`) xoá cookie của mọi trang được hỗ trợ (`chrome.cookies`, host permission cho `*.studocu.com`, `*.studeersnel.nl`, `*.studocu.vn` và `*.studocu.id`) mỗi khi một tab điều hướng tới một trong các trang đó, và một lần khi cài đặt. Việc này độc lập với công tắc chính: Studocu giới hạn tần suất người đọc tự động bằng trang "Access Blocked" tồn tại cho đến khi cookie của trang bị xoá, nên mỗi lần truy cập bắt đầu sạch, đổi lại người đọc bị đăng xuất khỏi Studocu. Cả `background.service_worker` và `background.scripts` cùng trỏ tới một file để Chrome và Firefox dùng môi trường nền mà mỗi bên hỗ trợ.

## Kiểm thử

`npm test` chạy `node --test` với jsdom. `test/fixtures/documents.mjs` dựng một trang tài liệu cho mỗi dạng trong bốn dạng (chữ có khoảng trống, mở toàn bộ, khoá toàn bộ, scan) với các trang ở bất kỳ trạng thái nào trình xem thật có thể để lại (chữ đã render, ảnh mờ, placeholder rỗng). Không có gì chạm tới mạng: ảnh không bao giờ tải và `fetch` sẽ lỗi trừ khi test tự cấp dữ liệu, nên các assertion chỉ kiểm tra nhánh nào đã chạy.

Việc kiểm thử trên trang thật là có thể nhưng hiếm. Sau vài lần tải tự động, Studocu trả trang "Access Blocked" không có `#__NEXT_DATA__`; xoá cookie (hoặc tải lại trang, vì script nền đã xoá cookie) và mở tab mới sẽ vượt qua. Cửa sổ không hiển thị sẽ làm chậm `IntersectionObserver`, khiến scroller ẩn mọi trang, nên hãy đưa cửa sổ ra trước khi cuộn hoặc chụp màn hình.

## Selector nằm ở hai nơi

`style.css` ẩn các khối mời nâng cấp, quảng cáo và thanh công cụ AI trước khi script chạy, còn `SH.SELECTORS` trong `common.js` xoá các phần tử tương tự khi React mount lại. Khi Studocu đổi tên class, hãy cập nhật cả hai. Bộ test kiểm tra mọi selector trong `SH.SELECTORS` đều là CSS hợp lệ.

Có một ngoại lệ chỉ nằm trong `style.css`: hộp đăng nhập mà Studocu hiện với người đọc bị đánh dấu là bot (`isAntiBotAuthWallEligible` trong `#__NEXT_DATA__`). Đó là một Modal không có nút đóng, được portal vào `#main-wrapper`, đồng thời khoá cuộn `<html>` (và `<body>` trên Android) bằng style nội tuyến. Các rule khớp với `dialog[class*="AuthWall"]` đang mở mà không có class `hideable` (class Modal thêm vào khi có thể đóng), ẩn overlay của nó bằng `:has()`, và ghi đè khoá cuộn bằng `!important`. Overlay là một node portal của React, nên nó bị ẩn chứ không bị xoá: xoá nó sẽ làm React ném lỗi khi unmount. `test/style.test.mjs` nạp stylesheet vào một fixture của hộp này để kiểm tra những declaration nào được áp dụng. Sau đủ số lần tải tự động, trang thật bắt đầu trả hộp này cho trình duyệt test, là một cách thuận tiện để xem nó.
