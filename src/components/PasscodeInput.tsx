export function PasscodeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <input
      type="password"
      autoComplete="off"
      placeholder="Passcode"
      aria-label="Passcode"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
    />
  )
}
