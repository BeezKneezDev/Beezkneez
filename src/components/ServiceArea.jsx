export default function ServiceArea() {
  const suburbs = ['Lynmore', 'Owhata', 'Springfield', 'Holdens Bay', 'Glenholme', 'Pukehangi', 'Tihi-Otonga']

  return (
    <section className="area">
      <div className="area-content animate-in">
        <h2>Service Area</h2>
        <p>I service Rotorua and surrounding suburbs</p>
        <div className="suburb-tags">
          {suburbs.map((s) => (
            <span className="suburb-tag" key={s}>{s}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
