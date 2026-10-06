const clients = ['Maison Oré', 'KŌRA', 'nuit', 'OSTRA', 'Hale & Co', 'AUTODROME'];

export function ClientsMarquee() {
  return (
    <section className="clients-marquee" aria-label="Selected clients">
      <p className="clients-marquee__label">(05) — SELECTED CLIENTS</p>
      <div className="clients-marquee__viewport">
        <div className="clients-marquee__track">
          {[0, 1].map((copy) => (
            <div
              className="clients-marquee__group"
              aria-hidden={copy === 1}
              key={`client-group-${copy}`}
            >
              {clients.map((client, index) => (
                <span
                  className={`clients-marquee__logo clients-marquee__logo--${index}`}
                  key={`${copy}-${client}`}
                >
                  {client}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
