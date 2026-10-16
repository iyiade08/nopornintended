import { useSearchParams } from "react-router-dom";
import Field from "../component/Field";
import ContentState from "../component/ContentState";
import useSubmission from "../hooks/useSubmission";
import usePageTitle from "../hooks/usePageTitle";
import { sendReport } from "../api/api";

export default function ReportPage() {
  const [params] = useSearchParams();
  const rawId = params.get("video");
  const number = rawId && /^[1-9]\d*$/.test(rawId) ? Number(rawId) : null;
  const videoId = Number.isSafeInteger(number) ? number : null;
  return <ReportForm key={videoId || "general"} videoId={videoId} />;
}

function ReportForm({ videoId }) {
  usePageTitle("Report content");
  const { busy, success, error, fields, submit, focusError, reset } =
    useSubmission(sendReport);
  return (
    <section className="narrow-container page-section">
      <div className="page-head">
        <div>
          <p className="eyebrow">Content support</p>
          <h1 className="page-title">Report content</h1>
          <p className="page-description">
            Tell us about a content concern, copyright issue, or broken video.
            Include enough detail for the team to review your report.
          </p>
        </div>
      </div>
      {success ? (
        <ContentState
          success
          focus
          title="Report received"
          description="Your report has been sent to the team for review."
        >
          <button
            className="button button-secondary"
            type="button"
            onClick={reset}
          >
            Submit another report
          </button>
        </ContentState>
      ) : (
        <form
          key={videoId || "general"}
          className="form-card form-grid"
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(event.currentTarget));
            if (videoId) data.video_id = videoId;
            submit(data);
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
              {fields.non_field_errors && (
                <p>{fields.non_field_errors.join(" ")}</p>
              )}
            </div>
          )}
          <Field
            label="Content URL"
            name="content_url"
            type="url"
            required={!videoId}
            defaultValue={
              videoId ? `${window.location.origin}/downloads/${videoId}` : ""
            }
            maxLength={200}
            error={fields.content_url || fields.video_id}
            hint={
              videoId
                ? `Reporting video #${videoId}. This video will be attached to your report.`
                : "Paste the full link to the content you want to report."
            }
          />
          <Field
            label="Reason"
            name="report_type"
            as="select"
            required
            defaultValue="broken"
            error={fields.report_type}
          >
            <option value="broken">Broken video</option>
            <option value="dmca">DMCA / Copyright</option>
            <option value="illegal">Illegal content</option>
            <option value="other">Other concern</option>
          </Field>
          <Field
            label="Email address (optional)"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            error={fields.email}
            hint="Provide an email address if you would like the team to follow up."
          />
          <Field
            label="Details"
            name="details"
            as="textarea"
            required
            minLength={10}
            maxLength={5000}
            error={fields.details}
          />
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit report"}
          </button>
        </form>
      )}
    </section>
  );
}
