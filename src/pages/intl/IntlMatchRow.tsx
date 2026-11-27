import { Link } from "react-router-dom";
import { LOCALE_TAG, MATCH_SEGMENT } from "@/i18n/locales";
import { kickOff, type IntlMatch } from "@/i18n/useIntlData";

export function IntlMatchRow({ m, locale }: { m: IntlMatch; locale: "en" | "es" }) {
  const k = kickOff(m, LOCALE_TAG[locale]);
  const score = m.gols_casa != null && m.gols_fora != null ? `${m.gols_casa} – ${m.gols_fora}` : k.time ?? "–";
  const body = (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
      <span className="text-right truncate">{m.casa?.nome}</span>
      <span className="tabular-nums font-semibold text-primary min-w-[64px] text-center">{score}</span>
      <span className="truncate">{m.fora?.nome}</span>
    </div>
  );
  return (
    <li className="border-b border-border/60 last:border-0">
      <div className="text-[11px] text-muted-foreground pt-2">{k.date}</div>
      {m.slug ? (
        <Link to={`/${locale}/${MATCH_SEGMENT[locale]}/${m.slug}`} className="block hover:bg-muted/40 rounded">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}
