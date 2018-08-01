const { SpotifyGraphQLClient } = require('spotify-graphql');
const fs = require('fs');
// const { fromPromise } = require('rxjs');

const config = {
  accessToken: "BQDE8EOWXfTxpM4c4Rz8owd4F1ctPD6tL15qhzJMrmb56FSY4t77suRZwJwwtcfyiKoVtP95CJnsjPIn-YpdAibNP1x47YS6K-lk0qnO4bjDUD560lDkcrAbniJcWgUBNwRMGMuNajvo7vX_rxBB1hihAd939Iyy-Dggfd0oQZU7NBB8tbcUaEA"
}

const log = res => {
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

// SpotifyGraphQLClient(config)
//   .query(queries.playlistTracks, null, null, { userId: "1128723762", plid: "7kyKBd1NL32VahfOHNL3qF" })
//   .then(log)

// return;

SpotifyGraphQLClient(config)
  .query(queries.listAllPlaylists)
  .then(result => {
    return new Promise((resolve, reject) => {
      if (result.errors) {
        return reject(new Error(result.errors))
      }
      return resolve(result)
    })
  })
  .then(res => res.data.me.playlists)
  .then(
    res => res.map(
      playlist => {
        return SpotifyGraphQLClient(config)
          .query(queries.playlistTracks, null, null, { userId: "1128723762", plid: playlist.id })
          .then(r => {
            const f = r.data.playlist
            if (f === null) {
              console.error("blaaargh")
            }
            return f
          })
          .then(r => {
            const name = playlist.name.replace(/[^\w]/g, "_")
            const filename = `spotify-playlist__${name}.json`
            console.log(`writing ${filename}`, JSON.stringify(r))
            //fs.writeFileSync(filename, JSON.stringify(r, null, 2));
          })

      }
    )
  )
  .then(r => Promise.all(r))
  // .then(log)
  .catch(e => {
    console.error(JSON.stringify(result.errors))
  })
