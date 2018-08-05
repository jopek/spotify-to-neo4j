module.exports = {
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
    tracks(limit: -1, throttle: 10){
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
    trackAnalysis: `{
    query track($trid: String!) {
    track(id: $trid) {
      name
      uri
      audio_features{
        acousticness
        analysis_url
        danceability
        duration_ms
        energy
        instrumentalness
        key
        liveness
        loudness
        mode
        speechiness
        tempo
        time_signature
        valence
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
