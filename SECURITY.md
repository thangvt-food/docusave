# Bảo mật

## Báo cáo lỗ hổng

Vui lòng không mở issue công khai cho vấn đề bảo mật. Hãy dùng tính năng báo cáo riêng tư của GitHub: trên trang repository, mở tab **Security** và chọn **Report a vulnerability**. Bạn sẽ nhận được phản hồi đầu tiên trong vòng một tuần.

## Tiện ích xử lý dữ liệu gì

- Tiện ích chỉ chạy trên `www.studocu.com`, `www.studeersnel.nl`, `www.studocu.vn` và `www.studocu.id`. Nó tải ảnh trang và các mảnh chữ từ `doc-assets.studocu.com` bằng URL có chữ ký nằm trong trang; các request này không gửi kèm thông tin đăng nhập.
- Tiện ích lưu sáu cài đặt dạng boolean trong `chrome.storage.sync`. Không có dữ liệu nào khác được lưu và không có gì được gửi đi.
- Một service worker chạy nền xoá cookie của bốn trang được hỗ trợ khi điều hướng và khi cài đặt. Nó không đọc nội dung trang và không gửi dữ liệu đi đâu.
- Không có mã từ xa và không có phân tích hành vi.

## Nội dung lấy từ mạng

Nơi duy nhất chèn nội dung bên ngoài vào trang là bước tải lớp chữ trong `src/content/pages.js`. Một mảnh `.page` được parse trong một document tách biệt; các phần tử active (`script`, `iframe`, `object`, `embed`, `link`, `style`, thuộc tính `on*`, URL `javascript:`) bị loại bỏ, rồi các node còn lại được đưa vào trang. Nếu bạn tìm được cách vượt qua bộ lọc đó, đó là lỗ hổng bảo mật; hãy báo riêng.

Mọi thứ khác mà tiện ích tạo ra (nút, overlay, popup, nhãn) đều được dựng bằng DOM method từ các chuỗi hằng.
