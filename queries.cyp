// match tracks in named playlists of related genres to dub
match p=(og:Genre)-[:RELATED]-(g:Genre)
where g.name = "dub"
unwind nodes(p) as n
with distinct n
match p=(n)-[:PLAYS]-(:Artist)-[:BY]-(:Track)-[:IN]-(pl:Playlist)
where pl.name in ["restarr", "Starred"]
return p

// list genres related to wonky from all playlists
match p=(:Genre)-[:RELATED]-(:Genre{name:"wonky"})
unwind nodes(p) as g
with distinct g
match (g)-[:PLAYS]-(a:Artist)-[:BY]-(t:Track)-[:IN]-(pl:Playlist)
with g, count(distinct t) as ct, pl
return g.name, ct, pl.name
order by pl.name, ct desc
