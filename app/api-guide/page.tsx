import Link from "next/link";
const example = `POST /api/negotiations
Authorization: Bearer YOUR_NEGOTIATION_API_KEY
Idempotency-Key: vendor-renewal-001
Content-Type: application/json

{
  "command": "create",
  "spec": {
    "subject": "Annual software renewal, same seats and term",
    "counterparty": "Your vendor",
    "direction": "minimize",
    "currency": "USD",
    "initialOffer": 15000,
    "target": 10000,
    "limit": 12000,
    "requiredTerms": ["No auto-renewal", "No mandatory add-ons"],
    "maxRounds": 4,
    "followUpHours": 24,
    "maxFollowUps": 2
  }
}`;
export default function ApiGuide() {
  return (
    <main className="api-guide">
      <Link href="/">← Back to the sit-down</Link>
      <span className="eyebrow">SAPRANO · HOUSE RULES</span>
      <h1>
        Your number.
        <span>Our persistence.</span>
      </h1>
      <p className="subtitle">
        Hook your app to a negotiator that remembers the counter, follows up,
        and knows when to walk.
      </p>
      <div className="api-cases">
        <span>Cars & equipment</span>
        <span>Vendor contracts</span>
        <span>Compensation</span>
        <span>Service quotes</span>
      </div>
      <section>
        <h2>One key. A sit-down that remembers.</h2>
        <p>
          Use the separate <code>NEGOTIATION_API_KEY</code> stored on your
          server. Your OpenRouter key stays inside the house. The API takes a
          numeric price on one consistent basis, plus the terms that are
          non-negotiable, whether you want the number down or up.
        </p>
        <pre>{example}</pre>
      </section>
      <section>
        <h2>How a round goes</h2>
        <ol>
          <li>
            <strong>Create</strong> a negotiation with a target and private
            limit. Save its returned ID and version.
          </li>
          <li>
            <strong>Next</strong> returns a persistent counteroffer draft. It
            does not send it.
          </li>
          <li>
            Your authorized transport delivers the draft. Report{" "}
            <strong>mark_sent</strong> with its draft ID and delivery receipt.
          </li>
          <li>
            Post the actual <strong>reply</strong>, amount, accepted terms, and
            source ID. Amounts and terms must be extracted and checked by your
            integration.
          </li>
          <li>
            Call <strong>next</strong> again. It creates the next counter, a due
            follow-up, or a decision for your approval.
          </li>
        </ol>
        <p>
          Call <code>GET /api/negotiations?id=ID</code> to recover state after
          any interruption. Every mutation requires the latest version. Pause,
          resume, revise the brief, or walk away at any time.
        </p>
      </section>
      <section>
        <h2>Firm. On the record. Your call.</h2>
        <p>
          We ask for itemized charges, counter below the buying target or above
          the selling target, and hold the counter during silence. Price changes
          feed per-tactic outcome metrics. Limits, deadlines, and missing
          required terms block automatic acceptance.
        </p>
        <p>
          The API returns drafts for your integration to deliver. No email,
          calling, payment, or signature provider is connected. It is a
          single-workspace prototype; negotiate using one consistent currency
          and pricing basis. It cannot guarantee agreement, independently verify
          supplied quotes, or interpret every contractual term.
        </p>
      </section>
    </main>
  );
}
