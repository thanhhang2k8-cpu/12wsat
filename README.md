# 12WSAT

Web luyện SAT nội bộ, mời riêng — không có trang đăng ký công khai. Repo này
đang ở **Phase 2**: Phase 1 (tài khoản, thiết bị, session) cộng luồng nội dung
đề thi cho admin — upload PDF/DOCX/ảnh → AI (Claude) quét thành câu hỏi có cấu
trúc → editor 2 cột duyệt/sửa → publish → giao đề. Màn hình làm bài cho học
viên (timer, adaptive, chấm điểm) là Phase 3.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- PostgreSQL + Prisma (driver adapter `@prisma/adapter-pg`)
- Auth tự viết: session cookie `HttpOnly`, mật khẩu hash bằng Argon2id
  (`@node-rs/argon2`) — không magic link, không OAuth
- AI quét đề: Anthropic API (`@anthropic-ai/sdk`), structured output theo Zod schema
- File storage: trừu tượng hoá qua `src/lib/storage.ts` — local disk khi dev,
  S3-compatible (Supabase Storage / Cloudflare R2) khi đặt `STORAGE_DRIVER=s3`

## Cài đặt

```bash
npm install
cp .env.example .env   # rồi điền DATABASE_URL, SESSION_SECRET, SEED_ADMIN_*
npx prisma migrate dev
npm run seed
npm run dev
```

Mở http://localhost:3000 — sẽ được đưa thẳng tới `/login`.

## Biến môi trường (`.env`)

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối Postgres (Supabase, Neon, hoặc Postgres local đều dùng được) |
| `SESSION_SECRET` | Khoá bí mật để băm session token. Sinh bằng `openssl rand -hex 32`. Đổi khoá này sẽ vô hiệu hoá toàn bộ session đang mở |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Chỉ dùng bởi `npm run seed` để tạo tài khoản admin đầu tiên |
| `ANTHROPIC_API_KEY` | Khoá gọi Claude để quét đề. **Không đặt** → app tự chuyển sang chế độ mock (xem bên dưới), không lỗi |
| `ANTHROPIC_MODEL` | Model dùng để quét đề. Mặc định `claude-opus-5` |
| `AI_PARSE_MODE=mock` | Ép dùng bộ parser giả ngay cả khi đã có `ANTHROPIC_API_KEY` (hữu ich khi test UI mà không muốn tốn API call) |
| `STORAGE_DRIVER` | `local` (mặc định, lưu vào `.data/uploads`) hoặc `s3` (Supabase Storage / R2) |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Chỉ cần khi `STORAGE_DRIVER=s3` |

**Không có `.env` nào được commit** (`.gitignore` chặn `.env*`, chỉ giữ lại
`.env.example` làm mẫu).

### Chế độ mock AI (mặc định khi chưa có API key)

Không đặt `ANTHROPIC_API_KEY` thì mọi lượt upload dùng một bộ parser giả
(`src/lib/ai/mockParser.ts`) trả về một đề mẫu cố định — đủ để bấm thử toàn
bộ luồng upload → duyệt câu bị gắn cờ → publish → giao đề mà không cần key
thật. Khi bạn có `ANTHROPIC_API_KEY`, app tự chuyển sang gọi Claude thật, không
cần đổi code.

## Tạo admin đầu tiên

Cách duy nhất để có tài khoản admin đầu tiên là qua seed script — không có
route đăng ký nào trong ứng dụng:

```bash
# trong .env: đặt SEED_ADMIN_EMAIL và SEED_ADMIN_PASSWORD
npm run seed
```

Script này tạo (hoặc cập nhật, an toàn để chạy lại nhiều lần):

- 1 tài khoản **admin** theo `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- 1 nhóm mẫu "SAT — Lớp T8"
- 2 tài khoản **học viên** mẫu: `ha@12wsat.local` / `minh@12wsat.local`, mật khẩu `hocvien123`

Sau khi có admin đầu tiên, mọi tài khoản khác được tạo trong trang
`/admin/users` — không cần chạy lại script.

## Xác thực & phiên đăng nhập — cách hoạt động

- **Không có trang đăng ký.** Chỉ admin tạo tài khoản (`/admin/users`).
- **Session xác thực lại mỗi request** ở Node.js runtime (`src/lib/auth/session.ts`),
  không tin cookie — mỗi lần tải trang đều tra DB kiểm tra: tài khoản còn
  `ACTIVE`, chưa hết hạn (`expiresAt`), thiết bị chưa bị gỡ, session chưa bị
  thu hồi.
- **Chỉ 1 session hoạt động cùng lúc.** Đăng nhập ở nơi khác sẽ thu hồi
  session cũ ngay (ghi `revokedReason: superseded_by_new_login`).
- **Giới hạn thiết bị (`maxDevices`, mặc định 2).** Thiết bị được nhận diện
  qua cookie dài hạn `sat_device`. Đăng nhập từ thiết bị thứ N+1 khi đã đủ
  slot sẽ bị chặn cho tới khi admin gỡ bớt thiết bị cũ trong trang quản lý
  học viên.
- **Thu hồi tức thời khi admin khoá/xoá tài khoản.** Một
  `SessionWatcher` (client component, poll `/api/session/check` mỗi 15s)
  đảm bảo tab đang mở bị đăng xuất trong ≤ 30 giây, không cần đợi người
  dùng tự điều hướng.
- **`middleware`/`proxy.ts`** (Edge runtime) chỉ kiểm tra cookie có tồn
  tại hay không — đây là gate rẻ để tránh render UI khi rõ ràng chưa đăng
  nhập. Việc kiểm tra thật (còn hạn, còn hoạt động, đúng vai trò) luôn nằm
  ở Node.js runtime, không bao giờ chỉ dựa vào việc ẩn UI phía client.

## Luồng nhập đề (Admin) — cách hoạt động

1. **`/admin/tests`** — kéo thả hoặc chọn nhiều file (PDF/DOCX/PNG/JPEG). Mỗi
   file tạo một đề riêng (`Test` mới, trạng thái `DRAFT`).
2. **AI quét** chạy ngay trong lúc upload (đồng bộ, chưa qua hàng đợi nền —
   xem "Chưa làm" bên dưới) — PDF/ảnh được Claude đọc trực tiếp bằng vision
   (gửi cả file, không cần OCR riêng); DOCX được trích chữ bằng `mammoth`
   trước khi gửi dạng text.
3. Sau khi quét, tự chuyển tới **`/admin/tests/<id>/review`** — 2 cột: trái là
   file gốc (PDF xem trực tiếp, ảnh cuộn được), phải là danh sách câu hỏi
   (câu bị gắn cờ **Cần kiểm tra** tô đỏ, ưu tiên hiện trước) + form sửa từng
   câu, có preview LaTeX (KaTeX) realtime cho passage/stem/lời giải.
4. Một câu bị gắn cờ khi: `confidence < 0.85`, thiếu đáp án đúng, thiếu lời
   giải, hoặc đáp án đúng không khớp danh sách lựa chọn — logic ở
   `src/lib/ai/schema.ts#computeNeedsReview`.
5. **"Nhờ AI parse lại câu này"** gửi lại *toàn bộ* file gốc kèm số thứ tự câu
   cho Claude đọc kỹ lại — không cần công cụ cắt ảnh từ PDF riêng (xem giới
   hạn bên dưới).
6. **Publish** chỉ bấm được khi không còn câu nào bị gắn cờ. Sau publish, đề
   không thể sửa trực tiếp nữa — nút "Sửa (tạo phiên bản mới)" tạo một `Test`
   mới liên kết qua `rootTestId`, giữ nguyên bản đã publish (và kết quả học
   viên làm trên đó, từ Phase 3) không đổi.
7. Ở trang chi tiết đề đã publish: nhập **bảng quy đổi điểm** (raw → scaled,
   mỗi dòng `điểm thô,điểm quy đổi`) và **giao đề** cho một nhóm hoặc một học
   viên cụ thể, kèm ngày mở/đóng và số lần làm lại tối đa.

### Giới hạn đã biết ở Phase 2 (nói thẳng, không giấu)

- **Không có công cụ cắt ảnh trực tiếp từ trang PDF bằng chuột** như mô tả lý
  tưởng ở Phase 0 — đó là một công cụ canvas/PDF.js riêng, quy mô lớn. Thay
  vào đó, mục "Hình ảnh" trong editor cho admin **upload trực tiếp một ảnh**
  (chụp màn hình phần đó, ví dụ) và gắn ghi chú. Có thể bổ sung công cụ crop
  thật ở phase sau nếu cần.
- **Parse chạy đồng bộ trong lúc upload**, không qua hàng đợi nền — với batch
  nhiều file lớn hoặc PDF nhiều trang, request có thể mất hàng chục giây.
  Đủ dùng ở quy mô một mentor, nhưng nên chuyển sang job queue trước khi có
  nhiều admin dùng song song.
- **`STORAGE_DRIVER=local`** (mặc định) không phải "signed URL ngắn hạn" thật
  như spec — nó là một route yêu cầu session admin hợp lệ. Đặt
  `STORAGE_DRIVER=s3` (Supabase Storage/R2) trước khi có nội dung học viên
  nhìn thấy để có signed URL thật.
- **"≥ 90% câu đúng cấu trúc"** không phải con số được đảm bảo cứng — phụ
  thuộc chất lượng file gốc. Hệ thống tối ưu bằng cách gắn cờ mọi câu AI
  không chắc thay vì đoán liều; bạn tự đo tỉ lệ thật theo từng lần upload.

## Backup / restore database

Dùng công cụ chuẩn của Postgres, không cần script riêng:

```bash
# Backup
pg_dump "$DATABASE_URL" -F c -f backup-$(date +%Y%m%d).dump

# Restore vào một database rỗng
pg_restore -d "$DATABASE_URL" --clean --if-exists backup-20260101.dump
```

Nếu dùng Supabase/Neon, cả hai đều có backup tự động + point-in-time
restore trên dashboard của họ — ưu tiên dùng cái đó cho production, script
trên chỉ để backup thủ công/di chuyển dữ liệu.

## Lệnh hay dùng

```bash
npm run dev            # dev server
npm run build           # build production, chạy type-check
npx prisma studio        # xem/sửa dữ liệu qua UI
npx prisma migrate dev   # tạo + áp dụng migration mới sau khi sửa schema.prisma
npm run seed              # (tạo lại) admin + 2 học viên mẫu + 1 đề mẫu ngắn
```

## Checklist Phase 2 — tự kiểm tra

1. Vào `/admin/tests`, upload một file bất kỳ (không có `ANTHROPIC_API_KEY`
   vẫn chạy được nhờ chế độ mock) → tự chuyển tới trang review, thấy câu bị
   gắn cờ đỏ ưu tiên trước.
2. Bấm Publish khi còn câu bị gắn cờ → bị chặn với thông báo rõ ràng. Sửa hết
   câu bị gắn cờ (điền đáp án/lời giải/domain/skill còn thiếu) → Publish
   thành công, chuyển sang trang chi tiết đề.
3. Ở đề đã publish, bấm "Sửa (tạo phiên bản mới)" → vào một đề nháp **mới**
   (route khác); quay lại đề gốc đã publish → nội dung cũ không đổi.
4. Nhập bảng quy đổi điểm và giao đề cho nhóm "SAT — Lớp T8" (đã có sẵn từ
   seed) → lưu thành công, hiện trong danh sách "Giao đề".
5. Mở `/api/storage/...` khi chưa đăng nhập (hoặc đăng nhập bằng tài khoản
   học viên) → 403, không lộ nội dung file.
6. `npm run build` chạy sạch, không lỗi type.

## Checklist Phase 1 — tự kiểm tra

1. Không có route `/register` hay tương tự — tài khoản chỉ tạo được ở
   `/admin/users`.
2. Đăng nhập 1 tài khoản trên 2 trình duyệt/thiết bị khác nhau (mặc định
   `maxDevices=2`) → cả hai vào được, nhưng chỉ session mới nhất còn sống
   (session cũ bị đá khi đăng nhập lần 2 — kiểm tra bằng cách reload tab đầu).
3. Đăng nhập thiết bị thứ 3 → bị chặn với thông báo đúng; vào
   `/admin/users/<id>`, bấm "Gỡ thiết bị" → thiết bị thứ 3 đăng nhập được.
4. Ở `/admin/users/<id>`, bấm "Tạm khoá tài khoản" trong khi học viên đang
   mở một tab khác (không reload) → tab đó tự bị đăng xuất trong vòng
   30 giây.
5. Bấm "Xoá vĩnh viễn" → tài khoản không đăng nhập lại được, và session cũ
   (nếu còn) mất quyền truy cập ngay ở lần tải trang kế tiếp.
6. `npm run build` chạy sạch, không lỗi type.

## Chưa làm

**Phase 1:**
- Trang Admin quản lý cohort riêng (hiện tại tạo/chọn cohort ngay trong
  form tạo/sửa học viên).
- Dark mode toggle thủ công (theme hiện theo `prefers-color-scheme` của hệ
  điều hành).

**Phase 2:**
- Màn hình làm bài cho học viên (Real Test, Luyện theo dạng, Question Bank,
  Vocab Notebook, Sổ lỗi) — Phase 3 trở đi.
- Công cụ crop ảnh trực tiếp từ PDF (xem "Giới hạn đã biết" ở trên).
- Hàng đợi parse chạy nền thay vì đồng bộ trong request.
- Rate limit theo API đề, log số lần rời tab, watermark chống copy — nằm ở
  Phase 6, khi đã có nội dung học viên thực sự xem được để bảo vệ.
