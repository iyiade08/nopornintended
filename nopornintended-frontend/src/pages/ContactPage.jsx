import { Link } from "react-router-dom";
import Field from "../component/Field";
import ContentState from "../component/ContentState";
import useSubmission from "../hooks/useSubmission";
import usePageTitle from "../hooks/usePageTitle";
import { sendContact } from "../api/api";

export default function ContactPage() {
  usePageTitle("Contact");
  const { busy, success, error, fields, submit, focusError, reset } =
    useSubmission(sendContact);
  return (
    <section className="narrow-container page-section">
      <div className="page-head">
        <div>
          <p className="eyebrow">Get in touch</p>
          <h1 className="page-title">Contact us</h1>
          <p className="page-description">
            Have a question or feedback? Send the team a message. For content
            concerns, please{" "}
            <Link className="text-link" to="/report">
              use the report form
            </Link>
            .
          </p>
        </div>
      </div>
      {success ? (
        <ContentState
          success
          focus
          title="Message received"
          description="Your message has been sent to the team. Thank you for getting in touch."
        >
          <button
            className="button button-secondary"
            type="button"
            onClick={reset}
          >
            Send another message
          </button>
        </ContentState>
      ) : (
        <form
          className="form-card form-grid"
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault();
            submit(Object.fromEntries(new FormData(event.currentTarget)));
          }}
        >
          {error && (
            <div
              ref={focusError}
              tabIndex={-1}
              role="alert"
              className="error-text"
            >
              {error}
            </div>
          )}
          <Field
            label="Name"
            name="name"
            required
            autoComplete="name"
            maxLength={120}
            error={fields.name}
          />
          <Field
            label="Email address"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            error={fields.email}
          />
          <Field
            label="Subject"
            name="subject"
            required
            maxLength={180}
            error={fields.subject}
          />
          <Field
            label="Message"
            name="message"
            as="textarea"
            required
            maxLength={5000}
            error={fields.message}
          />
          <div className="form-footer">
            <button className="button" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send message"}
            </button>
            <p className="field-hint">All fields are required.</p>
          </div>
        </form>
      )}
    </section>
  );
}
