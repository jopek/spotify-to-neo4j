// const fs = require('fs-extra');
const fs = require('fs');
const { combineLatest, empty, from, of, iif, interval, zip } = require('rxjs');
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
const fetch = require('node-fetch');
const htmlparser = require('node-html-parser');

const log = s => {
  console.log(s);
  return s;
}


const readFromDisk = path => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if(err !== null)
        return reject(err);
      resolve(data);
    })
  })
  .then(buffer => buffer.toString())
}


const fetchSource = path => fetch(`http://everynoise.com/${path}`)
  .then(res => res.text())


const rec = src => from(
  // fetchSource(src)
  readFromDisk(src.link)
    .then(text => htmlparser.parse(text))
    .then(html => [html.querySelector('div.canvas'), html.querySelector('div#tunnel > div.canvas')])
)
  .pipe(
    flatMap(h => h.querySelectorAll('.scanme')),
    map(e => ({
      parent: src.name,
      name: e.childNodes[0].text,
      link: e.childNodes[1].attributes['href'],
    })),
    // tap(log),
    flatMap(e =>
      iif(
        () => e.link.indexOf('spotify:artist:') === 0,
        of(e),
        rec(e)
      )
    )
  )

rec({link: 'genres_/engenremap-dub.html', name: 'dub'})
// rec({ link: 'genres_/engenremap.html' })
  .subscribe(
    log,
    console.error,
    done => console.log('done.')
  )
