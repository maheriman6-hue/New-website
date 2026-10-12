const recognitions = [
  { honor: 'Share your design', publication: 'TECH PACK, SKETCH OR IDEA', year: '01' },
  { honor: 'Approve your sample', publication: 'FIT · FABRIC · PRINT CHECK', year: '02' },
  { honor: 'We produce and ship', publication: 'QUALITY CHECKED · TRACKED SHIPPING', year: '03' },
];

export function RecognitionList() {
  return (
    <div className="recognition-table" role="table" aria-label="Selected recognition">
      <div className="recognition-table__head" role="row">
        <span role="columnheader">PROCESS</span>
        <span role="columnheader">WHAT HAPPENS</span>
        <span role="columnheader">STEP</span>
      </div>
      {recognitions.map((item) => (
        <div className="recognition-table__row" role="row" key={item.honor}>
          <span className="recognition-table__honor" role="cell">{item.honor}</span>
          <span className="recognition-table__organization" role="cell">{item.publication}</span>
          <span className="recognition-table__year" role="cell">{item.year}</span>
        </div>
      ))}
    </div>
  );
}
