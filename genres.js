const fs = require('fs');
const fetch = require('node-fetch');
const htmlparser = require('node-html-parser');
const _ = require('lodash')

// const neo4j = require('neo4j-driver').v1;
// const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
// const session = driver.session();

// const personName = 'Alice';
// session.run(
//   'CREATE (a:Person {name: $name}) RETURN a',
//   {name: personName}
// )
// .then(result => {
//   session.close();

//   const singleRecord = result.records[0];
//   const node = singleRecord.get(0);

//   console.log(node.properties.name);

//   // on application exit:
//   driver.close();
// });


const extractStyles = input => {
  const styleInput = input.attributes['style']
    .split('; ')
    .map(tuple => {
      const [k, v] = tuple.split(': ');
      let value = v.match(/\d+/)
      if (value !== null)
        value = value[0]
      return {
        key: k,
        value: value
      };
    });
  return _.mapValues(_.keyBy(styleInput, 'key'), 'value')
}

const readFromDisk = path => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err !== null)
        return reject(err);
      resolve(data);
    })
  })
    .then(buffer => buffer.toString())
}


readFromDisk('genres_/engenremap.html')
  .then(text => htmlparser.parse(text))
  .then(html => html.querySelector('div.canvas')
    .querySelectorAll('.scanme')
    .map(e => ({
      genre: e.childNodes[0].text,
      link: e.childNodes[1].attributes['href']
    }))
    .map(parent =>
      readFromDisk(`genres_/${parent.link}`)
        .then(text => htmlparser.parse(text))
        .then(html => ({
          artists: html.querySelector('div.canvas')
            .querySelectorAll('.scanme')
            .map(e => ({
              name: e.childNodes[0].text,
              id: e.childNodes[1].attributes['href'].split(':')[2]
            })),
          related_genres: html.querySelector('#tunnel .canvas')
            .querySelectorAll('.genre')
            .map(e => {
              const style = extractStyles(e)
              const parentStyle = extractStyles(e.parentNode)
              return {
                name: e.childNodes[0].text,
                relation: {
                  top: style['top'],
                  left: style['left'],
                  size: style['font-size'],
                  width: parentStyle['width'],
                  height: parentStyle['height']
                }
              }
            })
            // .filter(e => e.name.indexOf(parent.genre) === -1)
        }))
        .then(xe => ({ ...xe, genre: parent.genre }))
        .then(JSON.stringify)
        .then(console.log)
    )
  )
