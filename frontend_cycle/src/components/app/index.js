import xs from 'xstream';
import { div, span, pre, li, h1, h2, h3, table, tr, td } from '@cycle/dom';
import isolate from '@cycle/isolate';
import CountList from '../countlist';
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
    tracks: []
};

function intent({ DOM, HTTP }) {
    return {
        tracks$: HTTP.select('tr')
            .map(response$ =>
                response$.replaceError(e => xs.of({ ...e, body: [] }))
            )
            .flatten()
            .map(res => res.body),
        // .debug(),
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
        // .debug()
        gen$: HTTP.select('gen')
            .map(response$ =>
                response$.replaceError(e => xs.of({ ...e, body: [] }))
            )
            .flatten()
            .map(res => res.body)
        // .debug()
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
                list: [...response]
            }
        })
    );

    const saveTracksResponseReducer$ = intents.tracks$.map(
        response => prevState => ({
            ...prevState,
            tracks: response
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
        saveTracksResponseReducer$
    );
}

function view(genresDOM$, relatedGenresDOM$, playlistsDOM$, state$) {
    return xs
        .combine(genresDOM$, relatedGenresDOM$, playlistsDOM$, state$)
        .map(([g, rg, pl, s]) =>
            div('.grid', [
                pre(
                    '.debug',
                    Object.keys(
                        Object.assign(
                            {},
                            s.playlists.selected,
                            s.genres.selected
                        )
                    ).map(i => `${i}\n`)
                ),
                div('.pl', [h3('playlists'), pl]),
                div('.gen', [h3('genres'), g]),
                s.relatedGenres.reference === null
                    ? div('.relgen')
                    : div('.relgen', [
                          h3(`related genres to ${s.relatedGenres.reference}`),
                          rg
                          // pre(JSON.stringify(s.relatedGenres, null, 2))
                      ]),
                div('.tr', [
                    // JSON.stringify(s.tracks, null, 2)
                    table(
                        s.tracks.map(t =>
                            tr([
                                td(t.artist.name),
                                td(t.track),
                                td(t.playlist.name)
                            ])
                        )
                    )
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

    const playlistsRequest$ = xs
        .of({
            url: `/api/playlists`,
            headers: { 'content-type': 'application/json' },
            category: 'pl'
        })
        .debug();

    const genresRequest$ = xs
        .of({
            url: `/api/genres`,
            headers: { 'content-type': 'application/json' },
            category: 'gen'
        })
        .debug();

    const detailsRequest$ = xs
        .merge(genres.detailsRequest, relatedGenres.detailsRequest)
        .map(genre => genre.name);

    const relatedGenresRequest$ = detailsRequest$
        .map(genre => ({
            url: `/api/genre/${genre}/related`,
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
                url: `/api/tracks?genres=${genres}&playlists=${playlistIds}`,
                headers: { 'content-type': 'application/json' },
                category: 'tr'
            };
        })
        .debug();

    const actions = intent(sources);
    const localReducer$ = model(actions, detailsRequest$);
    const reducer$ = xs.merge(
        localReducer$,
        genres.state,
        relatedGenres.state,
        playlists.state
    );

    const request$ = xs.merge(
        genresRequest$,
        relatedGenresRequest$,
        playlistsRequest$,
        tracksRequest$
    );

    state$.subscribe({ next: state => console.log({ state }) });

    return {
        DOM: view(genres.DOM, relatedGenres.DOM, playlists.DOM, state$),
        state: reducer$,
        HTTP: request$
    };
}
