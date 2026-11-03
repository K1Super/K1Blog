import type { SpecimenKind } from '@/lib/projects';

export function Specimen({ kind }: { kind: SpecimenKind }) {
  if (kind === 'vault') return <VaultSpecimen />;
  if (kind === 'scout') return <ScoutSpecimen />;
  if (kind === 'cert') return <CertSpecimen />;
  return <RelivusSpecimen />;
}

function VaultSpecimen() {
  return (
    <div className="specimen specimen-vault" aria-hidden="true">
      <div className="spec-vault">
        <header className="spec-vault-head">
          <span>VERTHYS / CONTAINER</span>
          <span>V4.1.3</span>
        </header>
        <div className="spec-vault-body">
          <div className="spec-vault-seal">
            <span className="spec-vault-state">LOCKED</span>
            <span className="spec-vault-code">S0—S6</span>
          </div>
          <div className="spec-vault-stack">
            <div className="spec-vault-layer">
              <span>L4</span>
              <span>TAURI / VUE</span>
              <span className="is-zero">ZERO CONTACT</span>
            </div>
            <div className="spec-vault-layer">
              <span>L3</span>
              <span>RUST WORKER</span>
              <span className="is-zero">ZERO CONTACT</span>
            </div>
            <div className="spec-vault-layer is-core">
              <span>L2</span>
              <span>C11 CORE</span>
              <span className="is-key">KEY HOLDER</span>
            </div>
            <div className="spec-vault-layer">
              <span>L1</span>
              <span>.VERTHYS</span>
              <span className="is-zero">AT REST</span>
            </div>
          </div>
        </div>
        <footer className="spec-vault-foot">
          <span>ABI / 0x000B</span>
          <span>SUPERBLOCK / 2 OF 3</span>
        </footer>
      </div>
    </div>
  );
}

function ScoutSpecimen() {
  return (
    <div className="specimen specimen-scout" aria-hidden="true">
      <div className="spec-scout">
        <header className="spec-scout-head">
          <span>TERRA SCOUT / PIPELINE</span>
          <span>RUNNING</span>
        </header>
        <div className="spec-scout-meta">
          <div>
            <span>PROJECT</span>
            <span>order-service</span>
          </div>
          <div>
            <span>RUNTIME</span>
            <span>JAVA 17 / MAVEN</span>
          </div>
          <div>
            <span>SDK</span>
            <span>17.0.12 / ISOLATED</span>
          </div>
        </div>
        <div className="spec-scout-steps">
          {Array.from({ length: 9 }, (_, index) => (
            <span
              key={index}
              className={index < 5 ? 'is-done' : index === 5 ? 'is-active' : undefined}
            />
          ))}
        </div>
        <div className="spec-scout-log">
          <span>[08:41:12] sdk / verified</span>
          <span>[08:41:26] deps / installed</span>
          <span className="is-active">[08:42:03] task / running</span>
          <span>[08:42:18] tests / 438+</span>
          <span>[08:42:31] artifact / ready</span>
        </div>
        <footer className="spec-scout-foot">
          <span>QUEUED → RUNNING → SUCCESS</span>
          <span>RETRY / 03</span>
        </footer>
      </div>
    </div>
  );
}

function CertSpecimen() {
  return (
    <div className="specimen specimen-cert" aria-hidden="true">
      <div className="spec-cert">
        <header className="spec-cert-head">
          <span>ACMEDESK / CERTIFICATES</span>
          <span>127.0.0.1</span>
        </header>
        <div className="spec-cert-table">
          <div className="spec-cert-row is-head">
            <span>DOMAIN</span>
            <span>KEY</span>
            <span>EXPIRY</span>
            <span>STATE</span>
          </div>
          <div className="spec-cert-row">
            <span>acme.example.com</span>
            <span>ECDSA</span>
            <span>11.24</span>
            <span className="is-valid">VALID</span>
          </div>
          <div className="spec-cert-row">
            <span>api.example.com</span>
            <span>RSA</span>
            <span>12.02</span>
            <span className="is-valid">VALID</span>
          </div>
          <div className="spec-cert-row">
            <span>stage.example.com</span>
            <span>ECDSA</span>
            <span>09.18</span>
            <span className="is-staging">STAGING</span>
          </div>
          <div className="spec-cert-row spec-cert-extra">
            <span>blog.example.com</span>
            <span>RSA</span>
            <span>01.07</span>
            <span className="is-valid">VALID</span>
          </div>
          <div className="spec-cert-row spec-cert-extra">
            <span>cdn.example.com</span>
            <span>ECDSA</span>
            <span>02.11</span>
            <span className="is-valid">VALID</span>
          </div>
        </div>
        <div className="spec-cert-checks">
          <span>
            DNS <b>OK</b>
          </span>
          <span>
            HTTP-01 <b>200</b>
          </span>
          <span>
            REDIRECT <b>NONE</b>
          </span>
        </div>
        <footer className="spec-cert-foot">
          <span>TASK / ONE AT A TIME</span>
          <span>JOB / 00:42</span>
        </footer>
      </div>
    </div>
  );
}

function RelivusSpecimen() {
  return (
    <div className="specimen specimen-relivus" aria-hidden="true">
      <div className="spec-rlv">
        <header className="spec-rlv-head">
          <span>RELIVUS / DATA FORGE</span>
          <span>TASK / 68%</span>
        </header>
        <div className="spec-rlv-schema">
          <span>USERS</span>
          <i>→</i>
          <span>ORDERS</span>
          <i>→</i>
          <span>PAYMENTS</span>
        </div>
        <div className="spec-rlv-grid">
          <div className="spec-rlv-row is-head">
            <span>EMAIL</span>
            <span>PHONE</span>
            <span>NAME</span>
          </div>
          <div className="spec-rlv-row">
            <span>u***@example.com</span>
            <span>138****2210</span>
            <span>Z*</span>
          </div>
          <div className="spec-rlv-row">
            <span>a***@example.com</span>
            <span>139****0842</span>
            <span>L*</span>
          </div>
          <div className="spec-rlv-row spec-rlv-extra">
            <span>o***@example.com</span>
            <span>137****6620</span>
            <span>W*</span>
          </div>
          <div className="spec-rlv-row spec-rlv-extra">
            <span>k***@example.com</span>
            <span>136****3105</span>
            <span>C*</span>
          </div>
        </div>
        <div className="spec-rlv-progress">
          <span />
        </div>
        <footer className="spec-rlv-foot">
          <span>LOCAL FAKER / AI FALLBACK</span>
          <span>AES-256-GCM</span>
        </footer>
      </div>
    </div>
  );
}
