import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Minus,
  ShieldCheck,
  UserPlus,
  UserRound,
} from 'lucide-react'
import styles from './AuthPage.module.css'
import { ApiError } from '../../api/client'
import { useAuth } from '../../store/AuthStore'

const DEMO_PASSWORD = 'VieTra@2026'

type Mode = 'login' | 'register'

const ACCOUNTS: Array<{
  role: 'customer' | 'admin'
  roleLabel: string
  name: string
  email: string
  company: string
  code: string
}> = [
  {
    role: 'customer',
    roleLabel: 'Khách hàng',
    name: 'Nguyễn Thu Hà',
    email: 'customer@vietra.vn',
    company: 'An Phát Logistics',
    code: 'CUSTOMER',
  },
  {
    role: 'admin',
    roleLabel: 'Quản trị',
    name: 'Quản trị VieTra',
    email: 'admin@vietra.vn',
    company: 'VieTra Operations',
    code: 'ADMIN',
  },
]

export function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [filledRole, setFilledRole] = useState<'customer' | 'admin' | null>(null)

  const fillDemo = (account: (typeof ACCOUNTS)[number]) => {
    setMode('login')
    setEmail(account.email)
    setPassword(DEMO_PASSWORD)
    setFilledRole(account.role)
    setError('')
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setPassword('')
    if (next === 'login') {
      setFilledRole(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register({
          name: name.trim(),
          company: company.trim() || undefined,
          email: email.trim(),
          password,
        })
      }
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'Không thể hoàn tất đăng nhập. Thử lại sau.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.sheet}>
        <header className={styles.sheetHead}>
          <div className={styles.brandBlock}>
            <span className={styles.brandMark} aria-hidden="true">
              V
            </span>
            <div className={styles.brandText}>
              <strong>VieTra</strong>
              <span>Điều hành vận tải quốc tế</span>
            </div>
          </div>
          <span className={styles.demoBadge}>
            <ShieldCheck size={12} aria-hidden="true" /> Dữ liệu mô phỏng
          </span>
          <span className={styles.sessionMeta}>Phiên 7 ngày · Cookie HttpOnly</span>
        </header>

        <div className={styles.body}>
          <aside className={styles.access} aria-label="Tài khoản seed và quyền truy cập">
            <div className={styles.asideHead}>
              <h2>Bàn truy cập</h2>
              <p>
                Chọn vai trò để điền tài khoản seed, rồi đăng nhập. Dữ liệu và thông báo
                được tách theo từng tài khoản.
              </p>
            </div>

            <div className={styles.accountList}>
              {ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  className={`${styles.account} ${
                    filledRole === account.role ? styles.accountActive : ''
                  }`}
                  aria-pressed={filledRole === account.role}
                  onClick={() => fillDemo(account)}
                >
                  <span className={styles.accountTop}>
                    <span className={styles.accountRole}>
                      {account.role === 'admin' ? (
                        <ShieldCheck size={12} aria-hidden="true" />
                      ) : (
                        <UserRound size={12} aria-hidden="true" />
                      )}
                      {account.code}
                    </span>
                    <span className={styles.fillAction}>
                      Điền <ArrowRight size={11} aria-hidden="true" />
                    </span>
                  </span>
                  <span className={styles.accountName}>{account.name}</span>
                  <span className={styles.accountEmail}>{account.email}</span>
                  <span className={styles.accountCompany}>{account.company}</span>
                </button>
              ))}
            </div>

            <table className={styles.scopeTable}>
              <caption className="srOnly">Quyền dữ liệu theo vai trò</caption>
              <thead>
                <tr>
                  <th scope="col">Phạm vi</th>
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Quản trị</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Đơn đặt chỗ của tôi</th>
                  <td>
                    <Check size={12} aria-label="Có" />
                  </td>
                  <td>
                    <Check size={12} aria-label="Có" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Toàn bộ đơn</th>
                  <td>
                    <Minus size={12} aria-label="Không" />
                  </td>
                  <td>
                    <Check size={12} aria-label="Có" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Xác minh chứng từ</th>
                  <td>
                    <Minus size={12} aria-label="Không" />
                  </td>
                  <td>
                    <Check size={12} aria-label="Có" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Thông báo riêng</th>
                  <td>
                    <Check size={12} aria-label="Có" />
                  </td>
                  <td>
                    <Check size={12} aria-label="Có" />
                  </td>
                </tr>
              </tbody>
            </table>

            <p className={styles.sessionNote}>
              <KeyRound size={12} aria-hidden="true" />
              Mật khẩu seed mặc định: <span className="mono">{DEMO_PASSWORD}</span>. Đổi
              biến môi trường trước khi seed production.
            </p>
          </aside>

          <main className={styles.formPanel}>
            <div className={styles.formHead}>
              <h1>{mode === 'login' ? 'Đăng nhập cổng vận hành' : 'Tạo tài khoản khách hàng'}</h1>
              <p>
                {mode === 'login'
                  ? 'Dùng tài khoản doanh nghiệp để xem đơn, chứng từ và lô hàng được phân quyền.'
                  : 'Tài khoản mới chỉ thấy đơn đặt chỗ và thông báo của chính mình.'}
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span className="label">Họ và tên</span>
                    <input
                      className="input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      placeholder="Nguyễn Thu Hà"
                      required
                      minLength={2}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className="label">Doanh nghiệp</span>
                    <input
                      className="input"
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      autoComplete="organization"
                      placeholder="An Phát Logistics"
                    />
                  </label>
                </div>
              )}

              <label className={styles.field}>
                <span className="label">Email</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setFilledRole(null)
                  }}
                  autoComplete="email"
                  placeholder="ten@doanhnghiep.vn"
                  required
                  aria-invalid={Boolean(error)}
                />
              </label>

              <div className={styles.field}>
                <label className="label" htmlFor="auth-password">
                  Mật khẩu
                </label>
                <span className={styles.passwordWrap}>
                  <input
                    id="auth-password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setFilledRole(null)
                    }}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'login' ? 'Mật khẩu tài khoản' : 'Tối thiểu 8 ký tự'}
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                    aria-invalid={Boolean(error)}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
              </div>

              {error && (
                <div className={styles.formError} role="alert">
                  <CircleAlert size={15} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className={styles.submitRow}>
                <button type="submit" className={`btn btnPrimary ${styles.submit}`} disabled={busy}>
                  {mode === 'login' ? <LogIn size={15} /> : <UserPlus size={15} />}
                  {busy
                    ? 'Đang xác thực…'
                    : mode === 'login'
                      ? 'Đăng nhập'
                      : 'Tạo tài khoản'}
                </button>
                <span className={styles.submitMeta}>Không có đăng nhập mạng xã hội</span>
              </div>

              <p className={styles.modeNote}>
                {mode === 'login' ? 'Chưa có tài khoản khách hàng?' : 'Đã có tài khoản?'}{' '}
                <button
                  type="button"
                  className={`btnLink ${styles.switchButton}`}
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                >
                  {mode === 'login' ? 'Tạo tài khoản doanh nghiệp' : 'Quay lại đăng nhập'}
                </button>
              </p>
            </form>
          </main>
        </div>

        <footer className={styles.sheetFoot}>
          <span>
            VieTra Operations · dữ liệu booking, chứng từ và mô phỏng vận tải được lưu trên
            máy chủ.
          </span>
          <span className="mono">API /api · session cookie</span>
        </footer>
      </div>
    </div>
  )
}
