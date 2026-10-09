const recognitions = [
  { honor: 'Campaign of the Year', publication: 'Selected campaign', year: '2025' },
  { honor: 'Editorial Storytelling', publication: 'Editorial annual', year: '2024' },
  { honor: 'Motion Direction', publication: 'Motion shortlist', year: '2023' },
];

export function RecognitionList() {
  return (
    <div className="recognition-table" role="table" aria-label="Selected recognition">
      <div className="recognition-table__head" role="row">
        <span role="columnheader">Recognition</span>
        <span role="columnheader">Distinction</span>
        <span role="columnheader">Year</span>
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
