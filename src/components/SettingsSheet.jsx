import Sheet from './Sheet'

const THEME_OPTIONS = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

/** 是否已作为独立应用运行 */
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/**
 * 设置：外观、数据、安装引导
 * props: { open, onClose, theme, onChangeTheme, stats, onClearData, installPrompt, onInstall }
 */
export default function SettingsSheet({
  open,
  onClose,
  theme,
  onChangeTheme,
  stats,
  onClearData,
  installPrompt,
  onInstall,
}) {
  const installed = isStandalone()

  return (
    <Sheet open={open} onClose={onClose} title="设置">
      <div className="settings">
        <section className="settings-block">
          <h3 className="settings-title">外观</h3>
          <div className="segment" role="radiogroup" aria-label="主题">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={theme === opt.value}
                className={`segment-item ${theme === opt.value ? 'is-active' : ''}`}
                onClick={() => onChangeTheme(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-block">
          <h3 className="settings-title">安装</h3>
          {installed ? (
            <p className="settings-note">已作为独立应用运行，可直接从桌面图标打开。</p>
          ) : installPrompt ? (
            <>
              <p className="settings-note">把应用添加到桌面，离线也能打卡。</p>
              <button type="button" className="btn btn-primary btn-block" onClick={onInstall}>
                添加到桌面
              </button>
            </>
          ) : (
            <p className="settings-note">
              {isIOS()
                ? '在 Safari 中点击底部「分享」→「添加到主屏幕」即可安装。'
                : '在浏览器菜单中选择「安装应用 / 添加到主屏幕」。若使用 Chrome，地址栏右侧会出现安装图标。'}
            </p>
          )}
        </section>

        <section className="settings-block">
          <h3 className="settings-title">数据</h3>
          <div className="stats">
            <div className="stat">
              <span className="stat-num">{stats.todoCount}</span>
              <span className="stat-label">待办</span>
            </div>
            <div className="stat">
              <span className="stat-num">{stats.checkinCount}</span>
              <span className="stat-label">打卡记录</span>
            </div>
          </div>
          <p className="settings-note">
            所有数据仅保存在本机浏览器（localStorage），不上传服务器。清理浏览器数据会导致记录丢失。
          </p>
          <button type="button" className="btn btn-ghost-danger btn-block" onClick={onClearData}>
            清空全部数据
          </button>
        </section>

        <p className="settings-version">打卡待办 v1.0.0 · 本地单机版</p>
      </div>
    </Sheet>
  )
}
