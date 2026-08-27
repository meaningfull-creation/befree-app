import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import { getPlatformFeeRate } from "@/lib/settings";
import { PLATFORM_FEE_RATE as DEFAULT_FEE_RATE } from "@/lib/pricing";
import { updatePlatformFeeRateAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const feeRate = await getPlatformFeeRate();
  const isDefault = feeRate === DEFAULT_FEE_RATE;

  return (
    <AdminShell current="settings">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>設定</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        プラットフォーム全体に関わる設定値です。
      </p>

      <div className="admin-card">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>手数料率</div>
        <p style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 14, lineHeight: 1.7 }}>
          企業がBATTER BOXに支払う金額のうち、BATTER BOXの取り分とする割合です。残りが人材への標準支払額の目安になります
          (個別の契約では、企業請求額・人材支払額を直接入力できるため、この値はあくまで目安・デフォルトです)。
        </p>
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 28, color: COLORS.text }}>{Math.round(feeRate * 100)}%</span>
          <span style={{ fontSize: 12, color: COLORS.muted, marginLeft: 10 }}>
            {isDefault ? "(デフォルト値のまま)" : "(管理画面で変更済み)"}
          </span>
        </div>
        <form action={updatePlatformFeeRateAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input className="admin-input" type="number" name="rate" min="0" max="100" step="1" defaultValue={Math.round(feeRate * 100)} style={{ width: 90 }} />
          <span style={{ fontSize: 13, color: COLORS.muted }}>%</span>
          <button type="submit" className="admin-btn">更新する</button>
        </form>
      </div>
    </AdminShell>
  );
}
