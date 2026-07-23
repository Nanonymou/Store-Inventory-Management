# SIM — Store Inventory Management

Aplikasi manajemen stok harian multi-site: pencatatan transaksi, dashboard nilai
persediaan, master item, transfer & penyesuaian stok antar 11 lokasi, dengan
otentikasi berbasis peran (Admin / Storeman) dan audit log.

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** + komponen ala shadcn/ui
- **Drizzle ORM** + **PostgreSQL**
- Otentikasi: session httpOnly cookie (scrypt password hashing)
- Export: `xlsx` (Excel), `jspdf` + `jspdf-autotable` (PDF)

## Menjalankan (dengan database)

Seluruh halaman kini mengambil data dari API sungguhan (`/api/*`), sehingga
membutuhkan PostgreSQL.

```bash
# 1. Install dependencies
npm install

# 2. Konfigurasi koneksi database
cp .env.example .env
#   → isi DATABASE_URL (atau POSTGRES_URL) ke instance Postgres Anda

# 3. Terapkan skema
npm run db:migrate

# 4. Isi data awal + akun demo
npm run db:seed

# 5. Jalankan
npm run dev        # http://localhost:3000
```

### Akun demo (dibuat oleh `db:seed`)

| Peran | Email | Password |
| --- | --- | --- |
| Admin | `admin@stokman.test` | `admin123` |
| Storeman (Site A) | `storeman.a@stokman.test` | `storeman123` |
| Storeman (Site B) | `storeman.b@stokman.test` | `storeman123` |

Admin diarahkan ke **Dashboard** dan dapat berpindah antar 11 site, mengelola
master item, transfer, penyesuaian, **pengguna** (`/users`), dan melihat audit
log. Storeman terkunci pada site-nya dan halaman **Transaksi Harian** (hanya
bisa input tanggal hari ini; tanggal lampau hanya bisa dilihat).

- **Manajemen Pengguna** (`/users`, Admin): buat/edit/hapus akun, reset password
  sementara. Akun baru & yang direset **wajib ganti password saat login pertama**.
- **Profil** (`/profile`): setiap pengguna bisa mengubah passwordnya sendiri
  (klik nama pengguna di kanan atas).
- **Health check** (`GET /api/health`): probe koneksi database (200 sehat /
  503 bila DB tidak terjangkau).

## Perintah database

| Perintah | Fungsi |
| --- | --- |
| `npm run db:generate` | Generate migrasi dari perubahan skema |
| `npm run db:migrate` | Terapkan migrasi ke database |
| `npm run db:seed` | Isi data referensi + akun demo (idempoten) |
| `npm run db:studio` | Buka Drizzle Studio |

## Arsitektur akses

- **Edge middleware**: memaksa sesi login untuk semua halaman & memblokir rute
  khusus Admin bagi Storeman (→ halaman Akses Ditolak).
- **Server guards** (`src/lib/auth`): `requireAdminApi`, `resolveStockSiteScope`,
  `assertCanEditDate`, dll. — otorisasi role + site di setiap endpoint, dengan
  pencatatan audit pada setiap penolakan.
- **Audit otomatis**: setiap mutasi (transaksi, item, transfer, penyesuaian,
  user, login/logout) tercatat di `audit_logs`.

## Deployment

Siap di-deploy ke **Vercel** dengan **Vercel Postgres** (variabel `POSTGRES_URL`
otomatis terbaca). Jalankan `npm run db:migrate && npm run db:seed` sekali pada
database produksi.
