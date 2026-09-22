import LegalDocument from "../LegalDocument";
import { TERMS_SECTIONS, TERMS_VERSION, TERMS_ENACTED_ON, TERMS_REVISED_ON } from "@/lib/legalTerms";

export const metadata = { title: "利用規約 | BATTER BOX" };

export default function TermsPage() {
  return (
    <LegalDocument
      title="利用規約"
      version={TERMS_VERSION}
      enactedOn={TERMS_ENACTED_ON}
      revisedOn={TERMS_REVISED_ON}
      sections={TERMS_SECTIONS}
      note="本規約は、株式会社BeFreeが提供する「BATTER BOX」の利用条件を定めるものです。本サービスの利用登録をもって、本規約の全条項に同意したものとみなします。"
    />
  );
}
