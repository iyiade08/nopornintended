export default function Field({
  label,
  name,
  as: Control = "input",
  error,
  hint,
  children,
  ...props
}) {
  const message = Array.isArray(error)
    ? error.join(" ")
    : typeof error === "string"
      ? error
      : "";
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <Control
        id={name}
        name={name}
        aria-invalid={message ? "true" : undefined}
        aria-describedby={
          message ? `${name}-error` : hint ? `${name}-hint` : undefined
        }
        {...props}
      >
        {children}
      </Control>
      {hint && (
        <p className="field-hint" id={`${name}-hint`}>
          {hint}
        </p>
      )}
      {message && (
        <p className="error-text" id={`${name}-error`}>
          {message}
        </p>
      )}
    </div>
  );
}
