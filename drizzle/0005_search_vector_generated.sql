ALTER TABLE vagas DROP COLUMN search_vector;

ALTER TABLE vagas 
ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (
  to_tsvector('portuguese',
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(company, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    coalesce(requirements, '') || ' ' ||
    coalesce(tipo_vaga, '')
  )
) STORED;

CREATE INDEX vagas_search_vector_idx ON vagas USING GIN(search_vector);