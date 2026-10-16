import { FaSearch, FaExclamationCircle, FaCheckCircle } from "react-icons/fa";
export default function ContentState({
  title,
  description,
  error = false,
  success = false,
  focus = false,
  heading: Heading = "h2",
  children,
}) {
  return (
    <div
      className="state-panel"
      role={error ? "alert" : undefined}
      tabIndex={focus ? -1 : undefined}
      ref={focus ? (element) => element?.focus() : undefined}
    >
      <span className="state-icon" aria-hidden="true">
        {error ? (
          <FaExclamationCircle />
        ) : success ? (
          <FaCheckCircle />
        ) : (
          <FaSearch />
        )}
      </span>
      <Heading>{title}</Heading>
      <p>{description}</p>
      {children}
    </div>
  );
}
