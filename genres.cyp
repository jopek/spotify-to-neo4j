WITH "http://localhost:8080/_out" AS url
CALL apoc.load.json(url) YIELD value AS record
MERGE (g:Genre{name: record.genre})
WITH g, record, url
UNWIND record.related_genres AS related
MERGE (rg:Genre{name: related.name})
MERGE (g)-[r:RELATED]-(rg) ON CREATE SET r = related.relation

WITH "http://localhost:8080/_out" AS url
CALL apoc.load.json(url) YIELD value AS record
MATCH (g:Genre{name: record.genre})
WITH record.artists AS artists, g
UNWIND artists AS artist
MERGE (a:Artist{id: artist.id}) ON CREATE SET a.name = artist.name

WITH "http://localhost:8080/_out" AS url
CALL apoc.load.json(url) YIELD value AS record
MATCH (g:Genre{name: record.genre})
WITH record.artists AS artists, g
UNWIND artists AS artist
MATCH (a:Artist{id: artist.id})
MERGE (a)-[:PLAYS]->(g)
