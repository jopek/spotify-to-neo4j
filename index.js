const { SpotifyGraphQLClient } = require('spotify-graphql');

const config = {
    accessToken: "BQCzKgsHtMVWPW7CgUdP4_y0-LVPm-BXVBbRamonoJGhMO7TH0IC1CBkJApBx6txxozE9DbDwDdvyiScB_R-3sfqW6pmAr0bsKLGkNPIU-2q9lXCkvbth3ZtN6Jxor9ipMbHU0C_QhJakfJ4Q0oUm-yb_Xb7khZOqM4r76Ig19rHFFFJ-TcYGEA"
}
// (userId: "1128723762", id: "2YARXniaJywrRZbbQeSoAi") 

SpotifyGraphQLClient(config).query(`
{
  me {
    # playlist(userId: "1128723762", id: "2YARXniaJywrRZbbQeSoAi") {
    playlists(limit: -1) {
      id
      uri
      name
      owner {
        id
        display_name
      }
      tracks {
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
            id
            name
            genres
          }
          preview_url
          track_number
          href
          # audio_features {
          #   id
          #   duration_ms
          #   acousticness
          #   danceability
          #   instrumentalness
          #   energy
          #   key
          #   liveness
          #   loudness
          #   mode
          #   speechiness
          #   tempo
          #   time_signature
          #   valence
          # }
        }
      }
    }
  }
}
`).then(executionResult => {
        if (executionResult.errors) {
            console.log('error');
            console.error(JSON.stringify(executionResult.errors));
        } else {
            console.log('success');
            console.log(JSON.stringify(executionResult.data, null, 2));
        }
    })