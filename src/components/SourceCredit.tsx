/** Attribution for the model essays, which come from Hardev Sir's IELTS Institute. */
export function SourceCredit() {
  return (
    <p className="border-t border-line pt-4 text-xs leading-relaxed text-ink-soft">
      Essays: © Hardev Sir’s IELTS Institute, Bathinda —{' '}
      <a
        href="https://www.ieltshardev.com"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-brand-700 underline underline-offset-2"
      >
        www.ieltshardev.com
      </a>
      . Reformatted for easy reading on this site; key-phrase meanings added. Please visit the original source for
      their courses and materials.
    </p>
  );
}
