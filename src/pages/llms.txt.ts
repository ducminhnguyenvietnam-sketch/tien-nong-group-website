import type { APIRoute } from 'astro';
import site from '../content/site.json';

/**
 * /llms.txt — a plain summary of Tiến Nông for AI assistants and AI search (ChatGPT, Claude, Gemini,
 * Perplexity…), following the llms.txt convention: who the company is, verified figures and the pages to
 * read. Figures are the ones published on this website (the source of truth); no financial data.
 */
export const GET: APIRoute = ({ site: origin }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const u = (p: string) => (origin ? new URL(`${base}${p}`, origin).href : `${base}${p}`);
  const c = site.company;
  const body = `# Tiến Nông Group

> Công ty Cổ phần Công Nông nghiệp Tiến Nông (Tiến Nông Group) — doanh nghiệp Khoa học & Công nghệ đầu tiên trong lĩnh vực dinh dưỡng cây trồng tại Việt Nam (Giấy chứng nhận số 228/DNKHCN, cấp năm 2014). Thành lập ngày 04/01/1995 tại Thanh Hóa. Sản xuất phân bón NPK, phân bón hữu cơ, phân bón chuyên dùng theo cây trồng và phân bón công nghệ cao. Thông điệp: "Hơn 30 năm Khoa học công nghệ Phụng sự nhà nông".

## Thông tin chính

- Tên pháp lý: ${c.name}
- Mã số doanh nghiệp: 2800142141
- Trụ sở: ${c.address}
- Tổng đài: ${c.phone} · Email: ${c.email}
- Sứ mệnh: Phụng sự để nông dân giàu có cùng Việt Nam thịnh vượng
- Tầm nhìn: Doanh nghiệp sáng tạo dẫn đầu trong lĩnh vực dinh dưỡng cây trồng tại Việt Nam
- Mục tiêu: Phục vụ 1 triệu hộ nông dân Việt Nam

## Số liệu

- Hơn 30 năm phát triển
- 300.000+ hộ nông dân tin dùng
- 10.000 điểm bán trên toàn quốc, 200+ nhà phân phối, hệ thống phân phối tại 34 tỉnh, thành
- 3 nhà máy (Bỉm Sơn – Thanh Hóa, Tiến Nông 3 – Thanh Hóa, Gia Lai), tổng công suất 650.000 tấn/năm, vận hành theo ISO 9001:2015 và ISO 14001:2015
- Bạn hàng tại hơn 10 quốc gia
- 50+ nhà khoa học & kỹ sư; 10+ đề tài nghiên cứu mỗi năm; 10.000+ mẫu phân tích mỗi năm
- Trung tâm Nghiên cứu Phát triển KH&CN (từ 2012); phòng thí nghiệm VILAS 1519 (ISO/IEC 17025:2017) và VALAS 262

## Ghi nhận

- Huân chương Lao động hạng Ba; Bằng khen của Thủ tướng Chính phủ
- 6 lần Sao Vàng Đất Việt; Thương hiệu Vàng Nông nghiệp Việt Nam 2023 · 2024 · 2025
- Top 10 Thương hiệu mạnh ASEAN (2024)

## Dòng sản phẩm

- Phân bón chuyên dùng (lúa, ngô, mía, cà phê, chè, dứa, lạc, sắn, rau màu, cây ăn quả, cây lâm nghiệp)
- Phân bón đa dụng (NPK)
- Phân bón hữu cơ, hữu cơ vi sinh, hữu cơ khoáng
- Phân bón công nghệ cao (bổ sung Silic hữu hiệu, trung – vi lượng)

## Trang nên đọc

- [Về Tiến Nông](${u('/ve-tien-nong/')}): lịch sử từ 1995, ban lãnh đạo, thành tựu
- [Sản phẩm](${u('/san-pham/')}): toàn bộ danh mục, thành phần và cách dùng từng sản phẩm
- [Giải pháp theo cây trồng](${u('/giai-phap/')}): quy trình bón phân và hỏi đáp kỹ thuật
- [Giải pháp cho dự án](${u('/giai-phap-du-an/')}): trang trại, hợp tác xã, vùng nguyên liệu
- [Khoa học & Công nghệ](${u('/khoa-hoc-cong-nghe/')}): trung tâm R&D, phòng thí nghiệm, kết quả nghiên cứu
- [Nông dân Tiến Nông](${u('/nong-dan/')}): kỹ sư đồng hành, phân bón trả chậm qua Hội Nông dân
- [Phát triển bền vững](${u('/phat-trien-ben-vung/')}): đất khỏe, nhà máy xanh, cộng đồng
- [Trở thành đối tác](${u('/tro-thanh-doi-tac/')}): làm đại lý, nhà phân phối, liên hệ phụ trách từng khu vực
- [Liên hệ](${u('/lien-he/')}): tư vấn kỹ thuật, mua hàng, tìm đại lý
- [Tin tức và báo chí](${u('/tin-tuc/')})

## English summary

Tien Nong Group (Tien Nong Industrial & Agricultural JSC), founded in 1995 in Thanh Hoa, Vietnam, is the first science and technology enterprise in plant nutrition in Vietnam. It makes NPK, organic and crop-specific fertilisers in 3 factories with a total capacity of 650,000 tonnes a year, sells through 10,000 retail points in 34 provinces, and trades with partners in more than 10 countries. English site: ${u('/en/')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
