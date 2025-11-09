# Smart Dental Healthcare – Agent Guide

## Mission Snapshot

- Provide fast, context-aware support for a tri-surface stack (web, mobile, backend) serving dental scheduling, follow-ups, and patient engagement.
- Prioritize maintaining end-to-end flows: appointment booking, notifications, telehealth/chat, and cloud asset handling.
- Keep guidance rooted in the repo docs; call out mismatches (several README files are boilerplate or outdated).

## Repo Topography

- `client/` Next.js 15 app using the App Router, Redux Toolkit, Radix UI, Tailwind v4, and NextAuth beta; see feature notes in `client/README.md`.
- `server/` NestJS 11 API with MongoDB, sockets, mailer, and Gemini AI helpers; scripts for seeding doctors/medications and Cloudinary diagnostics under `scripts/`.
- `mobile/` Expo Router app (React Native 0.81) sharing auth/chat utilities; starts on port 8082 to align with CORS in `server/env.example`.
- Domain briefs live in root Markdown files (`APPOINTMENT_FIXES_SUMMARY.md`, `ENHANCED_CHATBOT_INTEGRATION.md`, etc.); skim before touching related modules.
- `docker-compose.yml` orchestrates services when local Mongo or future services are needed; confirm versions before relying on it.

## Prerequisites & Tooling

- Node.js 18+ (aligns with Next 15 and Expo 54), npm preferred; ensure `npm install -g expo-cli` if running native emulators.
- MongoDB reachable at `mongodb://localhost:27017/smart_dental_healthcare` unless overriding `MONGODB_URI`.
- Cloudinary credentials and Gemini API key required for media upload and AI flows; copy `server/env.example` when provisioning.
- VS Code recommended with ESLint and Tailwind plugins; repository already includes shared configs (`eslint.config.mjs`, `.prettierrc`).

## Runbooks

- **API (NestJS)**: `cd server; npm install; cp env.example .env` (fill secrets); start with `npm run dev`; tests via `npm run test`, lint via `npm run lint`; use seed scripts (`npm run seed:doctors`, `npm run seed:medications`) to populate baselines.
- **Web (Next.js)**: `cd client; npm install; cp .env.example .env` (if present) or sync with backend team; launch `npm run dev` (Turbopack, port 3000); `npm run lint` enforces rules; `npm run build` before deployment.
- **Mobile (Expo)**: `cd mobile; npm install; cp .env.example .env` (create if missing based on backend env); run `npm start` or platform-specific scripts (`npm run android`, `npm run ios`, `npm run web`) which bind to port 8082; Expo lint via `npm run lint`.
- **Full stack loop**: start backend first (port 8081), then web and/or mobile; confirm CORS origins include `http://localhost:3000`.

## Quality Bar

- Respect TypeScript strictness; prefer typed hooks/selectors in `client/src/hooks/` and shared models in `client/src/types/`.
- Keep Redux changes consistent with guidance in `REDUX_MIGRATION_SUMMARY.md`; centralize state where noted.
- Socket features touch both `server/src` gateways and web/mobile chat utilities—verify interfaces in tandem.
- Before PRs, run `npm run lint` and relevant tests per surface; add or update tests in `server/test/` and client component/unit harnesses as features expand.

## Collaboration Patterns

- When requesting help, paste file paths plus snippets; link related domain docs from the root for clarity.
- Note environment assumptions (ports, third-party keys) so commands can be reproduced.
- For architectural questions, identify whether change targets web, mobile, backend, or shared contracts to fetch the right context quickly.
- Use the Decision Log to capture assumptions or pending clarifications; keep it pruned so future assistants enter with clean state.

## Optional MCP Hooks

- **Command:repo-search** → enable fuzzy codebase queries (map to ripgrep or built-in search).
- **Command:npm-lint** → wraps `npm run lint` for `client`, `mobile`, `server` depending on requested surface.
- **Command:npm-test** → runs appropriate test suites (`client` currently lacks tests; backend uses Jest).
- **Command:env-sync** → script that copies `server/env.example` into each surface and flags missing secrets.
- These are helpful but not required; plain npm scripts already cover core workflows.

## Decision Log

### November 8, 2025 - Payment & Revenue Realtime Updates

**Issue:** Đặt lịch hẹn và thanh toán bằng ví luôn thì chưa tạo được bill cho bác sĩ (Revenue). Và cần cập nhật realtime cho 2 trang payment và revenue khi có thay đổi.

**Solution:**

1. ✅ Thêm `createRevenueFromPayment()` vào `payForAppointment()` method trong `wallet.service.ts`
2. ✅ Tạo `PaymentGateway` (namespace: `/payments`) để emit realtime events cho patient
3. ✅ Inject `PaymentGateway` vào `BillingHelperService` và `WalletService`
4. ✅ Emit events:
   - `payment:new` khi tạo payment mới (refund, cancellation_charge, wallet payment)
   - `payment:delete` khi xóa pending bills
   - Revenue events đã có sẵn qua `RevenueGateway` (namespace: `/revenue`)

**Files Modified:**

- `server/src/modules/payments/payment.gateway.ts` (NEW)
- `server/src/modules/payments/payments.module.ts` (export PaymentGateway)
- `server/src/modules/payments/billing-helper.service.ts` (inject & emit)
- `server/src/modules/wallet/wallet.service.ts` (inject & emit, add revenue creation)

**Frontend Action Required:**

- Client cần connect socket tới namespace `/payments` với `auth: { userId }`
- Listen events: `payment:new`, `payment:update`, `payment:delete`
- Đã có sẵn `/revenue` socket cho doctor (listen `revenue:new`)

See: `BILLING_FIX_SUMMARY.md` for complete billing system fixes.

### November 9, 2025 - Doctor Cancellation & Platform Fee Fix

**Issue:**

1. Khi bác sĩ hủy lịch thì trang payment chưa được auto reload dữ liệu mới
2. Bill phí giữ chỗ của bác sĩ KHÔNG bị trừ 5% platform fee (sai logic - phải trừ 5%)
3. Bill hoàn tiền bị trừ 5% platform fee (sai logic - không được trừ phí khi refund)

**Root Causes:**

1. ❌ Method `deletePendingConsultationFeeBills()` xóa pending bills nhưng KHÔNG emit socket events
2. ❌ Filter quá strict với `paymentId: { $in: consultationFeePaymentIds }` → không xóa được revenue khi array rỗng
3. ❌ `createPendingReservationCharge()` set `platformFee: 0` → SAI, phải trừ 5%
4. ❌ `createRevenueFromPayment()` tính 5% cho TẤT CẢ bills (kể cả refund) → SAI, refund không trừ phí

**Solution:**

1. ✅ Fix `deletePendingConsultationFeeBills()` trong `billing-helper.service.ts`:

   - Xóa TẤT CẢ pending revenues (trừ cancellation_charge) dùng `$nin`
   - Emit `payment:delete` và `revenue:delete` events

2. ✅ Fix `createPendingReservationCharge()` trong `billing-helper.service.ts`:

   - Tính `platformFee: -2,500` (5% của 50,000)
   - `netAmount: 47,500` (bác sĩ thực nhận sau trừ phí)

3. ✅ Fix `createRevenueFromPayment()` trong `revenue.service.ts`:
   - Check `billType === 'refund'` → platformFee = 0
   - Tất cả bill khác (consultation_fee, cancellation_charge, reservation_fee) → trừ 5%

**Platform Fee Logic:**

- ✅ Consultation fee (phí khám): TRỪ 5%
- ✅ Cancellation charge (phí giữ chỗ): TRỪ 5%
- ✅ Reservation fee (phí đặt chỗ): TRỪ 5%
- ❌ Refund (hoàn tiền): KHÔNG TRỪ phí (bác sĩ trả lại tiền)

**Files Modified:**

- `server/src/modules/payments/billing-helper.service.ts` (fix delete logic + platform fee)
- `server/src/modules/revenue/revenue.service.ts` (skip platform fee for refunds only)

**Impact:**

- ✅ Bác sĩ bị trừ 5% cho phí giữ chỗ (đúng logic kinh doanh)
- ✅ Bác sĩ KHÔNG bị trừ phí khi hoàn tiền cho patient
- ✅ Payment/Revenue pages auto-reload với socket events

See: `DOCTOR_CANCELLATION_FIX.md` for complete analysis.

### November 9, 2025 - Doctor Cancellation Auto-Reload Fix

**Issue:** Khi bác sĩ hủy lịch thì trang payment chưa được auto reload dữ liệu mới. Và bác sĩ hủy với trường hợp bệnh nhân đến muộn chưa tạo được bill +50,000 cho bác sĩ.

**Root Causes:**

1. ❌ Method `deletePendingConsultationFeeBills()` xóa pending bills nhưng KHÔNG emit socket events
2. ❌ Filter quá strict với `paymentId: { $in: consultationFeePaymentIds }` → không xóa được revenue khi array rỗng
3. ✅ Bill +50k cho bác sĩ ĐÃ được tạo trong `createPendingReservationCharge()` (không phải bug)

**Solution:**

1. ✅ Fix `deletePendingConsultationFeeBills()` trong `billing-helper.service.ts`:
   - Lấy danh sách payments và revenues TRƯỚC KHI XÓA
   - **NEW APPROACH**: Xóa TẤT CẢ pending revenues (trừ cancellation_charge revenues)
   - Dùng `$nin` để exclude revenues có `paymentId` link đến cancellation_charge payments
   - Emit `payment:delete` events → Patient
   - Emit `revenue:delete` events → Doctor

**Files Modified:**

- `server/src/modules/payments/billing-helper.service.ts` (improved filtering logic + socket emissions)

**Impact:**

- ✅ Xóa được TẤT CẢ pending revenues của consultation_fee (kể cả khi không có billType field)
- ✅ Không xóa nhầm cancellation_charge revenue vừa tạo
- ✅ Payment page auto-reload khi doctor hủy lịch (emergency hoặc patient_late)
- ✅ Revenue page auto-reload khi doctor hủy lịch
- ✅ Đồng nhất với patient cancellation flow (đã hoạt động tốt)

See: `DOCTOR_CANCELLATION_FIX.md` for complete analysis and test cases.
