# Panduan Deploy — Vercel + Neon (PostgreSQL)

Panduan ini menyiapkan SIM (Store Inventory Management) ke produksi di **Vercel** dengan database
**Neon**. Aplikasi sudah siap deploy (build lulus, driver DB sudah di-tune untuk
serverless). Yang perlu kamu lakukan hanya langkah-langkah di bawah — sebagian
harus lewat akun Vercel/Neon-mu sendiri.

> Ringkasnya: **Neon** = buat DB & ambil connection string. **Vercel** = connect
> repo + set env. **Sekali di awal**: jalankan migrasi + seed ke DB Neon.

---

## 1. Buat database di Neon

1. Masuk ke <https://neon.tech> → **Create project** (pilih region terdekat, mis.
   Singapore `ap-southeast-1`).
2. Di dashboard project, buka **Connection Details**. Kamu akan melihat dua
   bentuk connection string:
   - **Pooled** (host mengandung `-pooler`) → dipakai aplikasi saat runtime.
   - **Direct** (tanpa `-pooler`) → dipakai untuk migrasi/seed (DDL).
3. Salin keduanya (aktifkan opsi *"Pooled connection"* untuk mendapat yang
   pooled). Format: `postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`

---

## 2. Terapkan skema + data awal ke Neon (sekali saja)

Dari komputer lokal, arahkan `DATABASE_URL` ke connection string **Direct** Neon,
lalu jalankan migrasi dan seed:

```bash
# pakai connection string DIRECT (tanpa -pooler) untuk DDL
export DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

npm run db:migrate    # buat semua tabel + index
npm run db:seed       # isi 11 site, 4 seksi, item contoh, akun demo
```

Setelah ini DB Neon sudah berisi skema + akun login.

> **Penting keamanan:** akun demo (`admin@stokman.test`) dari seed hanya untuk
> pengujian. Di produksi, segera login → **Profil** → ganti password, lalu buat
> akun Admin asli dan hapus/nonaktifkan akun demo di halaman **Pengguna**.

---

## 3. Connect repo ke Vercel

1. Masuk ke <https://vercel.com> → **Add New… → Project** → **Import** repo
   `nanonymou/store-inventory-management`.
2. Framework otomatis terdeteksi **Next.js** — biarkan default (Build Command
   `next build`, Output otomatis). **Jangan** deploy dulu; set env dulu (langkah 4).

### (Opsional, paling mudah) Integrasi native Vercel ↔ Neon
Di **Vercel → Storage → Marketplace → Neon**, kamu bisa membuat/menghubungkan DB
Neon langsung dari Vercel. Ini otomatis menyuntikkan variabel `DATABASE_URL` /
`POSTGRES_URL` ke project — melewati langkah set env manual di bawah. Kamu tetap
perlu menjalankan migrasi + seed (langkah 2) sekali.

---

## 4. Set Environment Variables di Vercel

Di **Project → Settings → Environment Variables**, tambahkan (untuk
**Production** dan **Preview**):

| Key | Value |
| --- | --- |
| `DATABASE_URL` | connection string **Pooled** Neon (host `-pooler`, `?sslmode=require`) |

Aplikasi juga membaca `POSTGRES_URL` sebagai fallback, jadi salah satu cukup.
Gunakan endpoint **pooled** di runtime — driver kita sudah `prepare:false` +
`max:1`, cocok dengan transaction pooler Neon.

---

## 5. Deploy

- Klik **Deploy**. Vercel build (~1–2 menit) lalu memberi URL produksi.
- Vercel otomatis deploy ulang setiap ada push ke **production branch**, dan
  membuat **Preview Deployment** untuk setiap Pull Request.
- Pastikan **Production Branch** di **Settings → Git** menunjuk ke branch yang
  kamu inginkan sebagai produksi (mis. `main` setelah PR di-merge).

---

## 6. Verifikasi

1. Buka `https://<domain-vercel>/api/health` → harus `{"ok":true,"status":"healthy","db":"up"}`.
2. Buka `/login`, masuk sebagai Admin, cek Dashboard / Transaksi / Master Item /
   Pengguna.
3. Kalau `/api/health` mengembalikan **503**, cek `DATABASE_URL` (harus pooled +
   `sslmode=require`) dan bahwa migrasi (langkah 2) sudah dijalankan.

---

## Catatan produksi

- **Runtime**: semua route DB memakai Node.js runtime (bukan Edge) — sudah diset.
- **Migrasi berikutnya**: setiap ubah skema → `npm run db:generate`, commit, lalu
  jalankan `npm run db:migrate` (connection DIRECT) sekali terhadap DB produksi.
  Jangan menjalankan migrasi di dalam build Vercel.
- **Backup**: aktifkan retensi/PITR di Neon (tier berbayar) untuk data produksi.
- **Neon vs Supabase**: untuk aplikasi ini (auth custom + RBAC server-side) Neon
  adalah pilihan paling mulus dengan Vercel. Pindah ke Supabase hanya bila nanti
  butuh Storage/Realtime/Auth bawaannya.
