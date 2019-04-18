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


@get("/api/tracks")
def get_tracks():
    response.content_type = 'application/json'

    q = request.query
    q_genres = q.get("genres", "")
    q_playlists = q.get("playlists", "")

    playlists = q_playlists.split(",")
    results = graph.run(
        """match (g: Genre)-[:PLAYS]-(a: Artist)-[:BY]-(t: Track)-[:IN]-(pl: Playlist)
            where g.name in {genrenames} and pl.id in {playlistids}
            return distinct a as artist, t as track, pl as playlist
            order by artist.name, track.name
            limit 500
        """, {"genrenames": q_genres.split(","), "playlistids": q_playlists.split(",")}
    )

    return json.dumps(results.data())


@get("/api/genres")
def get_genres():
    response.content_type = 'application/json'

    q = request.query
    q_playlists = q.get("playlists", "")

    plids = q_playlists.split(",")

    if len(plids) > 0 and len(q_playlists) > 0:
        cypherConstraintPlaylists = "where pl.id in {playlistids}"
    else:
        cypherConstraintPlaylists = ""

    query = """match (g: Genre)-[:PLAYS]-(a: Artist)-[:BY]-(t: Track)-[:IN]-(pl: Playlist)
            {}
            with count(g) as gc, g.name as gn
            order by gc desc, gn
            return gn as genre, gc as count
            limit 500
        """.format(cypherConstraintPlaylists)

    results = graph.run(query, {"playlistids": plids})

    return json.dumps(results.data())


@get("/api/genre/related/<genre>")
def get_related_genres(genre):
    response.content_type = 'application/json'
    results = graph.run("""
        match (g:Genre{name: {genre}})-[:RELATED]-(og:Genre)-[:PLAYS]-(a: Artist)-[:BY]-(t: Track)-[:IN]-(: Playlist)
        return og.name as genre, count(t) as count
        """,
                        {"genre": genre}
                        )
    return json.dumps(results.data())


@get("/api/artist/<artistid>")
def get_artist(artistid):
    response.content_type = 'application/json'
    results = graph.run("""
        match (a: Artist{id: {aid}})
        optional match (g:Genre)-[:PLAYS]-(a)
        optional match (a)-[:BY]-(t:Track)-[:BY]-(oa:Artist)
        return collect(distinct g) as genres, collect(distinct oa) as collaborators, a as artist
        """,
                        {"aid": artistid}
                        )
    return json.dumps(results.data())


@get("/api/playlists")
def get_playlists():
    response.content_type = 'application/json'

    q = request.query
    q_genres = q.get("genres", "")

    genres = q_genres.split(",")

    if len(genres) > 0 and len(q_genres) > 0:
        cypherMatch = """
            match (g:Genre)-[:PLAYS]-(a:Artist)-[:BY]-(t:Track)-[:IN]-(pl:Playlist)
            where g.name in {genres}
            with count(t) as tc, pl.id as id, pl.name as name
        """

    else:
        cypherMatch = """
            match (pl: Playlist)
            with size((pl)-[:IN]-(:Track)) as tc, pl.id as id, pl.name as name
        """

    query = """
        {}
        order by toLower(name)
        return distinct name, id, tc as count
        """.format(cypherMatch)

    results = graph.run(query, {"genres": genres})
    return json.dumps(results.data())


if __name__ == "__main__":
    run(
        reloader=True,
        debug=True,
        host="0.0.0.0",
        port=8081
    )
