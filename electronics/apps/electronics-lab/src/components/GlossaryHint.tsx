import { HelpCircle } from "lucide-react";
import { getGlossaryTerm } from "./ElectronicsGlossary";

export function GlossaryHint({
  term,
  label,
  compact = false
}: {
  term: string;
  label?: string;
  compact?: boolean;
}) {
  const glossaryTerm = getGlossaryTerm(term);

  if (!glossaryTerm) {
    return <span>{label ?? term}</span>;
  }

  return (
    <span
      className={compact ? "inline-glossary-term is-compact" : "inline-glossary-term"}
      tabIndex={0}
      aria-label={`${glossaryTerm.term}: ${glossaryTerm.definition}`}
    >
      <span className="inline-glossary-label">{label ?? glossaryTerm.term}</span>
      <HelpCircle aria-hidden="true" />
      <span className="inline-glossary-popover" role="tooltip">
        <strong>{glossaryTerm.term}</strong>
        <span>{glossaryTerm.definition}</span>
        <em>{glossaryTerm.courseExample}</em>
      </span>
    </span>
  );
}
