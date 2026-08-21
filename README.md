# 12WSAT

Web luyện SAT nội bộ, mời riêng — không có trang đăng ký công khai. Repo này
đang ở **Phase 1**: tài khoản do admin cấp, giới hạn thiết bị, session server-side
có thể thu hồi ngay lập tức, và khung giao diện/design system. Real Test,
Luyện theo dạng, Question Bank, Vocab Notebook sẽ có ở các phase sau.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- PostgreSQL + Prisma (driver adapter `@prisma/adapter-pg`)
- Auth tự viết: session cookie `HttpOnly`, mật khẩu hash bằng Argon2id
  (`@node-rs/argon2`) — không magic link, không OAuth

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

**Không có `.env` nào được commit** (`.gitignore` chặn `.env*`, chỉ giữ lại
`.env.example` làm mẫu).

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
npm run seed              # (tạo lại) admin + 2 học viên mẫu
```

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

## Chưa làm ở Phase 1

- Real Test SAT, Luyện theo dạng, Question Bank, Vocab Notebook, Sổ lỗi —
  chưa có dữ liệu/luồng (Phase 2 trở đi).
- Trang Admin quản lý cohort riêng (hiện tại tạo/chọn cohort ngay trong
  form tạo/sửa học viên).
- Rate limit theo API đề, log số lần rời tab, watermark chống copy — nằm ở
  Phase 6 vì chưa có nội dung đề để bảo vệ.
- Dark mode toggle thủ công (theme hiện theo `prefers-color-scheme` của hệ
  điều hành).
