import xs from 'xstream';
import { div, span, pre, li, h1, h2, h3, table, tr, td } from '@cycle/dom';
import isolate from '@cycle/isolate';
import CountList from '../countlist';
import Tracks from '../tracks';
import Artist from '../artist';
import dropRepeats from 'xstream/extra/dropRepeats';
import _ from 'lodash';

const defaultState = {
    genres: {
        selected: {},
        filter: '',
        list: []
    },
    relatedGenres: {
        reference: '',
        filter: '',
        list: []
    },
    playlists: {
        list: [],
        filter: '',
        selected: {}
    },
    artist: {
        genres: {
            list: [],
            filter: '',
            selected: {}
        },
        collaborators: [],
        artist: {}
    },
    tracks: { list: [] }
};

function intent({ DOM, HTTP }) {
    return {
        tracks$: HTTP.select('tr')
            .map(response$ =>
                response$.replaceError(e => xs.of({ ...e, body: [] }))
            )
            .flatten()
            .map(res => res.body),
        playlists$: HTTP.select('pl')
            .map(response$ =>
                response$.replaceError(e => xs.of({ ...e, body: [] }))
            )
            .flatten()
            .map(res => res.body),
        relgen$: HTTP.select('relgen')
            .map(response$ =>
                response$.replaceError(e => xs.of({ ...e, body: [] }))
            )
            .flatten()
            .map(res => res.body),
        gen$: HTTP.select('gen')
            .map(response$ =>
                response$.replaceError(e => xs.of({ ...e, body: [] }))
            )
            .flatten()
            .map(res => res.body),
        artist$: HTTP.select('artist')
            .map(response$ =>
                response$.replaceError(e => xs.of({ ...e, body: [] }))
            )
            .flatten()
            .map(res => res.body)
            .debug()
    };
}

function model(intents, detailsRequest$) {
    const defaultReducer$ = xs.of(prevState =>
        typeof prevState === 'undefined' ? defaultState : prevState
    );

    const savePlaylistsResponseReducer$ = intents.playlists$.map(
        response => prevState => ({
            ...prevState,
            playlists: {
                ...prevState.playlists,
                list: response
            }
        })
    );

    const saveTracksResponseReducer$ = intents.tracks$.map(
        response => prevState => ({
            ...prevState,
            tracks: { ...prevState.tracks, list: response }
        })
    );

    const saveRelGenResponseReducer$ = intents.relgen$.map(
        response => prevState => ({
            ...prevState,
            relatedGenres: {
                ...prevState.relatedGenres,
                list: response.map(genre => ({ name: genre.genre, ...genre }))
            }
        })
    );

    const saveArtistResponseReducer$ = intents.artist$.map(
        ([response]) => prevState => {
            return {
                ...prevState,
                artist: {
                    artist: response.artist,
                    collaborators: response.collaborators,
                    genres: {
                        ...prevState.artist.genres,
                        list: response.genres
                    }
                }
            };
        }
    );

    const saveReferenceGenreReducer$ = detailsRequest$.map(
        reference => prevState => ({
            ...prevState,
            relatedGenres: {
                ...prevState.relatedGenres,
                reference
            }
        })
    );

    const saveGenResponseReducer$ = intents.gen$.map(response => prevState => ({
        ...prevState,
        genres: {
            ...prevState.genres,
            list: response.map(genre => ({ ...genre, name: genre.genre }))
        }
    }));

    return xs.merge(
        defaultReducer$,
        saveGenResponseReducer$,
        saveRelGenResponseReducer$,
        saveReferenceGenreReducer$,
        savePlaylistsResponseReducer$,
        saveTracksResponseReducer$,
        saveArtistResponseReducer$
    );
}

function view(
    genresDOM$,
    relatedGenresDOM$,
    playlistsDOM$,
    tracksDOM$,
    artistDOM$,
    state$
) {
    return xs
        .combine(
            genresDOM$,
            relatedGenresDOM$,
            playlistsDOM$,
            tracksDOM$,
            artistDOM$,
            state$
        )
        .map(
            ([
                genreDOM,
                relatedGenreDOM,
                playlistsDOM,
                tracksDOM,
                artistDOM,
                state
            ]) =>
                div('.grid', [
                    div('.artist', artistDOM),
                    div('.pl', [h3('playlists'), playlistsDOM]),
                    div('.gen', [h3('genres'), genreDOM]),
                    state.relatedGenres.reference === null
                        ? div('.relgen')
                        : div('.relgen', [
                              h3(
                                  `related genres to ${
                                      state.relatedGenres.reference
                                  }`
                              ),
                              relatedGenreDOM
                              // pre(JSON.stringify(s.relatedGenres, null, 2))
                          ]),
                    div('.tr', [
                        // JSON.stringify(s.tracks, null, 2)
                        tracksDOM
                    ])
                ])
        );
}

export default function App(sources) {
    const state$ = sources.state.stream;

    const playlistsLens = {
        get: state => state.playlists,
        set: (state, playlistsState) => ({
            ...state,
            playlists: {
                ...state.playlists,
                ...playlistsState
            }
        })
    };
    const playlists = isolate(CountList({ keyFn: i => i.id }), {
        state: playlistsLens
    })(sources);

    const genresLens = {
        get: state => state.genres,
        set: (state, genreState) => ({
            ...state,
            genres: {
                ...state.genres,
                ...genreState
            }
        })
    };
    const genres = isolate(CountList({}), {
        state: genresLens
    })(sources);

    const relatedGenresLens = {
        get: state => ({
            ...state.relatedGenres,
            selected: state.genres.selected
        }),
        set: (state, genreState) => ({
            ...state,
            genres: {
                ...state.genres,
                selected: genreState.selected
            },
            relatedGenres: {
                ...state.relatedGenres,
                ...genreState
            }
        })
    };
    const relatedGenres = isolate(CountList({ renderAllSelections: false }), {
        state: relatedGenresLens
    })(sources);

    const tracks = isolate(Tracks, { state: 'tracks' })(sources);

    const artistLens = {
        get: state => {
            console.log('ARTIST LENS');
            return {
                ...state.artist,
                genres: {
                    ...state.artist.genres,
                    selected: state.genres.selected
                }
            };
        },
        set: (state, artistState) => ({
            ...state,
            genres: { ...state.genres, selected: artistState.genres.selected },
            artist: artistState
        })
    };
    const artist = isolate(Artist, { state: artistLens })(sources);

    const playlistsByGenresRequest$ = state$
        .map(s => Object.keys(s.genres.selected))
        .compose(dropRepeats((x, y) => _.isEqual(x, y)))
        .map(genres => {
            const url =
                genres.length > 0
                    ? `/api/playlists?genres=${encodeURIComponent(genres)}`
                    : `/api/playlists`;
            return {
                url,
                headers: { 'content-type': 'application/json' },
                category: 'pl'
            };
        });

    const genresByPlaylistRequest$ = state$
        .map(s => Object.keys(s.playlists.selected))
        .compose(dropRepeats((x, y) => _.isEqual(x, y)))
        .map(playlistIds => {
            const url =
                playlistIds.length > 0
                    ? `/api/genres?playlists=${playlistIds}`
                    : `/api/genres`;
            return {
                url,
                headers: { 'content-type': 'application/json' },
                category: 'gen'
            };
        })
        .debug();

    const genreDetailsRequest$ = xs
        .merge(genres.detailsRequest, relatedGenres.detailsRequest)
        .map(genre => genre.name);

    const tracksDetailsRequest$ = tracks.detailsRequest.map(track => track.id);
    const artistDetailsRequest$ = artist.detailsRequest.map(
        artist => artist.id
    );

    const artistsRequest$ = xs
        .merge(tracksDetailsRequest$, artistDetailsRequest$)
        .map(artistId => ({
            url: `/api/artist/${artistId}`,
            headers: { 'content-type': 'application/json' },
            category: 'artist'
        }))
        .debug();

    const relatedGenresRequest$ = genreDetailsRequest$
        .map(genre => ({
            url: `/api/genre/related/${encodeURIComponent(genre)}`,
            headers: { 'content-type': 'application/json' },
            category: 'relgen'
        }))
        .debug();

    const tracksRequest$ = state$
        .map(state => ({
            playlistIds: Object.keys(state.playlists.selected),
            genres: Object.keys(state.genres.selected)
        }))
        .filter(
            ({ genres, playlistIds }) =>
                genres.length > 0 && playlistIds.length > 0
        )
        .compose(dropRepeats((x, y) => _.isEqual(x, y)))
        .map(({ genres, playlistIds }) => {
            return {
                url: `/api/tracks?genres=${encodeURIComponent(
                    genres
                )}&playlists=${playlistIds}`,
                headers: { 'content-type': 'application/json' },
                category: 'tr'
            };
        })
        .debug();

    const actions = intent(sources);
    const localReducer$ = model(actions, genreDetailsRequest$);
    const reducer$ = xs.merge(
        localReducer$,
        genres.state,
        relatedGenres.state,
        playlists.state,
        tracks.state,
        artist.state
    );

    const request$ = xs.merge(
        genresByPlaylistRequest$,
        relatedGenresRequest$,
        playlistsByGenresRequest$,
        tracksRequest$,
        artistsRequest$
    );

    state$.subscribe({ next: state => console.log({ state }) });

    return {
        DOM: view(
            genres.DOM,
            relatedGenres.DOM,
            playlists.DOM,
            tracks.DOM,
            artist.DOM,
            state$
        ),
        state: reducer$,
        HTTP: request$
    };
}
