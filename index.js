const { SpotifyGraphQLClient } = require('spotify-graphql');
const fs = require('fs');
const { from, of, interval, zip } = require('rxjs');
const { delay, map, concatMap, flatMap, tap, retryWhen, take } = require('rxjs/operators');

const config = {
  accessToken: "BQCjIVd6Vszdh9L81bqCK9u5fH6ZaNKdRmk3qXPquU8Bn4insq43OPSbnQH_559Zi63EiSQ293XET_Sw4G7xyj5NaTwDE8rOOoLnF1ynZqAvQbQU8j51dP17NnrdE2v8WRkoIlkJRKckLE5GItst4RBFEoIGTWKZWRzfWqN7Z2W3_mJqF3D9xAk"
}

const log = res => {
  console.log(JSON.stringify(res, null, 2));
  return res;
}

const errout = res => {
  console.log(JSON.stringify(res, null, 2));
  return res;
}

const queries = {
  listAllPlaylists: `{
    me {
      playlists(limit: -1) {
        id
        name
      }
    }
  }`,
  playlistTracks: `
  query playlist($plid: String!, $userId: String!) {
    playlist(userId: $userId, id: $plid) {
      id
      name
      owner {
        id
        display_name
      }
    tracks(limit:-1, throttle: 10){
        track {
          id
          uri
          name
          artists {
            id
            type
            name
            genres
          }
          album {
              id,
            name
            genres
          }
          preview_url
          track_number
          href
        }
      }
    }
  }`,
  everything:
    `{
    me {
      playlists {
        id
        name
        owner {
          id
          display_name
        }
        tracks(limit:-1, throttle: 10){
          track {
            id
            uri
            name
            artists {
              id
              type
              name
              genres
            }
            album {
                id,
              name
              genres
            }
            preview_url
            track_number
            href
          }
        }
      }
    }  
}`
}

const intervals$ = interval(1000)

const playlists$ = from(SpotifyGraphQLClient(config)
  .query(queries.listAllPlaylists))
  .pipe(
    map(res => {
      if (res.errors)
        throw res.errors
      return res
    }),
    map(res => {
      return res.data.me.playlists
    }),
    concatMap(res => from(res)),
)

const fullPlaylist$ = playListId => from(
  SpotifyGraphQLClient(config)
    .query(queries.playlistTracks, null, null, { userId: "1128723762", plid: playListId })
)
  .pipe(
    map(res => {
      if (res.errors)
        throw res.errors
      return res
    }),
    map(res => res.data.playlist),
    retryWhen(errors =>
      errors.pipe(
        tap(val => console.error(`some error ${val}`)),
        delayWhen(val => timer(10e3))
      )
    )
  )

zip(playlists$, intervals$)
  .pipe(
    // take(2),
    map(res => res[0]),
    flatMap(playlist => fullPlaylist$(playlist.id)),
    tap(playlist => {
      const name = playlist.name.replace(/[^\w]/g, "_")
      const filename = `spotify-playlist__${name}.json`
      const pathFilename = `plists/${filename}`
      fs.writeFileSync(pathFilename, JSON.stringify(playlist, null, 2));
    })
  )
  .subscribe(log, errout)
