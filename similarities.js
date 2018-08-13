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
  take, takeWhile,
  toArray
} = require('rxjs/operators');

const audioFeaturesMap = {}


const readAudioFeaturesFromDisk$ = fname => {
  return fs.readJson(fname, { throws: false })
    .then(obj => {
      Object.assign(audioFeaturesMap, obj || {})
      return obj
    })
}

const logObject = res => {
  console.log(JSON.stringify(res, null, 2));
  return res;
}

const log = res => {
  console.log(res);
  return res;
}

const distance = (af1, af2) => {
  const squares = [
    Math.pow((af1.danceability - af2.danceability), 2),
    Math.pow((af1.energy - af2.energy), 2),
    Math.pow((af1.loudness - af2.loudness), 2),
    Math.pow((af1.speechiness - af2.speechiness), 2),
    Math.pow((af1.acousticness - af2.acousticness), 2),
    Math.pow((af1.instrumentalness - af2.instrumentalness), 2),
    Math.pow((af1.liveness - af2.liveness), 2),
    Math.pow((af1.valence - af2.valence), 2),
    Math.pow((af1.tempo - af2.tempo) / 1000, 2)
  ]
  const squaresSum = squares.reduce((a, b) => a + b, 0)
  return Math.pow(squaresSum, 0.5)
}

const uri = "spotify:track:2IEc5k6yWRBV3q2ArUiPhJ"
const filename = (false) ? "limited-spotify-audiofeatures.json" : "spotify-audiofeatures.json"
const features$ = readAudioFeaturesFromDisk$(filename)
  .then(res => {
    return Object.keys(res).map(k => res[k])
  })
  // .then(res => res.map(r))
  // .then(log)


from(features$)
// of("")
  .pipe(
    flatMap(res => from(res)),
    // take(20),
    // tap(log),
    map(af => (
      {
        // ...af,
        uri: af.uri,
        distance: distance(af, audioFeaturesMap["2IEc5k6yWRBV3q2ArUiPhJ"])
      }
    )),
    toArray(),
    map(arr => arr.sort((x, y) => x.distance < y.distance ? -1 : 1)),
    flatMap(from),
    take(10),
)
  .subscribe(logObject)
