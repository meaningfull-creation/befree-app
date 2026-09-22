import LegalDocument from "../LegalDocument";
import { PRIVACY_SECTIONS, PRIVACY_VERSION, PRIVACY_ENACTED_ON, PRIVACY_REVISED_ON } from "@/lib/legalPrivacy";

export const metadata = { title: "プライバシーポリシー | BATTER BOX" };

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="プライバシーポリシー"
      version={PRIVACY_VERSION}
      enactedOn={PRIVACY_ENACTED_ON}
      revisedOn={PRIVACY_REVISED_ON}
      sections={PRIVACY_SECTIONS}
      note="本ポリシーは、個人情報の保護に関する法律に基づき、株式会社BeFreeが「BATTER BOX」において取得する個人情報の取扱いについて定めるものです。同法第32条に基づく保有個人データに関する公表事項を含みます。"
    />
  );
}
