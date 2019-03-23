const { SpotifyGraphQLClient } = require('spotify-graphql');
const SpotifyWebApi = require('spotify-web-api-node');
const fs = require('fs-extra');
const { combineLatest, empty, from, of, interval, zip } = require('rxjs');
const {
  buffer, bufferCount, bufferToggle, bufferWhen,
  delay, delayWhen,
  filter,
  map, concatMap, flatMap,
  race,
  retryWhen,
  skip,
  tap,
  take, takeWhile
} = require('rxjs/operators');

const queries = require('./queries');

// RxJs 6:
//   https://rxjs-dev.firebaseapp.com/
//   https://www.learnrxjs.io/

// spotify graphql:
//   library: https://github.com/wittydeveloper/spotify-graphql
//   console: https://spotify-api-graphql-console.herokuapp.com/

// get your token WITH 'playlist-read-private' scope checked at:
//   https://developer.spotify.com/console/get-current-user-playlists
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const log = res => {
  console.log(JSON.stringify(res, null, 2));
  return res;
}

const logCompact = res => {
  console.log(JSON.stringify(res));
  return res;
}

const errout = res => {
  console.error(JSON.stringify(res, null, 2));
  return res;
}

const throwOnGraphQlErrors = res => {
  if (res.errors)
    throw res.errors
  return res
}

const writePlaylistToDisk = playlist => {
  const name = playlist.name.replace(/[^\w]/g, "_")
  const filename = `${name}__${playlist.id}.json`
  const pathFilename = `plists/${filename}`
  fs.writeFileSync(pathFilename, JSON.stringify(playlist) + "\n");
}

const swa = new SpotifyWebApi();
swa.setAccessToken(config.accessToken)

const fullPlaylist$ = playListId => from(
  SpotifyGraphQLClient(config)
    .query(queries.playlistTracks, null, null, { userId: config.userId, plid: playListId })
)
  .pipe(
    map(throwOnGraphQlErrors),
    map(res => res.data.playlist),
    map(playlist => ({ ...playlist, tracks: playlist.tracks.filter(track => track.track.id !== null) })),
    retryWhen(errors =>
      errors.pipe(
        tap(val => {
          console.error(`some error ${val}`)
        }),
        delay(10000),
        take(2),
      )
    )
  )

const playlists$ = from(
  SpotifyGraphQLClient(config)
    .query(queries.listAllPlaylists)
)
  .pipe(
    map(throwOnGraphQlErrors),
    map(res => res.data.me.playlists),
    concatMap(res => from(res)),
  )

// of("3WbsX4ZMT7GQLPM6RmCNRe")
//   .pipe(
//     tap(log),
//     concatMap(playListId => fullPlaylist$(playListId)),
//      // tap(log),
//   )
//   .subscribe(log)

const intervals$ = interval(200)

zip(playlists$, intervals$)
  .pipe(
    map(res => res[0]),
    tap(playlist => log("? " + playlist.name)),
    concatMap(playlist => fullPlaylist$(playlist.id)),
    tap(playlist => log("! " + playlist.name)),
  )
  .subscribe(
    writePlaylistToDisk,
    // logCompact,
    errout,
    d => { }
  )
