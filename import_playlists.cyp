WITH "http://localhost:8080/all_playlists" AS url
CALL apoc.load.json(url) YIELD value AS pl

merge (p:Playlist{id: pl.id})
    on create set p.name = pl.name

foreach (owner in (case when size(pl.owner.id) > 0 then [pl.owner.id] else [] end) |
    merge (ownerNode:User{id: pl.owner.id}) on create set ownerNode.name = pl.owner.display_name
    merge (p)<-[:OWNS]-(ownerNode)
)

with p, pl
unwind pl.tracks as trkobj
with p, pl, trkobj, trkobj.track as track

foreach (trackId in (case when size(track.id) > 0 then [pl.owner.id] else [] end) |
merge (t:Track{id: track.id})
    on create set
        t.name = track.name,
        t.type = track.type,
        t.track_number = track.track_number,
        t.uri = track.uri,
        t.preview_url = track.preview_url

merge (a:Album{id: track.album.id})
    on create set a.name = track.album.name

merge (t)-[:ON]->(a)

// merge (t)-[:INENTRY]->(e:TrackEntry)
merge (t)-[r:IN]->(p)
    on create set
        r.added_at = trkobj.added_at,
        r.added_by = trkobj.added_by.id

with track, t
unwind track.artists as artist

merge (artistNode:Artist{id: artist.id})
    on create set
        artistNode.name = artist.name,
        artistNode.type = artist.type

merge (artistNode)<-[:BY]-(t)
