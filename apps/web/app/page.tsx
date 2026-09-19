export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div className="badge">AUTHENTICHECK • FOUNDATION</div>
        <h1>Verify products.<br />Detect suspicious activity.</h1>
        <p>
          A multi-signal authentication platform combining secure product
          identities, QR verification, computer vision, and fraud analytics.
        </p>
        <div className="actions">
          <button>Scan QR Code</button>
          <button className="secondary">Enter Serial Number</button>
        </div>
      </section>

      <section className="cards">
        <article><strong>Identity</strong><span>QR & serial verification</span></article>
        <article><strong>Vision</strong><span>AI-assisted image analysis</span></article>
        <article><strong>Behavior</strong><span>Duplicate & anomaly detection</span></article>
      </section>
    </main>
  );
}
