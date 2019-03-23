const { SpotifyGraphQLClient } = require('spotify-graphql');
const SpotifyWebApi = require('spotify-web-api-node');
const fs = require('fs-extra');
const { combineLatest, empty, from, of, interval, zip } = require('rxjs');
const {
  buffer, bufferCount, bufferToggle, bufferWhen,
  delay, delayWhen,
  filter,
  map, concatMap, flatMap,
  tap,
  race,
  retryWhen,
  take, takeWhile
} = require('rxjs/operators');

const queries = require('./queries');

const audioFeaturesMap = {}
// RxJs 6:
//   https://rxjs-dev.firebaseapp.com/
//   https://www.learnrxjs.io/

// spotify graphql:
//   library: https://github.com/wittydeveloper/spotify-graphql
//   console: https://spotify-api-graphql-console.herokuapp.com/

// get your token WITH 'playlist-read-private' scope checked at:
//   https://developer.spotify.com/console/get-current-user-playlists
const config = {
  accessToken: "BQC_5OaIfMjv_Np9j8KabdjD3jt4rzVERqf-tZUueXZo3brnznj1oDABDUvyybNWCh8PZ4PAnGge7-QNKhc3yABv-MNfmJuElbxdlpk33E6pWWfzwlwizDWQw-hbHMP1AaRAh2ZqFKYpvYyKmoJVK5bhKQEM6YZEJcDg5ayRkQMWVSPidBbXNJLTGg"
}

const log = res => {
  console.log(JSON.stringify(res, null, 2));
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
  const filename = `spotify-playlist__${name}.json`
  const pathFilename = `plists/${filename}`
  fs.writeFileSync(pathFilename, JSON.stringify(playlist));
}

const gatherAudioFeatures = audioFeatures => {
  audioFeaturesMap[audioFeatures.id] = audioFeatures
}

const readAudioFeaturesFromDisk$ = () => {
  const file = "spotify-audiofeatures.json"
  return fs.readJson(file, { throws: false })
    .then(obj => {
      Object.assign(audioFeaturesMap, obj || {})
    })
}

const writeAudioFeaturesToDisk = () => {
  fs.writeFileSync("spotify-audiofeatures.json", JSON.stringify(audioFeaturesMap, null, 2));
}

const swa = new SpotifyWebApi();
swa.setAccessToken(config.accessToken)

const audioFeaturesForTracks = ids => from(
  swa.getAudioFeaturesForTracks(ids)
)
  .pipe(
    flatMap(res => from(res.body.audio_features))
  )

const intervals$ = interval(500)

const playlists$ = from(
  SpotifyGraphQLClient(config)
    .query(queries.listAllPlaylists)
)
  .pipe(
    map(throwOnGraphQlErrors),
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
    map(throwOnGraphQlErrors),
    map(res => res.data.playlist),
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

// of(['4iV5W9uYEdYUVa79Axb7Rh', '3Qm86XLflmIXVm1wcwkgDK'])
//   .pipe(
//     tap(log),
//     flatMap(audioFeaturesForTracks),
//   // tap(log),
// )
// // .subscribe(log, errout)

// of("2WqG305V4gTeXawHpaUqAf")
//   .pipe(
//     tap(log),
//     concatMap(playListId => fullPlaylist$(playListId)),
//     tap(log),
// )
//   // .subscribe(writePlaylistToDisk)

// ===========================

const playlists_read_audio_features$ = combineLatest(readAudioFeaturesFromDisk$(), playlists$)
  .pipe(
    map(res => res[1]),
)

let playListIdFound = false
zip(playlists_read_audio_features$, intervals$)
  .pipe(
    // take(3),
    map(res => res[0]),
    // tap(v => playListIdFound = playListIdFound || v.id == "5dWiKISQMRVPsSYZN21Wh3"),
    // map(v => ({ ...v, playListIdFound })),
    // // tap(log),
    // filter(v => playListIdFound),
    concatMap(playlist => fullPlaylist$(playlist.id)),
    tap(writePlaylistToDisk),
    tap(pl => log(pl.name)),
    concatMap(
      pl => {
        return from(pl.tracks)
          .pipe(
            map(tr => tr.track.id),
            filter(trid => trid !== null),
            filter(trid => audioFeaturesMap[trid] === undefined),
            filter(trid => audioFeaturesMap[trid] !== null),
            tap(v => {
              if (v === null)
                log(v)
            }),
            bufferCount(100),
            tap(log),
            concatMap(audioFeaturesForTracks),
            retryWhen(errors =>
              errors.pipe(
                tap(val => {
                  console.error(`some error ${val}`)
                }),
                delay(15000),
                take(5),
              )
            )
          )
      }
    ),
    tap(gatherAudioFeatures),
)
  .subscribe(
    n => { },
    e => {
      errout(e);
      writeAudioFeaturesToDisk()
    },
    done => {
      writeAudioFeaturesToDisk()
    })
