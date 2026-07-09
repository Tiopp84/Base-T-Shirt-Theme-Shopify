 Nguyên Tắc Chung

  Bạn đang sửa Shopify theme theo Horizontal Architecture.

  Yêu cầu bắt buộc:

  - Trước mỗi nhóm sửa, chạy shopify theme check để lấy baseline.
  - Sau mỗi nhóm sửa, chạy lại shopify theme check.
  - Không sửa file ngoài phạm vi nhóm đang làm.
  - Không đổi formatting hàng loạt nếu không cần.
  - Không dùng "target": "section" trong /blocks.
  - Mỗi Theme Block trong /blocks phải có "presets".
  - Sections theo Horizontal nên render block bằng:

  {% content_for 'blocks' %}

  - Nếu block/snippet cần biến như product_form_id, section, block, product, phải tự tính hoặc truyền rõ, không phụ
    thuộc biến local mơ hồ.

  - Liquid không có parentheses và không dùng ternary. Logic nhiều and/or phải viết nested if.

  ———

  Bước 0: Cleanup Theme Check Còn Lại

  Mục tiêu: đưa shopify theme check về 0 warning nếu hợp lý.

  Hiện còn 7 warnings:

  1. layout/password.liquid
      - Warning: scheme_classes undefined.
      - Sửa bằng cách khởi tạo trước khi append:

  {% assign scheme_classes = empty %}

  2. sections/featured-collection.liquid
      - Warning: skip_card_product_styles assigned but unused.
      - Nếu biến không dùng thật, xoá dòng assign.
      - Nếu intended để truyền vào product card, truyền đúng vào render.

  3. sections/main-article.liquid
      - Đổi anchorId thành anchor_id.
      - Đổi toàn bộ references liên quan trong file.

  4. sections/main-list-collections.liquid
      - Đổi moduloResult thành modulo_result.
      - Đổi toàn bộ references liên quan trong file.

  5. sections/main-search.liquid
      - product_settings capture nhưng không dùng.
      - Xác minh không dùng thật thì xoá block capture.
      - Nếu cần dùng, truyền vào snippet/card tương ứng.

  6. snippets/quick-order-product-row.liquid
      - Orphaned snippet.
      - Nếu không được render ở đâu và không còn cần, xoá file.
      - Nếu giữ để backward compatibility, thêm ignore Theme Check có lý do rõ.

  7. snippets/trust-badges.liquid
      - Deprecated orphaned snippet.
      - Vì đã có blocks/trust-badges.liquid, ưu tiên xoá snippet cũ nếu không có reference.

  Sau bước này chạy:

  shopify theme check

  ———

  Bước 1: Chuẩn Hoá Product Page Đã Horizontal

  Mục tiêu: đảm bảo main-product và product blocks hoạt động sạch.

  Kiểm tra:

  - sections/main-product.liquid phải có:

  {% content_for 'blocks' %}

  - Schema của main-product phải có:

  "blocks": [
    {
      "type": "@theme"
    }
  ]

  - Không còn loop/case block kiểu cũ cho product info chính.

  Kiểm tra các block:

  - blocks/product-buy-buttons.liquid
  - blocks/product-variant-picker.liquid
  - blocks/product-quantity-selector.liquid

  Mỗi file cần tự có:

  {%- assign product_form_id = 'product-form-' | append: section.id -%}

  Không phụ thuộc product_form_id assign trong section.

  Kiểm tra popup:

  {% assign popups = section.blocks | where: 'type', 'product-popup' %}

  Không dùng where: 'type', 'popup'.

  Chạy:

  shopify theme check

  ———

  Bước 2: Chuyển featured-product Sang Horizontal

  Phạm vi chỉ sửa:

  - sections/featured-product.liquid
  - blocks cần tái dùng hoặc tạo mới nếu bắt buộc
  - template JSON liên quan nếu cần

  Mục tiêu:

  - Xoá logic product info dạng:

  {% for block in section.blocks %}
    {% case block.type %}

  - Thay vùng product info bằng:

  {% content_for 'blocks' %}

  - Schema section đổi blocks thành:

  "blocks": [
    {
      "type": "@theme"
    }
  ]

  - Nếu featured-product cần context khác main-product, tạo block riêng hoặc đảm bảo block hiện tại chạy được với
    section.settings.product.

  Lưu ý quan trọng:

  Trong featured-product, product có thể đến từ section.settings.product, không phải global product. Nếu dùng product
  blocks hiện tại, cần đảm bảo biến product được assign trước vùng content_for:

  {%- assign product = section.settings.product -%}

  Nếu product blank, giữ logic placeholder/onboarding.

  Không phá các script/style cần thiết cho product form, variant picker, media.

  Chạy:

  shopify theme check

  Kiểm tra thủ công:

  - product title hiện
  - price hiện
  - variant picker hoạt động
  - quantity gắn đúng form
  - buy button submit đúng variant

  ———

  Bước 3: Tách rich-text Sang Theme Blocks

  Phạm vi:

  - sections/rich-text.liquid
  - tạo blocks mới nếu chưa có:
      - blocks/rich-text-heading.liquid
      - blocks/rich-text-caption.liquid
      - blocks/rich-text-text.liquid
      - blocks/rich-text-buttons.liquid

  Mục tiêu section:

  - Section chỉ giữ wrapper/layout/settings cấp section.
  - Vùng nội dung đổi thành:

  <div class="rich-text__blocks {{ section.settings.content_alignment }}">
    {% content_for 'blocks' %}
  </div>

  Schema section:

  "blocks": [
    {
      "type": "@theme"
    }
  ]

  Mỗi block mới:

  - Có {% schema %}
  - Có "presets"
  - Không có "target": "section"
  - Dùng block.settings
  - Dùng block.shopify_attributes
  - Nếu có CSS riêng, dùng {% stylesheet %} trong block hoặc giữ CSS section nếu là layout chung.

  Cập nhật template JSON nếu đang dùng inline block type cũ heading, text, caption, buttons sang type mới.

  Chạy shopify theme check.

  ———

  Bước 4: Tách image-banner Sang Theme Blocks

  Phạm vi:

  - sections/image-banner.liquid
  - tạo blocks:
      - blocks/banner-heading.liquid
      - blocks/banner-text.liquid
      - blocks/banner-buttons.liquid

  Mục tiêu:

  - Section giữ image/background/layout overlay.
  - Nội dung text/buttons render bằng:

  {% content_for 'blocks' %}

  Cẩn thận:

  - Button block có thể có 2 buttons trong cùng block để giữ behavior cũ.
  - Class alignment/box styling đang phụ thuộc section.settings, nên section vẫn giữ container .banner__box.
  - Blocks chỉ render nội dung bên trong box.

  Chạy theme check và kiểm tra homepage nếu template dùng image banner.

  ———

  Bước 5: Tách newsletter Sang Theme Blocks

  Phạm vi:

  - sections/newsletter.liquid
  - tạo blocks:
      - blocks/newsletter-heading.liquid
      - blocks/newsletter-paragraph.liquid
      - blocks/newsletter-form.liquid

  Mục tiêu:

  - Section giữ color scheme, width, padding.
  - Blocks render heading, paragraph, form.
  - Form block giữ {% form 'customer' %} logic.

  Chạy theme check.

  ———

  Bước 6: Tách multicolumn

  Phạm vi:

  - sections/multicolumn.liquid
  - tạo blocks/multicolumn-column.liquid

  Mục tiêu:

  - Section giữ grid/slider wrapper.
  - Mỗi column là Theme Block.
  - Nếu section cần loop để tạo slider controls/count, cân nhắc giữ một phần loop layout. Nếu muốn strict Horizontal,
    block phải tự render column và section chỉ bọc {% content_for 'blocks' %}.

  Lưu ý: đây phức tạp hơn rich-text vì layout grid cần biết số block. Làm sau.

  ———

  Bước 7: Tách slideshow

  Phạm vi:

  - sections/slideshow.liquid
  - tạo blocks/slideshow-slide.liquid

  Cảnh báo: đây là block khó hơn.

  Yêu cầu:

  - Mỗi slide là Theme Block.
  - Section giữ <slideshow-component>, slider controls, autoplay settings.
  - Nếu cần đếm slide, vẫn có thể dùng section.blocks.size cho layout/control, nhưng tránh case block.type.

  Chấp nhận tạm:

  {% for block in section.blocks %}
    {% render block %}
  {% endfor %}

  nếu Shopify chưa hỗ trợ đúng placement bằng content_for trong slider item. Nhưng nếu strict Horizontal thì dùng {%
  content_for 'blocks' %}.

  Chạy theme check và test slider.

  ———

  Bước 8: Header/Footer Để Cuối

  Không làm sớm.

  Lý do:

  - Header/footer có navigation, localization, app blocks, mega menu.
  - Dễ ảnh hưởng UX toàn site.
  - Cần thiết kế block contract riêng.

  Khi làm:

  - Tách announcement item, mega menu item, footer menu, footer text/social/newsletter thành blocks riêng.
  - Giữ app block support @app trong sections app-specific nếu cần.

  ———

  Definition Of Done Cho Mỗi Bước

  Một bước chỉ hoàn tất khi:

  - shopify theme check không tăng warning/error.
  - Không còn JSON invalid.
  - Blocks mới có presets.
  - Không có "target": "section" trong /blocks.
  - Template JSON đã trỏ đúng block type mới.
  - Storefront section vẫn render tương đương trước.
  - Diff nhỏ, dễ review.

  Ưu Tiên Thực Tế

  Làm theo thứ tự này:

  1. Cleanup 7 warnings.
  2. Product page verification.
  3. featured-product.
  4. rich-text.
  5. image-banner.
  6. newsletter.
  7. multicolumn.
  8. slideshow.
  9. collage.
  10. Header/footer/cart/article sau cùng.