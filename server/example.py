#!/usr/bin/env python


import json

from bottle import get, run, request, response, static_file
from py2neo import Graph
from os import environ

neo_user = environ.get("NEO4J_USER")
neo_pass = environ.get("NEO4J_PASS")
if neo_user == None or neo_pass == None:
    print("envorinment variables {} or {} not set.".format(
        "NEO4J_USER", "NEO4J_PASS"))
    exit(1)

# password = {Your neo4j password}
graph = Graph(password=neo_pass)


@get("/")
def get_index():
    return static_file("index.html", root="static")


@get("/graph")
def get_graph():
    results = graph.run(
        "MATCH (m:Movie)<-[:ACTED_IN]-(a:Person) "
        "RETURN m.title as movie, collect(a.name) as cast "
        "LIMIT {limit}", {"limit": 300})
    nodes = []
    rels = []
    i = 0
    for movie, cast in results:
        nodes.append({"title": movie, "label": "movie"})
        target = i
        i += 1
        for name in cast:
            actor = {"title": name, "label": "actor"}
            try:
                source = nodes.index(actor)
            except ValueError:
                nodes.append(actor)
                source = i
                i += 1
            rels.append({"source": source, "target": target})
    return {"nodes": nodes, "links": rels}


@get("/search")
def get_search():
    try:
        q = request.query["q"]
    except KeyError:
        return []
    else:
        results = graph.run(
            "MATCH (movie:Movie) "
            "WHERE movie.title =~ {title} "
            "RETURN movie", {"title": "(?i).*" + q + ".*"})
        print("{}: {}".format(q, results))
        response.content_type = "application/json"
        return json.dumps([{"movie": dict(row["movie"])} for row in results])


@get("/movie/<title>")
def get_movie(title):
    results = graph.run(
        "MATCH (movie:Movie {title:{title}}) "
        "OPTIONAL MATCH (movie)<-[r]-(person:Person) "
        "RETURN movie.title as title,"
        "collect([person.name, head(split(lower(type(r)),'_')), r.roles]) as cast "
        "LIMIT 1", {"title": title})
    row = results.next()
    return {"title": row["title"],
            "cast": [dict(zip(("name", "job", "role"), member)) for member in row["cast"]]}


@get("/tracks")
def get_tracks():

    q = request.query
    q_genres = q.get("genres", "")
    q_playlists = q.get("playlists", "")

    playlists = q_playlists.split(",")
    results = graph.run(
        """match (g: Genre)-[:PLAYS]-(a: Artist)-[:BY]-(t: Track)-[:IN]-(pl: Playlist)
            where g.name in {genrenames}
            return distinct {id: a.id, name: a.name, genre: g.name}
        """, {"genrenames": q_genres.split(",")}
    )

    rendered = [r for r in results]
    return json.dumps(rendered)


@get("/api/genres")
def get_genres():
    response.content_type = 'application/json'
    results = graph.run("""
        match(g: Genre)-[:PLAYS]-(a: Artist)-[:BY]-(t: Track)-[:IN]-(: Playlist)
        with count(g) as gc, g.name as gn
        order by gc desc, gn
        return gn as genre, gc as count
        limit 500
        """,
                        {"username": "Peter Pron"}
                        )
    return json.dumps(results.data())


@get("/api/genre/<genre>/related")
def get_related_genres(genre):
    response.content_type = 'application/json'
    results = graph.run("""
        match(g:Genre{name: {genre}})-[:RELATED]-(og:Genre)-[:PLAYS]-(a: Artist)-[:BY]-(t: Track)-[:IN]-(: Playlist)
        return og.name as genre, count(t) as count
        """,
                        {"genre": genre}
                        )
    return json.dumps(results.data())


@get("/api/playlists")
def get_playlists():
    response.content_type = 'application/json'
    results = graph.run("""
        match (pl: Playlist)
        with size((pl)-[:IN]-()) as tc, pl.id as id, pl.name as name
        order by name
        return name, id, tc as trackCount
        """,
                        {"username": "Peter Pron"}
                        )
    return json.dumps(results.data())


if __name__ == "__main__":
    run(
        reloader=True,
        debug=True,
        host="0.0.0.0",
        port=8081
    )
