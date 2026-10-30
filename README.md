# VieTra — mockup vận tải quốc tế

Bản web mockup mô phỏng quy trình **báo giá → chọn dịch vụ → đặt chỗ → xác minh chứng từ → cấp mã → theo dõi lô hàng** cho vận tải đa phương thức (đường bộ, đường biển, hàng không, đường sắt).

Dữ liệu mô phỏng được lưu trên server (SQLite cục bộ hoặc Turso), có đăng nhập và phân quyền khách hàng/admin. Không có thanh toán, email, API định vị hay lịch tàu thật, và không có trạng thái GPS thời gian thực.

## Chạy ứng dụng

```bash
npm install
npm run db:init    # tạo SQLite .data/vietra.db + seed lần đầu
npm run dev:all    # API http://localhost:8787 + web http://localhost:5173
npm run build      # type-check client + server, build production
npm run preview    # xem bản build tại http://localhost:4173
npm test           # test engine mô phỏng, chứng từ và API
```

`npm run dev` chỉ chạy Vite và **không có API**. Dùng `npm run dev:all`, hoặc chạy `npm run dev:api` và `npm run dev` ở hai terminal.

Yêu cầu Node 20.19+ hoặc 22.12+ (Vite 8). Repo có `.nvmrc` đặt Node 22; trên Vercel chọn Node 22.x.

### Tài khoản seed

| Vai trò | Email | Mật khẩu mặc định | Phạm vi |
| --- | --- | --- | --- |
| Khách hàng | `customer@vietra.vn` | `VieTra@2026` | Chỉ đơn, lô hàng, tình huống và thông báo của mình |
| Admin | `admin@vietra.vn` | `VieTra@2026` | Toàn bộ đơn/lô hàng/tình huống; xác minh chứng từ; thông báo riêng |

Mật khẩu admin lấy từ `ADMIN_PASSWORD`, mật khẩu khách hàng demo lấy từ `DEMO_PASSWORD`. Đổi biến môi trường **trước lần seed đầu tiên**; nếu database đã seed, mật khẩu cũ vẫn giữ nguyên.

## Chia sẻ cho người khác truy cập

### Cùng mạng Wi-Fi/LAN

1. Chạy `npm run dev:all` (Vite đã cấu hình `host: true`; API chạy ở cổng 8787 và được proxy qua `/api`).
2. Lấy IPv4 của máy Windows bằng `ipconfig` (ví dụ `192.168.1.5`).
3. Gửi cho người khác địa chỉ `http://192.168.1.5:5173`.
4. Nếu Windows hỏi firewall, chọn cho phép Node.js trên mạng **Private**. Máy kia phải cùng Wi-Fi/LAN và không dùng `localhost`.

Máy chạy server phải tiếp tục bật trong suốt thời gian người khác truy cập. Người dùng khác đăng nhập bằng tài khoản riêng; dữ liệu dùng chung nằm trong database của máy chủ.

### Link công khai tạm thời

Khi cần gửi link cho người ở mạng khác mà chưa muốn deploy, dùng tunnel:

```bash
# Cách 1: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:5173

# Cách 2: localtunnel
npx localtunnel --port 5173
```

Trang chỉ tồn tại khi server và tunnel còn chạy; không nên dùng cách này cho dữ liệu nhạy cảm.

## Deploy lên Vercel — link cố định

Ứng dụng gồm frontend Vite và API serverless trong `api/index.ts` (Express + Turso). Vercel build frontend ra `dist` và deploy API cùng project. Cấu hình build và rewrite toàn bộ `/api/*` về một function nằm trong `vercel.json`.

### 1. Chuẩn bị Turso và biến môi trường

Cách nhanh nhất là dùng dashboard Turso:

1. Đăng nhập [turso.tech](https://turso.tech) bằng GitHub.
2. **Create Database** → tên `vietra`, region gần Việt Nam (ví dụ Singapore).
3. Mở database, copy **Database URL** dạng `libsql://vietra-...turso.io`.
4. Vào **Tokens** → **Create Token**, copy token ngay vì token chỉ hiện một lần.

Nếu đã cài Turso CLI, có thể làm tương tự:

```bash
turso db create vietra
turso db show vietra --url
turso db tokens create vietra
```

Sau đó khai báo biến môi trường trong **Vercel → Project → Settings → Environment Variables** cho cả Production và Preview:

| Biến | Giá trị |
| --- | --- |
| `TURSO_DATABASE_URL` | URL dạng `libsql://...` |
| `TURSO_AUTH_TOKEN` | Token vừa tạo; không đưa vào frontend |
| `AUTH_SECRET` | Chuỗi ngẫu nhiên tối thiểu 32 ký tự |
| `ADMIN_EMAIL` | Email admin, ví dụ `admin@vietra.vn`; phải khác email khách hàng demo |
| `ADMIN_PASSWORD` | Mật khẩu admin mạnh, **bắt buộc ở production** |
| `DEMO_PASSWORD` | Mật khẩu tài khoản khách hàng seed, tùy chọn |

Preview nên dùng database Turso riêng (hoặc branch riêng); nếu dùng chung với Production, thao tác thử trên preview sẽ ghi vào cùng dữ liệu.

Tạo `AUTH_SECRET` bằng Git Bash hoặc PowerShell:

```bash
# Git Bash / macOS / Linux
openssl rand -base64 32

# Hoặc dùng Node, chạy được ở mọi shell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Schema và seed được tạo tự động ở request API đầu tiên; không cần chạy migration riêng. `ADMIN_PASSWORD` chỉ dùng khi seed admin lần đầu — đổi biến sau đó không cập nhật hash đã lưu.

Nếu chưa muốn deploy, có thể kiểm tra toàn bộ với database libSQL cục bộ bằng `npm run dev:all`; database nằm ở `.data/vietra.db` và đã được gitignore.

Nếu dùng Cách A và project Vercel chưa tồn tại, hãy tạo/link project trước rồi mới khai báo biến môi trường. Deploy trước khi có biến vẫn build được nhưng `/api/health` sẽ lỗi 500 cho đến khi thêm biến và deploy lại.

### Cách A — Vercel CLI (nhanh, không cần GitHub)

Chạy trong thư mục `vietra/`:

```powershell
cd C:\Users\DELL\Kombai\projects\project-sage-scone\vietra
npx vercel login
npx vercel link   # tạo/chọn project, đặt tên project
```

Sau đó vào **Vercel → Project → Settings → Environment Variables** thêm các biến ở bảng trên cho **Production** và **Preview**, rồi deploy:

```powershell
npx vercel --prod
```

`npx vercel login` mở trình duyệt để đăng nhập bằng GitHub, Google hoặc email. Khi link/deploy lần đầu, trả lời:

- **Which scope?** chọn tài khoản của bạn
- **Link to existing project?** `N`
- **Project name?** `vietra` hoặc tên bạn muốn
- **In which directory is your code located?** `./`
- **Override settings?** `N` — `vercel.json` đã khai báo build command và output

Kết quả có dạng:

```text
Production: https://vietra-xxxx.vercel.app
```

Đây là **Production Alias** — link cố định để gửi người khác. Link này giữ nguyên qua các lần deploy production.

Các lần sau, chỉ cần:

```powershell
cd C:\Users\DELL\Kombai\projects\project-sage-scone\vietra
npx vercel --prod   # deploy production, cập nhật link cố định
npx vercel          # deploy preview, tạo link tạm thời mới
```

Không cần cài CLI toàn cục; `npx` tự tải Vercel CLI. Nếu muốn dùng lệnh `vercel` trực tiếp, cài bằng `npm install -g vercel`.

### Cách B — GitHub + Vercel (khuyến nghị, dùng Git Bash)

Tạo repo **trong thư mục `vietra/`** để không đẩy `.kombai`, canvas và các file ngoài ứng dụng. `.gitignore` đã loại `node_modules`, `dist`, `.env`, `.data`, `.vercel`.

#### B1. Tạo repo GitHub trống

1. Mở [github.com/new](https://github.com/new).
2. Đặt tên repo, ví dụ `vietra`; chọn **Private** hoặc **Public**.
3. **Không** tick “Add a README file”, `.gitignore` hoặc license — code local đã có sẵn.
4. Bấm **Create repository**, copy URL HTTPS dạng `https://github.com/<tai-khoan>/vietra.git`.

#### B2. Đẩy code bằng Git Bash

Mở Git Bash và chạy:

```bash
cd "/c/Users/DELL/Kombai/projects/project-sage-scone/vietra"

git init
git config user.name "Tên Của Bạn"
git config user.email "email@example.com"

git add .
git status
git commit -m "VieTra mockup: quote, booking, tracking, API"
git branch -M main
git remote add origin https://github.com/<tai-khoan>/vietra.git
git push -u origin main
```

Kiểm tra trước khi commit:

- `git status` **không được** liệt kê `.env`, `.data`, `node_modules`, `dist`, `.vercel`. Nếu có, dừng lại và kiểm tra `.gitignore`.
- `git config user.name` / `user.email` chỉ là thông tin tác giả commit, không phải tài khoản đăng nhập GitHub.
- Lần push đầu, Git Credential Manager có thể mở trình duyệt để đăng nhập GitHub. Chọn đúng tài khoản và cấp quyền.
- Nếu Git hỏi username/password: username là tên đăng nhập GitHub, password là **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → scope `repo`). Không dùng mật khẩu tài khoản GitHub và không dán token vào chat.

Nếu dùng SSH thay HTTPS:

```bash
ssh-keygen -t ed25519 -C "email@example.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
# Dán nội dung vào GitHub → Settings → SSH and GPG keys → New SSH key
git remote set-url origin git@github.com:<tai-khoan>/vietra.git
git push -u origin main
```

#### Cấu hình Vercel

1. Vào [vercel.com/new](https://vercel.com/new), chọn **Continue with GitHub**.
2. Nếu repo chưa xuất hiện, chọn **Adjust GitHub App Permissions** (hoặc Install) và cấp quyền cho repo `vietra`.
3. Chọn **Import** repo.
4. Giữ các cấu hình sau:

| Trường | Giá trị |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `./` (vì repo chính là thư mục `vietra`) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 22.x (đã có `.nvmrc`) |

Nếu repo chứa thư mục cha và ứng dụng nằm trong `vietra/`, đặt **Root Directory** là `vietra`.

Trong mục **Environment Variables**, thêm các biến ở bảng phía trên (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO_PASSWORD`) cho cả **Production** và **Preview**, rồi bấm **Deploy**.

Sau khi deploy xong, mở `https://<project>.vercel.app/api/health` để kiểm tra. Nếu báo lỗi thiếu biến, thêm biến rồi vào **Deployments → Redeploy** (biến mới không tự áp dụng cho deployment cũ).

### Cập nhật code sau khi đã deploy

Mỗi lần sửa code, chạy trong Git Bash:

```bash
cd /c/Users/DELL/Kombai/projects/project-sage-scone/vietra
git add .
git commit -m "Mô tả thay đổi"
git push
```

- Push vào `main` → Vercel tự build và cập nhật link production.
- Tạo pull request từ nhánh khác → Vercel tạo preview deployment riêng.
- Xem log build tại **Vercel → Project → Deployments**.
- Rollback: mở deployment cũ → **Promote to Production**.

### Lỗi Git/Vercel thường gặp

- **`remote origin already exists`**: chạy `git remote set-url origin https://github.com/<tai-khoan>/vietra.git`.
- **`failed to push some refs` / `fetch first`**: repo GitHub đã có README hoặc commit. Chạy `git pull --rebase origin main` rồi `git push`, hoặc xoá repo và tạo lại repo trống.
- **`Authentication failed`**: dùng Personal Access Token hoặc SSH; GitHub không nhận mật khẩu tài khoản.
- **Vercel không thấy repo**: cấp quyền GitHub App cho repo đó.
- **Trang 404 hoặc build sai thư mục**: kiểm tra **Root Directory** là `./` hoặc `vietra`, **Output Directory** là `dist`.
- **API báo `AUTH_SECRET chưa được cấu hình`**: thêm biến môi trường cho đúng môi trường (Production/Preview) rồi redeploy.
- **Lỡ commit `.env`**: thu hồi token Turso, đổi `AUTH_SECRET` và mật khẩu admin; chạy `git rm --cached .env`, commit lại. Nếu repo public, cần xoá file khỏi lịch sử Git trước khi tiếp tục.

### Link cố định và tên miền

- Link production mặc định: `https://<project-name>.vercel.app`. Nếu tên `vietra` còn trống, link sẽ là `https://vietra.vercel.app`; nếu đã bị dùng, Vercel thêm hậu tố.
- Link production không đổi khi deploy lại. Preview deployment có URL riêng và thay đổi mỗi lần.
- Đổi tên hoặc xem link: **Project → Settings → Domains**.
- Tên miền riêng: thêm domain trong **Settings → Domains**, trỏ CNAME `cname.vercel-dns.com` cho subdomain, hoặc dùng nameserver của Vercel cho domain gốc.

### Kiểm tra sau deploy

- Mở `https://<project>.vercel.app/api/health`; kết quả phải có `{"ok":true,"database":"turso"}`. Nếu 500, kiểm tra bốn biến bắt buộc `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, `ADMIN_PASSWORD`.
- Đăng nhập bằng tài khoản seed, mở Đơn đặt chỗ và thử mã mẫu `VIE7K2M4A` ở trang Theo dõi.
- Bản đồ dùng tile OpenStreetMap qua HTTPS; nếu mạng chặn tile, nền lưới và tuyến vẫn hiển thị.

### Lỗi thường gặp

- **Build báo Node không tương thích:** vào **Settings → General → Node.js Version**, chọn 22.x.
- **Trang trắng hoặc 404:** kiểm tra **Root Directory** trỏ đúng `vietra` (hoặc `./` nếu repo chính là thư mục này) và **Output Directory** là `dist`.
- **Sau này thêm React Router:** thêm rewrite SPA vào `vercel.json` để refresh đường dẫn con không bị 404:

  ```json
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  ```

- **Bản đồ bị giới hạn tile:** OpenStreetMap phù hợp cho demo; nếu có nhiều người dùng, chuyển sang nhà cung cấp tile có gói phù hợp (MapTiler, Stadia Maps...).

### Lưu ý dữ liệu khi chia sẻ link

Booking, chứng từ, lô hàng, kịch bản và thông báo được lưu trên server. Khách hàng chỉ thấy dữ liệu thuộc tài khoản của mình; admin thấy toàn bộ đơn và lô hàng. Vì vậy người nhận link phải đăng nhập, không dùng chung phiên với bạn.

Nút **Đặt lại dữ liệu mô phỏng** chỉ hiện với admin và xoá toàn bộ booking/lô hàng/tình huống/thông báo của mọi tài khoản, sau đó seed lại; tài khoản người dùng được giữ nguyên.

## Backend, đăng nhập và phân quyền

- **Stack:** Express 4 chạy trong Vercel Function `api/index.ts`; database libSQL/Turso; JWT HS256 trong cookie HttpOnly 7 ngày; mật khẩu hash bằng bcrypt; validate bằng Zod. Rewrite toàn bộ `/api/*` về `/api?path=...` giữ API dưới một function và chuyển path gốc cho Express.
- **Database cục bộ:** `.data/vietra.db` (libSQL file), tự tạo schema/seed khi chạy `npm run db:init` hoặc request API đầu tiên.
- **Database production:** Turso qua `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN`. Không có API key nào trong frontend.
- **Phân quyền:**
  - Khách hàng: tạo booking, tải/thay chứng từ của mình, xem lô hàng và thông báo của mình.
  - Admin: xem toàn bộ booking/lô hàng/tình huống, xác minh hoặc yêu cầu bổ sung chứng từ.
  - Cả hai không thể đổi dữ liệu của người khác; API trả 403/404 khi sai phạm vi.
- **Cấp mã vận tải:** server kiểm tra đủ chứng từ, tạo mã duy nhất trong transaction và tạo shipment. Unique index trên `shipments.code` và `bookings.tracking_code` chặn trùng mã kể cả khi hai request đến cùng lúc.
- **Thông báo:** lưu theo `user_id`; cảnh báo vận chuyển có unique index `(user_id, dedupe_key)` nên tua ngược/chạy lại không tạo trùng.

### API chính

| Method | Endpoint | Quyền |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Công khai, tạo tài khoản khách hàng |
| `POST` | `/api/auth/login` | Công khai, đặt cookie phiên |
| `POST` | `/api/auth/logout` | Xoá cookie |
| `GET` | `/api/auth/me` | Phiên hiện tại |
| `GET` | `/api/state` | Booking/shipment/scenario của mình; admin nhận toàn bộ |
| `POST` | `/api/bookings` | Tạo booking cho tài khoản hiện tại |
| `GET` | `/api/bookings/:id` | Chủ sở hữu hoặc admin |
| `POST` | `/api/bookings/:id/documents/:slotId` | Chủ sở hữu, thay metadata tệp |
| `POST` | `/api/bookings/:id/documents/:documentId/verify` | Admin |
| `POST` | `/api/bookings/:id/documents/:documentId/request-fix` | Admin |
| `POST` | `/api/shipments/:id/handover` | Chủ sở hữu hoặc admin, idempotent |
| `GET` | `/api/shipments/:code` | Chủ sở hữu hoặc admin |
| `POST/PATCH/DELETE` | `/api/scenarios`, `/api/scenarios/:id` | Chủ sở hữu lô hàng hoặc admin |
| `POST` | `/api/notifications/transport-alert` | Chủ sở hữu lô hàng, dedupe server-side |
| `PATCH` | `/api/notifications/:id/read` | Chủ sở hữu thông báo |
| `POST` | `/api/notifications/read-all` | Chủ sở hữu thông báo |
| `POST` | `/api/demo/reset` | Admin |
| `GET` | `/api/health` | Công khai, kiểm tra kết nối database |

### Bảo mật và giới hạn auth

- Production bắt buộc `AUTH_SECRET`, `ADMIN_PASSWORD`, `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN`; thiếu biến sẽ lỗi rõ thay vì chạy bằng secret mặc định.
- Chưa có email verification, quên mật khẩu, đăng nhập mạng xã hội, refresh token hay bảng thu hồi session. Đây là auth mức demo, không dùng cho dữ liệu khách hàng thật.
- Cookie dùng `SameSite=Lax`, `HttpOnly`; request đổi dữ liệu trên Vercel được kiểm tra Origin cùng host.
- Tệp chứng từ chỉ lưu **tên và dung lượng**, chưa upload nội dung. Muốn upload thật, thêm Vercel Blob/S3 và lưu storage key.

## Chức năng 1 — Báo giá và đặt chỗ

- **Yêu cầu báo giá**: chọn “giao đến kho / chúng tôi đến lấy”, địa chỉ đi–đến có gợi ý cục bộ (từ 3 ký tự, không gọi API thật), quốc gia A–Z, Freight Prepaid/Collect, Quick Estimation/FCL/LCL, nhiều dòng hàng kèm quy đổi thể tích, container tham khảo, hàng hoá đặc biệt, liên hệ và điều khoản.
- **So sánh dịch vụ**: bảng 4 phương án theo thiết kế Port ledger, lọc “chỉ phương án phù hợp”, sắp xếp theo về sớm/giá/phát thải, điều kiện riêng cạnh giá, dữ liệu mẫu được đánh dấu rõ.
- **Đặt chỗ 5 bước**: Dịch vụ → Tuyến đường → Hàng hoá → Chứng từ → Thanh toán, có bước xem lại, sửa từng nhóm, tính phí minh hoạ và điều khoản cuối.
- **Chứng từ theo từng mục bắt buộc**: hóa đơn thương mại, packing list, vận đơn theo phương thức (B/L, AWB, CIM/SMGS), MSDS + khai báo hàng nguy hiểm khi có DG, chứng nhận bảo hiểm khi chọn bảo hiểm. Mỗi mục nhận tối đa một tệp, giới hạn 10 MB/tệp.
- **Admin chỉ xác minh chứng từ**: mở “Hồ sơ chứng từ” từ danh sách đơn để Xác minh hoặc Yêu cầu bổ sung kèm lý do. Không còn duyệt/từ chối booking, không xác nhận bàn giao.
- **Cấp mã tự động**: booking ở trạng thái `Chờ xác minh chứng từ` hoặc `Cần bổ sung chứng từ`; khi **toàn bộ tài liệu bắt buộc đã xác minh**, hệ thống tự cấp mã `VIEXXXXXX` (9 ký tự, không trùng) và tạo lô hàng cho trang Theo dõi.
- **Người dùng thay tệp**: khi một tài liệu bị yêu cầu bổ sung, người gửi thấy lý do và có thể tải tệp mới; tệp mới chuyển về “Chờ xác minh”.

## Trung tâm thông báo

- Biểu tượng chuông ở header hiển thị số thông báo chưa đọc; mở ra danh sách có tab **Tất cả / Chưa đọc**, đánh dấu từng thông báo hoặc tất cả đã đọc.
- Bốn loại thông báo được phát tự động:
  - **Chứng từ cần bổ sung** — kèm lý do admin nhập; bấm vào mở đúng hồ sơ chứng từ của booking.
  - **Đã cấp mã vận tải** — kèm mã `VIEXXXXXX`; bấm vào mở thẳng trang Theo dõi lô hàng đó.
  - **Đã bàn giao tự động** — xác nhận xe đã lấy hàng hoặc hàng đã vào kho theo giờ mô phỏng; bấm vào mở tracking.
  - **Cảnh báo vận chuyển** — chậm trễ hoặc sự cố phát sinh khi đồng hồ mô phỏng đi qua cảnh báo, hoặc khi thêm tình huống đang hiệu lực. Mỗi cảnh báo chỉ phát một lần cho mỗi lô, kể cả khi tua ngược rồi chạy lại. Bấm vào thông báo sẽ mở đúng lô, đặt đồng hồ về thời điểm cảnh báo, chọn chặng liên quan trên bản đồ và mở tab Chặng vận tải.
- Thông báo lưu trên server theo từng tài khoản. Tài khoản khách hàng seed có 5 thông báo, trong đó 2 chưa đọc (một yêu cầu bổ sung và một cảnh báo bão) để thử.

## Chức năng 2 — Theo dõi lô hàng

- Tra cứu bằng mã vận tải; mã mẫu: `VIE7K2M4A`, `VIE5R8T1C`, `VIE3N6B9D`.
- Bản đồ tương tác Leaflet cho toàn hành trình, phân biệt tuyến dự kiến (nét đứt) và hành trình mô phỏng (nét liền), màu theo phương thức, cam cho chậm trễ, đỏ cho sự cố/đóng đường. Có lưới kinh–vĩ độ và nhãn đại dương/châu lục làm nền dự phòng khi không tải được tile bản đồ.
- **Bàn giao tự động**: mốc cut-off nhập kho hoặc giờ xe đến lấy do lịch mô phỏng quyết định. Khi giờ mô phỏng đi qua mốc này, lô hàng tự chuyển sang trạng thái vận chuyển; người dùng có nút “Tua tới mốc bàn giao”.
- Đồng hồ mô phỏng analog + số, kéo kim để đổi giờ, thanh timeline, tua ±1 giờ/±1 ngày, phát/dừng, tỷ lệ thời gian 1×–3600×.
- Quản lý tình huống: tạo, sửa, bật/tắt, xoá, cùng hai kịch bản nhanh “Kẹt xe giờ cao điểm” và “Đóng đường + tuyến vòng”. Hỗ trợ ùn tắc theo bán kính, tai nạn, đóng đường, tuyến vòng, bão, ùn cảng/ga, gián đoạn an ninh, hoãn bay.
- ETA động, cảnh báo (chậm khởi hành/đến, chờ lâu, sự cố) có mức độ/ảnh hưởng/trạng thái ghi nhận; nhật ký sự kiện lọc theo phương thức, trạng thái, mức độ, loại cảnh báo, thời gian.
- Tua ngược khôi phục đúng vị trí, vận tốc, ETA và cảnh báo.

## Kiến trúc

```
api/
  index.ts      entry Vercel Function, nhận rewrite /api?path=... và chuyển vào Express app
server/
  app.ts        route Express, auth, state, booking, shipment, scenario, notification
  db.ts         schema libSQL, seed, reset, map row -> domain
  auth.ts       bcrypt, JWT cookie, requireAuth/requireAdmin
  bookingRules.ts  quy tắc chứng từ, cấp mã duy nhất, tạo shipment, notification
  validation.ts    Zod schema cho auth, booking, document, scenario, alert
  app.test.ts      test API: scoping, cấp mã, dedupe, scenario
src/
  api/          fetch client + response types
  store/        AuthStore (phiên) + AppStore (dữ liệu API, quote draft)
  data/         tuyến mẫu, dịch vụ, quốc gia, seed booking/lô hàng/tình huống
  sim/          engine mô hình thuần + kiểm thử (geo, engine, types)
  features/
    auth/       đăng nhập/đăng ký, session gate
    quote/      form báo giá và xác thực
    services/   bảng so sánh Port ledger + cầu nối liên hệ
    booking/    5 bước đặt chỗ, tính phí
    bookings/   danh sách, quy tắc chứng từ, panel xác minh, chứng từ mẫu
    tracking/   bản đồ, đồng hồ, tình huống, bảng chặng/sự kiện/cảnh báo
  components/   shell, địa chỉ, icon phương thức
  styles/       token thiết kế + primitive dùng chung
```

- `server/bookingRules.ts`: dùng chung quy tắc `requiredDocumentSlots`/`documentState` với frontend, nhưng việc cấp mã và tạo shipment chạy trong transaction ở server. Mã được kiểm tra unique qua database.
- `server/app.ts`: khách hàng chỉ đọc/ghi dữ liệu có `user_id` của mình; admin đọc toàn bộ booking/shipment/scenario. Upload chứng từ chỉ chủ sở hữu; verify/request-fix chỉ admin.
- `src/store/AppStore.tsx`: gọi API `/state` sau mỗi thao tác; không còn lưu dữ liệu nghiệp vụ trong `localStorage`. Chỉ `quoteDraft`, dịch vụ đang chọn và mã đang theo dõi là state trong phiên.
- `src/store/AuthStore.tsx`: `GET /auth/me` khi mở app; login/register đặt cookie HttpOnly; 401 tự đưa về màn hình đăng nhập.
- `components/shell/NotificationCenter.tsx`: popover thông báo ở header, lọc chưa đọc, đánh dấu đã đọc và điều hướng theo loại thông báo.
- `features/tracking/alertNotifications.ts`: chuyển cảnh báo mô phỏng thành payload thông báo kèm `shipmentCode`, `alertId`, `legId`, nhãn chặng và giờ mô phỏng; bỏ qua cảnh báo chỉ mang tính thông tin.
- `store/notifications.ts`: chống trùng cảnh báo theo cặp mã lô + mã cảnh báo, kể cả khi chạy lại mô phỏng.
- `features/tracking/TransportAlertBanner.tsx`: banner cảnh báo đang mở sau deep-link, nêu mức độ, chặng, thời điểm và mức ảnh hưởng.
- `sim/engine.ts`: hàm thuần `buildJourney(shipment, scenarios)` và `snapshotAt(journey, time)`, nên tua tiến/lùi luôn nhất quán.

## Dữ liệu demo

- Booking seed được gán cho tài khoản khách hàng `customer@vietra.vn`: 3 booking đã cấp mã (chứng từ đã xác minh), 1 booking đường sắt `BK-4` đang “Cần bổ sung chứng từ" (1/6, có một tệp bị yêu cầu sửa) để thử panel xác minh. Admin thấy cả 4 booking và 3 lô hàng.
- Tài khoản khách hàng có 5 thông báo seed (2 chưa đọc) để thử trung tâm thông báo. Tài khoản admin có danh sách thông báo riêng, ban đầu trống.
- Nút “Đặt lại dữ liệu mô phỏng” chỉ hiện với admin, xoá booking/lô hàng/tình huống/thông báo của mọi tài khoản rồi seed lại; không xoá user.
- Database cục bộ: `.data/vietra.db` (đã gitignore). Production: Turso. Dữ liệu `localStorage` phiên bản v6 của bản mockup cũ **không được migrate**; hãy dùng dữ liệu seed mới.

## Giới hạn đã biết

- Tệp chứng từ chỉ lưu tên và dung lượng; chưa upload nội dung, chưa OCR và chưa kiểm tra tính hợp lệ của tệp. Muốn upload thật cần thêm Vercel Blob/S3.
- Auth ở mức demo: chưa có xác minh email, quên mật khẩu, refresh token, thu hồi session hay đăng nhập mạng xã hội. Không dùng cho dữ liệu khách hàng thật.
- Mô phỏng vận tải vẫn chạy ở client; server chỉ lưu shipment/kịch bản. Cảnh báo chỉ phát khi trang Theo dõi đang mở và đồng hồ mô phỏng đi qua cảnh báo, hoặc khi thêm tình huống đang hiệu lực. Không có scheduler/WebSocket.
- Không có email hay push; thông báo được tải lại khi mở app hoặc sau thao tác, không phải realtime.
- Nút reset của admin ảnh hưởng toàn bộ người dùng trong database.
- Bản đồ dùng tile OpenStreetMap; nếu mạng chặn tile, nền lưới và tuyến vẫn hiển thị nhưng không có địa hình chi tiết.
- Tuyến đường và ETA dựa trên lịch mô phỏng cố định, không phải lịch tàu/chuyến bay thật.
- “Đổi cảng trung chuyển” và “đổi đường bay” chưa thay đổi hình học tuyến; tuyến vòng đường bộ chỉ cộng thêm quãng đường và thời gian.
- Chưa có kiểm tra nội dung tệp, OCR hay quy trình phê duyệt nhiều cấp.
