# Release Clean Install và Store Data Sanitization

Tài liệu này là checklist bắt buộc trước khi đóng gói, chuyển giao hoặc phát hành theme cho một Shopify store khác.

Mục tiêu là bảo đảm theme cài được trên một store hoàn toàn mới mà không phụ thuộc vào ảnh, collection, page, menu, product, thương hiệu hoặc dữ liệu của store dùng để phát triển theme.

> Trạng thái hiện tại: **chưa thực hiện sanitization**. Các checkbox trong tài liệu chỉ được đánh dấu sau khi thay đổi đã được kiểm tra trên development store trống.

## 1. Tiêu chí hoàn thành

Theme chỉ được xem là clean-install ready khi đáp ứng tất cả điều kiện sau:

- [ ] Không còn `shopify://shop_images/...` thuộc store phát triển trong file phát hành.
- [ ] Không còn collection, product, page hoặc menu handle chỉ tồn tại trên store phát triển.
- [ ] Không còn tên thương hiệu `Sund84` hoặc nội dung mô tả riêng của store phát triển.
- [ ] Các setting resource bị trống đều có fallback hợp lệ hoặc component tự ẩn.
- [ ] Không có nút hoặc card render với URL trống.
- [ ] Không có ảnh vỡ, link 404 hoặc resource unavailable trên store mới.
- [ ] Homepage vẫn có bố cục onboarding rõ ràng khi chưa được cấu hình.
- [ ] Header, footer, product, collection, cart, search và customer pages vẫn sử dụng được.
- [ ] Merchant có thể cấu hình lại toàn bộ resource từ Theme Editor.
- [ ] `shopify theme check` hoàn thành với zero offenses.
- [ ] Theme đã được smoke test trên một development store trống.

## 2. Vì sao công việc này cần thực hiện

Shopify Theme Editor lưu resource của store vào các file JSON dưới dạng:

```json
"image": "shopify://shop_images/ao-khoac.webp"
```

```json
"collection": "everyday-essentials"
```

Các giá trị này hợp lệ trên store nguồn nhưng không được đóng gói cùng code theme. Khi theme được cài trên store khác, resource tương ứng thường không tồn tại.

`shopify theme check` chỉ kiểm tra cú pháp và quy tắc theme. Công cụ này không xác minh một file trong Shopify Files hoặc một collection handle có tồn tại trên store đích hay không.

## 3. Nguyên tắc triển khai an toàn

### 3.1. Không sanitize trực tiếp theme production đang hoạt động

Việc xóa resource trong JSON có thể làm homepage, header, favicon và cart drawer của store nguồn mất nội dung sau lần push tiếp theo.

Trước khi chỉnh sửa:

- [ ] Xác nhận nhánh hiện tại không được deploy trực tiếp lên storefront production.
- [ ] Tạo tag hoặc commit lưu cấu hình demo hiện tại.
- [ ] Download một bản backup theme từ Shopify Admin.
- [ ] Ghi lại development theme ID và production theme ID.
- [ ] Thực hiện sanitization trên nhánh release hoặc một bản sao theme riêng.

### 3.2. Tách code theme và demo data

Theme release chỉ nên chứa:

- Liquid, CSS, JavaScript và locale production.
- Schema và template structure.
- Nội dung mặc định trung tính.
- Shopify placeholder hoặc fallback an toàn.

Demo store quản lý riêng:

- Product và variant.
- Collection.
- Menu.
- Page.
- Ảnh upload trong Shopify Files.
- Tên thương hiệu và social link.
- Nội dung marketing của Sund84.

Không dùng `settings_data.json` lấy trực tiếp từ demo store làm cấu hình phát hành mà chưa sanitize.

## 4. Kiểm kê resource trước khi sửa

Chạy các lệnh sau từ thư mục gốc của theme:

```powershell
rg -n "shopify://shop_images" config templates sections
rg -n "shopify://collections|shopify://products|shopify://pages" config templates sections
rg -n -i "Sund84|new-arrivals|outerwear|everyday-essentials|denim|shirts" config templates sections
```

Kiểm tra thêm các loại resource có thể không chứa URI đầy đủ:

```powershell
rg -n '"(collection|product|page|menu)"\s*:\s*"[^" ]+"' config templates sections
```

Lưu kết quả kiểm kê trong pull request hoặc release ticket. Mỗi kết quả phải được phân loại:

1. Resource store-specific cần xóa.
2. Resource hệ thống dùng được trên mọi store.
3. Nội dung trung tính được chủ động giữ lại.

## 5. Làm sạch homepage

File: [`templates/index.json`](templates/index.json)

### 5.1. Hero

- [ ] Đặt `hero.settings.image` thành chuỗi rỗng.
- [ ] Đặt `hero.settings.image_2` thành chuỗi rỗng nếu có.
- [ ] Xóa link tới `new-arrivals`.
- [ ] Giữ CTA nhưng để link trống chỉ khi block tự ẩn hoặc hiển thị trạng thái disabled hợp lệ.
- [ ] Nếu cần CTA hoạt động ngay trên clean install, dùng URL chung đã được xác minh như `/collections/all`.
- [ ] Giữ heading và mô tả ở dạng nội dung thời trang trung tính, không chứa tên store.

Ví dụ mục tiêu:

```json
"image": "",
"button_link_1": ""
```

### 5.2. Collection tiles

Với từng block trong `collection_tiles.blocks`:

- [ ] Đặt `collection` thành chuỗi rỗng.
- [ ] Đặt `image` thành chuỗi rỗng.
- [ ] Đặt `link` thành chuỗi rỗng.
- [ ] Kiểm tra heading không nhắc tới collection chỉ có trên demo store.
- [ ] Kiểm tra card fallback về `routes.collections_url`.
- [ ] Kiểm tra placeholder SVG có đúng tỷ lệ và không gây layout shift.

Trạng thái sạch mẫu:

```json
"collection": "",
"image": "",
"link": ""
```

Section hiện đã có fallback ảnh và URL tại [`sections/collection-tiles.liquid`](sections/collection-tiles.liquid). Không được xóa fallback này khi sanitize.

### 5.3. Featured collection

- [ ] Đặt `featured_collection.settings.collection` thành chuỗi rỗng.
- [ ] Giữ title và description trung tính.
- [ ] Kiểm tra section render product placeholder khi collection trống.
- [ ] Kiểm tra nút View all không render khi collection trống.
- [ ] Kiểm tra quick add không xuất hiện trên placeholder product.

Section hiện có onboarding product cards tại [`sections/featured-collection.liquid`](sections/featured-collection.liquid).

### 5.4. Rich text và newsletter

- [ ] Xóa link tới `everyday-essentials` hoặc thay bằng URL chung đã được xác minh.
- [ ] Thay nội dung `Sund84 studio` bằng copy trung tính.
- [ ] Không hardcode tên thương hiệu khác để thay thế.
- [ ] Kiểm tra button block không render link rỗng như một anchor có thể focus.

Copy trung tính gợi ý:

```html
<p>Sign up for new arrivals, seasonal edits and thoughtful stories.</p>
```

## 6. Làm sạch header và announcement bar

File: [`sections/header-group.json`](sections/header-group.json)

### 6.1. Announcement bar

- [ ] Xóa link `shopify://collections/new-arrivals`.
- [ ] Giữ nội dung announcement trung tính hoặc để merchant tự nhập.
- [ ] Kiểm tra announcement không render anchor khi link trống.

### 6.2. Discovery cards

Bản clean install nên tắt discovery cards mặc định:

```json
"show_discovery_cards": false,
"menu_card_collections": [],
"menu_card_1_image": "",
"menu_card_1_title": "",
"menu_card_1_link": "",
"menu_card_2_image": "",
"menu_card_2_title": "",
"menu_card_2_link": "",
"menu_card_3_image": "",
"menu_card_3_title": "",
"menu_card_3_link": ""
```

Checklist:

- [ ] Xóa `summers-collection.jpg`.
- [ ] Xóa `example.jpg`.
- [ ] Xóa link `new-arrivals`.
- [ ] Xóa link `outerwear`.
- [ ] Xóa title card demo.
- [ ] Kiểm tra desktop mega menu.
- [ ] Kiểm tra mobile header drawer.
- [ ] Bật lại discovery cards trong Theme Editor và xác nhận merchant có thể chọn collection mới.

## 7. Làm sạch global theme settings

File: [`config/settings_data.json`](config/settings_data.json)

Chỉ sanitize object `current` dùng cho bản release. Không thay đổi ID setting trong `settings_schema.json`.

Giá trị mục tiêu:

```json
"favicon": "",
"brand_headline": "",
"brand_description": "<p></p>",
"cart_drawer_collection": ""
```

Checklist:

- [ ] Xóa favicon `example.jpg`.
- [ ] Xóa `brand_headline` chứa `Sund84`.
- [ ] Xóa mô tả thương hiệu demo.
- [ ] Xóa `cart_drawer_collection` chứa `new-arrivals`.
- [ ] Rà tất cả social URL và xóa account của store nguồn.
- [ ] Rà logo, favicon, brand image và custom image setting khác.
- [ ] Giữ nguyên design tokens: font, color schemes, spacing, radius, card style và animation.
- [ ] Không format hoặc rewrite toàn bộ `settings_data.json` nếu không cần thiết.

## 8. Fallback bắt buộc trong code

Sanitization chỉ an toàn khi resource trống được xử lý rõ ràng.

### 8.1. Footer brand

File: [`blocks/footer-brand-information.liquid`](blocks/footer-brand-information.liquid)

- [ ] Dùng `shop.name` khi `settings.brand_headline` trống.
- [ ] Escape giá trị heading trước khi render.
- [ ] Chỉ render description khi merchant đã nhập.

Mẫu triển khai:

```liquid
{%- assign brand_heading = settings.brand_headline | default: shop.name -%}

{%- if brand_heading != blank -%}
  <h2 class="footer-block__heading rte">
    {{ brand_heading | escape }}
  </h2>
{%- endif -%}
```

### 8.2. Image settings

- [ ] Image banner dùng placeholder khi không có ảnh.
- [ ] Collection tiles dùng placeholder khi không có ảnh hoặc collection image.
- [ ] Mọi `image_tag` chỉ chạy sau kiểm tra `image != blank`.
- [ ] Placeholder có aspect ratio ổn định để tránh CLS.

### 8.3. Collection và product settings

- [ ] Featured collection render onboarding cards khi collection trống.
- [ ] Related products không render khi không có product context.
- [ ] Collection tile có URL fallback hợp lệ.
- [ ] Cart drawer không render collection card khi setting trống.
- [ ] Không gọi `.url`, `.title` hoặc `.featured_image` mà không có điều kiện phù hợp.

### 8.4. Link và button settings

Rà các block sau:

- [`blocks/banner-buttons.liquid`](blocks/banner-buttons.liquid)
- [`blocks/rich-text-buttons.liquid`](blocks/rich-text-buttons.liquid)
- [`blocks/image-with-text-button.liquid`](blocks/image-with-text-button.liquid)
- [`blocks/slideshow-slide.liquid`](blocks/slideshow-slide.liquid)

Yêu cầu:

- [ ] Không render anchor focusable khi URL trống.
- [ ] Không dùng `href="#"` làm fallback.
- [ ] Nếu merchant chỉ nhập label nhưng chưa nhập URL, Theme Editor phải có hành vi dễ hiểu.
- [ ] CTA trống không tạo khoảng trắng thừa.

## 9. Nội dung và internationalization

- [ ] Xóa tên Sund84 khỏi storefront defaults.
- [ ] Xóa nội dung hướng dẫn kiểu “Use this section...” khỏi template production.
- [ ] Không hardcode tiếng Việt hoặc tiếng Anh trực tiếp trong Liquid.
- [ ] Static storefront copy phải dùng locale key.
- [ ] Nội dung template merchant-editable phải trung tính và có thể thay trong Theme Editor.
- [ ] Cập nhật tối thiểu `locales/en.default.json` và `locales/en.default.schema.json` khi thêm key.
- [ ] Đồng bộ `locales/vi.json` và `locales/vi.schema.json` cho các tính năng được hỗ trợ bằng tiếng Việt.

## 10. Không thay store resource bằng remote dependency

Không giải quyết clean install bằng cách chuyển ảnh sang URL ngẫu nhiên từ Unsplash, Pexels hoặc public CDN.

- [ ] Không có remote runtime CSS/JavaScript.
- [ ] Không dùng hotlink ảnh bên thứ ba trong template mặc định.
- [ ] Nếu theme thực sự cần ảnh mặc định, asset phải có quyền sử dụng rõ ràng và được đóng gói trong `assets/`.
- [ ] Ưu tiên Shopify placeholder SVG cho trạng thái onboarding.
- [ ] Ảnh demo chỉ được upload vào demo store.

## 11. Kiểm tra tự động trước release

### 11.1. Store-specific references

```powershell
$patterns = @(
  'shopify://shop_images',
  'Sund84',
  'new-arrivals',
  'outerwear',
  'everyday-essentials'
)

foreach ($pattern in $patterns) {
  rg -n -i $pattern config templates sections
}
```

Mỗi kết quả còn lại phải được review và ghi lý do giữ lại.

### 11.2. Production noise

```powershell
rg -n "console\.log|debugger|alert\(" assets blocks layout sections snippets
rg -n "https?://" assets blocks layout sections snippets
```

URL hợp lệ như Shopify CDN, schema.org, YouTube hoặc Vimeo embed phải được review theo ngữ cảnh. Không tự động xóa mọi URL.

### 11.3. Theme validation

```powershell
shopify theme check
```

Release gate:

- [ ] Zero errors.
- [ ] Zero unapproved warnings.
- [ ] Không có schema JSON lỗi.
- [ ] Không có remote production asset ngoài danh sách đã phê duyệt.

## 12. Smoke test trên development store trống

Tạo hoặc sử dụng một development store không có dữ liệu demo, sau đó upload đúng package dự định phát hành.

### Homepage

- [ ] Hero không có ảnh vỡ.
- [ ] Text hero đọc được trên placeholder/background mặc định.
- [ ] CTA không dẫn tới 404.
- [ ] Collection tiles có placeholder cân đối.
- [ ] Featured collection có onboarding cards ổn định.
- [ ] Newsletter hoạt động.

### Header và footer

- [ ] Main menu hoạt động khi merchant chọn menu.
- [ ] Header không hiện discovery card rỗng.
- [ ] Mobile drawer không có card/link demo.
- [ ] Footer dùng `shop.name`.
- [ ] Không còn Sund84 hoặc social URL của store nguồn.

### Product và collection

- [ ] Product template render sau khi tạo một product mới.
- [ ] Variant picker, quantity và buy buttons hoạt động.
- [ ] Collection template render sau khi tạo một collection mới.
- [ ] Filter và sort hoạt động.
- [ ] Quick add không phụ thuộc product demo.

### Cart và search

- [ ] Cart drawer mở được khi cart trống.
- [ ] Cart drawer không render collection card rỗng.
- [ ] Add to cart và remove item hoạt động.
- [ ] Search page hoạt động khi store có và chưa có kết quả.

### Content và customer templates

- [ ] Page, contact, FAQ, blog và article render được.
- [ ] Login, register, account, addresses và order templates không lỗi.
- [ ] Password template không chứa tên hoặc ảnh demo.

### Theme Editor

- [ ] Add, remove và reorder section hoạt động.
- [ ] Add, remove và reorder Theme Block hoạt động.
- [ ] Merchant có thể chọn ảnh, collection, product, page và menu mới.
- [ ] Section reload không tạo lỗi JavaScript.
- [ ] Không có setting hiển thị resource unavailable từ store nguồn.

## 13. Đóng gói release

Trước khi tạo ZIP hoặc publish:

- [ ] Working tree chỉ chứa thay đổi thuộc release.
- [ ] Không đưa CSV product demo vào package theme.
- [ ] Không đưa file backup hoặc export của store vào package.
- [ ] Xác nhận `settings_data.json` là bản sanitized.
- [ ] Xác nhận JSON templates là bản sanitized.
- [ ] Chạy Theme Check lần cuối.
- [ ] Ghi kết quả smoke test vào release notes hoặc PR.
- [ ] Tạo tag release sau khi tất cả release gate hoàn thành.

## 14. Khôi phục demo store sau release

Không copy ngược toàn bộ `settings_data.json` từ demo store vào nhánh release.

Nếu cần cập nhật demo:

1. Deploy code release sạch lên một theme chưa publish trong demo store.
2. Cấu hình ảnh, collection, menu và nội dung bằng Theme Editor.
3. Không merge resource reference của demo store trở lại nhánh release.
4. Nếu cần lưu demo configuration, giữ ở nhánh hoặc artifact riêng có ghi rõ `demo-only`.

## 15. Definition of Done

Nhiệm vụ này chỉ hoàn thành khi:

- [ ] Inventory store-specific references đã được review.
- [ ] `index.json`, `header-group.json` và `settings_data.json` đã được sanitize.
- [ ] Footer và các CTA có fallback an toàn.
- [ ] Không còn store branding hoặc store resource trong release package.
- [ ] Theme Check sạch.
- [ ] Clean-install smoke test hoàn thành trên development store trống.
- [ ] Demo configuration đã được tách khỏi release configuration.
- [ ] Kết quả kiểm tra được ghi lại trong pull request hoặc release notes.

