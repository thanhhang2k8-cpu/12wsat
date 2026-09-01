# 12WSAT

Web luyện SAT nội bộ, mời riêng — không có trang đăng ký công khai. Repo này
đang ở **Phase 5**: Phase 1 (tài khoản, thiết bị, session), Phase 2 (luồng
nội dung đề thi cho admin), Phase 3 (màn hình làm bài "Real Test"), Phase 4
(Luyện tập / Question Bank, Sổ lỗi), và Phase 5 (Vocab Notebook + ôn tập
ngắt quãng SM-2) đều đã xong. Phase 6 (chống copy/watermark, admin
analytics, polish) đang làm tiếp.

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
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | **Bắt buộc.** Dùng bởi `npm run seed` để tạo tài khoản admin đầu tiên — không có mật khẩu mặc định, thiếu 2 biến này thì seed báo lỗi thay vì tự đoán |
| `SEED_ADMIN_NAME` | Tuỳ chọn, tên hiển thị của admin (mặc định "Mentor") |
| `SEED_STUDENT_EMAIL` / `SEED_STUDENT_PASSWORD` / `SEED_STUDENT_NAME` | Tuỳ chọn — đặt cả 2 biến đầu để seed tạo thêm một tài khoản học viên thật (ngoài 2 tài khoản demo cố định) |
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

Script này tạo (hoặc cập nhật, an toàn để chạy lại nhiều lần — không bao giờ
ghi đè mật khẩu của một tài khoản đã tồn tại):

- 1 tài khoản **admin** theo `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- 1 tài khoản **học viên thật** theo `SEED_STUDENT_EMAIL` / `SEED_STUDENT_PASSWORD`, nếu bạn đặt 2 biến này
- 1 nhóm mẫu "SAT — Lớp T8"
- 2 tài khoản **học viên demo** cố định: `ha@12wsat.local` / `minh@12wsat.local`, mật khẩu `hocvien123`

Sau khi có admin đầu tiên, mọi tài khoản khác được tạo trong trang
`/admin/users` — không cần chạy lại script.

`npm run seed` gọi đúng hàm `hashPassword()` mà `/login` dùng để so khớp
(`src/lib/auth/password.ts`, argon2id) — không có hai chỗ băm mật khẩu khác
nhau trong code.

## Deploy lên Vercel — vì sao "build thành công" chưa chắc đăng nhập được

`next build` chỉ biên dịch code — nó **không** tự tạo bảng trong database
hay tạo tài khoản admin. Nếu bạn deploy mà chưa từng chạy migration + seed
nhắm vào đúng database production, sẽ không có admin nào để đăng nhập dù
build xanh. Để tránh việc này, script `build` trong `package.json` là một
chuỗi `prisma migrate deploy && next build && npm run seed` — cố tình gộp
cả 3 bước vào **một** script `build` duy nhất (không tách `postbuild` riêng,
vì Vercel tổng hợp lệnh build theo cách không đảm bảo chạy `postbuild` của
npm) — nghĩa là **mỗi lần Vercel build lại đều tự làm cả 3 việc đó**, bạn
không cần SSH hay chạy lệnh tay. Việc bạn cần làm chỉ là:

1. Vào Vercel → Project → **Settings → Environment Variables**, thêm ít nhất:
   `DATABASE_URL`, `SESSION_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
   (thêm `SEED_STUDENT_EMAIL`/`SEED_STUDENT_PASSWORD` nếu muốn có sẵn 1 tài
   khoản học viên thật). `DATABASE_URL` phải trỏ tới một Postgres Vercel
   build **kết nối được lúc build** (Supabase/Neon public connection string
   đều dùng được).
2. Bấm **Redeploy** (không cần chọn "use existing build cache" — cứ để mặc
   định là được).
3. Xem log build: sẽ thấy `prisma migrate deploy` áp dụng migration, rồi
   `npm run seed` in ra email admin vừa tạo/xác nhận. Nếu bước này lỗi
   (thường là thiếu biến môi trường hoặc `DATABASE_URL` sai), build sẽ đỏ
   và log nói rõ thiếu gì — sửa biến môi trường rồi Redeploy lại.
4. Đăng nhập bằng đúng `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` bạn vừa đặt.

Một nguyên nhân khác gây "đăng nhập không được" dù có admin trong DB: thư
viện hash mật khẩu `@node-rs/argon2` có phần native code, và nếu Next.js cố
đóng gói nó như JS thường thì việc hash/verify mật khẩu âm thầm hỏng trên
serverless dù chạy `next dev` ở máy bạn vẫn ổn. `next.config.ts` đã khai báo
`serverExternalPackages` cho gói này (và `@prisma/adapter-pg`/`pg`) để tránh
đúng lỗi đó.

Một nguyên nhân khác gây cảm giác "bấm Đăng nhập không hiện gì": tài khoản
đã đăng nhập đủ `maxDevices` (mặc định 2) thiết bị — ví dụ do tự test đi
test lại nhiều lần bằng các trình duyệt/thiết bị "mới" khác nhau. Khi đó
form login **không redirect** và **có** hiện thông báo lỗi màu đỏ ngay dưới
ô mật khẩu (`"Tài khoản đã đăng nhập trên tối đa N thiết bị..."`) — nếu
không thấy thông báo này xuất hiện dù đợi vài giây, mở DevTools → tab
Network, xem request `POST /login` trả về status gì (401/403 nghĩa là
Vercel Deployment Protection đang chặn request trước khi tới được code của
app — tắt ở Settings → Deployment Protection cho môi trường Production).
Vào `/admin/users/<id>` để gỡ bớt thiết bị cũ nếu đúng là do hết slot.

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

## Màn hình làm bài (Phase 3) — cách hoạt động

- **`/dashboard/real-test`** liệt kê các đề đã giao cho học viên đang đăng
  nhập (`AssignmentGroup`/`AssignmentUser`, trong khoảng ngày mở/đóng), kèm
  trạng thái attempt hiện tại (chưa làm / đang làm dở / đã nộp).
- **Adaptive theo module**, đúng mô hình Digital SAT: mỗi môn (Reading &
  Writing, Math) có 2 module. Module 1 luôn là bản chuẩn; sau khi nộp,
  `pickNextModule` (`src/lib/testPlayer/adaptive.ts`) chọn module 2 bản
  **EASY** hay **HARD** dựa trên % câu đúng ở module 1 so với
  `Test.adaptiveThresholdPct` (admin nhập khi tạo bảng quy đổi điểm).
- **Timer server-authoritative.** Server tính `remainingSec` mỗi lần render
  từ `AttemptModule.deadline`; client chỉ đếm ngược cục bộ mỗi giây cho mượt,
  và đồng bộ lại mỗi 5 giây qua `heartbeatAction` — hàm này cũng tự nộp
  module nếu phát hiện đã hết giờ, kể cả khi học viên đóng tab mà không bấm
  "Nộp module" (lần tải trang kế tiếp `AttemptPage` cũng tự phát hiện +
  nộp hộ nếu `deadline` đã qua). Đề có thể đặt `timedMode = UNTIMED` để bỏ
  hoàn toàn timer (dùng cho luyện tập không tính giờ ở phase sau).
- **Tự lưu (autosave) từng câu**, không cần bấm nút lưu — mỗi lần chọn đáp
  án, gõ grid-in, gắn cờ, hoặc gạch bỏ một lựa chọn đều gọi `saveAnswerAction`
  ngầm (React `startTransition`), nên rớt mạng/đóng tab giữa chừng không mất
  câu đã làm.
- **Grid-in so khớp theo giá trị số**, không so chuỗi — `"3/5"` và `"0.6"`
  được coi là cùng một đáp án đúng (`src/lib/testPlayer/grading.ts`).
- **Chấm điểm**: raw score mỗi môn → tra `ScoreScale` (bảng admin nhập theo
  từng đề) ra điểm quy đổi 200–800/môn, cộng lại thành tổng 400–1600. Trang
  `/attempts/<id>/results` hiện điểm tổng, điểm từng môn, tỉ lệ đúng theo
  domain, danh sách câu sai kèm lời giải (bấm để mở rộng), tổng thời gian
  làm bài, và số lần rời tab trong lúc thi (`TabSwitchLog`, ghi nhận nhưng
  **không** khoá bài hay cảnh cáo — xem giới hạn bên dưới).

### Giới hạn đã biết ở Phase 3 (nói thẳng, không giấu)

- **Chưa có UI highlight/gạch chân đoạn văn** dù model `Annotation` đã có
  sẵn trong schema — hiện chỉ có gạch bỏ (strikeout) từng lựa chọn đáp án,
  không phải highlight tự do trong passage. Cần một phase riêng cho việc
  chọn text + lưu vị trí.
- **Không có máy tính Desmos nhúng** cho phần Math (Digital SAT thật có).
- **Không có reference sheet** (công thức hình học) hiển thị trong lúc làm
  Math.
- **Rời tab chỉ được ghi log, không bị chặn/cảnh cáo/khoá bài** — đủ để
  mentor xem lại ai rời tab bao nhiêu lần sau khi thi xong, nhưng không
  phải cơ chế chống gian lận thời gian thực. Việc khoá lockdown-browser thật
  sự nằm ngoài phạm vi ứng dụng web.
- **Cơ chế tự nộp khi hết giờ mới được kiểm tra qua đọc code, chưa chạy thử
  một lượt hết giờ thật** (đợi hàng chục phút cho `deadline` tới trong lúc
  test không thực tế) — logic nằm ở `AttemptPage` (kiểm tra `deadline` mỗi
  lần render) và `heartbeatAction` (kiểm tra mỗi 5s trong lúc học viên đang
  mở trang), cả hai đều gọi chung `submitModuleAction(..., { auto: true })`.

## Luyện tập / Question Bank / Sổ lỗi (Phase 4) — cách hoạt động

- **`/dashboard/practice`** là một trang duy nhất cho cả "Luyện theo dạng" và
  "Question Bank" — lọc theo môn/domain/skill/độ khó, thấy ngay danh sách câu
  phù hợp (tick chọn từng câu hoặc "Chọn tất cả"), bấm "Bắt đầu luyện tập".
  Có thêm tick "Chỉ hiện câu từng làm sai" để luyện lại đúng những câu yếu.
- **Không tính giờ, không adaptive** — khác hẳn Real Test. Mỗi câu trả lời
  xong bấm "Kiểm tra" là biết đúng/sai **ngay lập tức** kèm lời giải, không
  phải đợi nộp cả module.
- **`PracticeSet`** là một hàng đợi câu hỏi (mảng id, theo thứ tự đã xáo trộn)
  gắn với 1 học viên — độc lập với cấu trúc `Module` cứng nhắc của Real Test,
  nên có thể trộn câu từ nhiều đề khác nhau trong cùng 1 lượt luyện.
- **Sổ lỗi (`/dashboard/wrong-answers`)**: tính theo **lần làm gần nhất** của
  mỗi câu (dù là ở Real Test hay ở Luyện tập) — làm đúng lại thì tự biến mất
  khỏi danh sách, không cần thao tác "đánh dấu đã sửa" thủ công. Có nút
  "Luyện lại N câu này" tạo thẳng một `PracticeSet` từ đúng các câu đang sai.
- **Đánh dấu (bookmark)** một câu trong lúc luyện tập bằng nút ★ ở góc phải
  trên — hiện chưa có trang riêng liệt kê các câu đã đánh dấu (xem "Chưa làm").

## Vocab Notebook + ôn tập ngắt quãng (Phase 5) — cách hoạt động

- **`/dashboard/vocab`**: mỗi học viên có các "bộ từ" (`VocabDeck`) riêng —
  bộ đầu tiên ("Từ vựng của tôi") tự tạo khi thêm từ đầu tiên, có thể tạo
  thêm bộ khác. Thêm từ thủ công (từ vựng, định nghĩa, từ loại, IPA, đồng
  nghĩa, câu ví dụ) qua form ở cuối trang.
- **Thêm từ ngay từ câu hỏi đang luyện**: trong màn Luyện tập
  (`/practice/<id>`), sau khi trả lời xong một câu có nút "+ Thêm một từ từ
  câu này vào Vocab" — lưu kèm `sourceQuestionId` trỏ về đúng câu đó, luôn
  vào bộ từ mặc định.
- **Lịch ôn tập kiểu SM-2** (`src/lib/vocab/srs.ts`), rút gọn theo mô hình
  4 nút quen thuộc (Anki): mỗi từ có `easeFactor`/`intervalDays`/`repetitions`
  riêng; chấm "Lại" thì hôm nay còn đến hạn lại (ôn liền lần sau), "Khó/Tốt/Dễ"
  càng nhớ chắc thì khoảng cách lần ôn tiếp theo càng dài.
- **`/dashboard/vocab/review`**: chỉ hiện từ đã đến hạn (`dueAt <= now`, tối
  đa 50 từ/lượt) — xem từ trước, bấm "Xem đáp án" mới hiện định nghĩa, rồi tự
  chấm mức độ nhớ. Không đến hạn từ nào thì trang báo rõ, không bắt ôn ép.

### Giới hạn đã biết ở Phase 5

- **Chưa có deck mẫu do admin đẩy xuống** (`isSharedTemplate` đã có trong
  schema, chưa có UI cho admin tạo/gán) — mỗi học viên tự xây bộ từ của
  mình từ đầu.
- **Nút "+ Thêm từ" trong lúc luyện tập luôn lưu vào bộ từ mặc định**, không
  cho chọn bộ từ khác ngay tại đó — muốn sắp xếp lại thì vào thẳng
  `/dashboard/vocab/<deckId>` (hiện chưa có nút "chuyển bộ từ" cho từ đã tạo,
  chỉ có thêm/xoá).
- Nếu chấm "Lại" nhiều lần liên tiếp trong cùng một lượt ôn, từ đó **không
  quay lại ngay trong lượt đó** (chỉ đến hạn lại từ lượt ôn tiếp theo) — để
  tránh vòng lặp vô hạn trong 1 phiên, đơn giản hơn so với SM-2 "chuẩn".

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
npm run build           # build production — chạy migrate deploy, next build, rồi seed (trong cùng 1 script)
npx prisma studio        # xem/sửa dữ liệu qua UI
npx prisma migrate dev   # tạo + áp dụng migration mới sau khi sửa schema.prisma (chỉ dùng khi dev)
npm run seed              # (tạo lại) admin + học viên + 1 đề mẫu ngắn
```

Lưu ý: `npm run build` giờ cần `DATABASE_URL` kết nối được (để chạy
`prisma migrate deploy`) — không còn là lệnh build thuần offline nữa,
kể cả khi chạy local.

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

## Checklist Phase 3 — tự kiểm tra

1. Đăng nhập bằng một tài khoản học viên có đề được giao (seed sẵn
   `ha@12wsat.local` / `hocvien123`), vào `/dashboard/real-test`, bấm "Bắt
   đầu làm bài" → vào `/attempts/<id>` với module 1 R&W, còn giờ đếm ngược.
2. Trả lời đúng phần lớn câu ở module 1 → nộp → module 2 phải là bản
   **HARD**; trả lời sai phần lớn → module 2 phải là bản **EASY** (kiểm tra
   qua nhãn "module 2 — HARD/EASY" hiện trên trang).
3. Gắn cờ một câu, gạch bỏ một lựa chọn, rồi **reload trang** (F5) → cả hai
   trạng thái phải còn nguyên (autosave qua `saveAnswerAction`).
4. Làm hết cả 4 module (R&W ×2, Math ×2) → tự chuyển tới
   `/attempts/<id>/results`, thấy điểm tổng, điểm từng môn, danh sách câu
   sai (nếu có) kèm lời giải mở rộng được.
5. Nhập một đáp án grid-in dạng phân số (ví dụ `3/5`) khi đáp án đúng lưu là
   thập phân (`0.6`, hoặc ngược lại) → vẫn được chấm đúng.
6. Vào lại `/attempts/<id>` của một attempt **đã nộp** (`SUBMITTED`) →
   redirect thẳng tới trang kết quả, không cho làm lại module đã nộp.
7. `npm run build` chạy sạch, không lỗi type.

## Checklist Phase 4 — tự kiểm tra

1. Vào `/dashboard/practice`, lọc theo một domain bất kỳ → danh sách câu chỉ
   còn đúng domain đó, đếm đúng số lượng hiển thị ở góc trên.
2. Bỏ chọn vài câu (tick), bấm "Bắt đầu luyện tập" → số câu trong phiên luyện
   đúng bằng số đã tick, không nhiều/ít hơn.
3. Trả lời một câu sai có chủ đích → hiện "Sai rồi." + lời giải + đáp án đúng
   (grid-in) hoặc tô xanh đáp án đúng/đỏ đáp án đã chọn (MCQ).
4. Vào `/dashboard/wrong-answers` → câu vừa làm sai ở bước 3 xuất hiện trong
   danh sách. Luyện lại đúng câu đó, trả lời đúng lần này → quay lại sổ lỗi,
   câu đó đã biến mất.
5. Bấm ★ đánh dấu một câu trong lúc luyện, reload trang → dấu ★ vẫn còn (lưu
   trong DB, không phải state tạm client).
6. `npm run build` chạy sạch, không lỗi type.

## Checklist Phase 5 — tự kiểm tra

1. Vào `/dashboard/vocab`, thêm một từ mới (không chỉ định deck) → tự tạo bộ
   "Từ vựng của tôi", "N từ đến hạn ôn hôm nay" tăng thêm 1.
2. Bấm vào bộ từ vừa tạo → thấy đúng từ vừa thêm, đủ định nghĩa/đồng nghĩa.
3. Bấm "Bắt đầu ôn tập" → thấy từ, bấm "Xem đáp án" → hiện định nghĩa, chấm
   "Tốt" → chuyển từ tiếp theo hoặc màn "Đã ôn xong".
4. Vào lại `/dashboard/vocab` → "N từ đến hạn" giảm đúng 1 (từ vừa ôn dời
   sang ngày mai, không còn đến hạn hôm nay).
5. Vào `/dashboard/practice`, luyện một câu, sau khi có kết quả bấm "+ Thêm
   một từ từ câu này vào Vocab", điền và lưu → vào lại Vocab Notebook thấy
   từ đó trong "Từ vựng của tôi".
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
- Công cụ crop ảnh trực tiếp từ PDF (xem "Giới hạn đã biết" ở trên).
- Hàng đợi parse chạy nền thay vì đồng bộ trong request.

**Phase 3:**
- Highlight/gạch chân đoạn văn tự do (model `Annotation` đã có, chưa có UI).
- Máy tính Desmos nhúng và reference sheet cho phần Math.
- Chặn/cảnh cáo khi rời tab lúc thi — hiện chỉ ghi log, không khoá bài (dự
  kiến ở Phase 6).

**Phase 4:**
- Chưa có trang riêng liệt kê **các câu đã đánh dấu (bookmark)** — model và
  nút ★ đã có, chỉ thiếu màn hình xem lại danh sách đã đánh dấu (khác với
  Sổ lỗi, vốn liệt kê câu *sai* chứ không phải câu được *đánh dấu*).
- Không giới hạn số câu tối đa mỗi lượt luyện (Question Bank cho tick chọn
  tuỳ ý) — với đề rất lớn, danh sách hiển thị bị cắt ở 60 câu/lần lọc.

**Phase 5:**
- Deck mẫu do admin đẩy xuống cho cả lớp (`isSharedTemplate` có trong schema,
  chưa có UI).
- Chọn bộ từ khi thêm nhanh từ lúc luyện tập (luôn vào bộ mặc định); chuyển
  một từ đã tạo sang bộ khác.
- Ôn lại ngay trong cùng lượt khi chấm "Lại" (Anki thường cho quay vòng lại
  trong phiên) — hiện chỉ đến hạn lại ở lượt ôn tiếp theo.

**Phase 6:** xem mục tổng quan ở đầu file — đang làm.
