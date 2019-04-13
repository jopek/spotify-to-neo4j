import xs from 'xstream';
import { div, span, pre, li, h1, h2, h3 } from '@cycle/dom';
import isolate from '@cycle/isolate';
import CountList from '../countlist';
import dropRepeats from 'xstream/extra/dropRepeats';
import _ from 'lodash';

const defaultState = {
    selectedGenres: {},
    genres: [],
    relatedGenres: {
        reference: null,
        genres: []
    },
    playlists: [],
    tracks: [],
    selectedPlaylists: {}
};

function intent({ DOM, HTTP }) {
    return {
        tracks$: HTTP.select('tr')
            .flatten()
            .map(res => res.body),
        // .debug(),
        playlists$: HTTP.select('pl')
            .flatten()
            .map(res => res.body),
        relgen$: HTTP.select('relgen')
            .flatten()
            .map(res => res.body),
        // .debug()
        gen$: HTTP.select('gen')
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
            playlists: [...response]
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
                genres: response.map(genre => ({ ...genre, name: genre.genre }))
            }
        })
    );

    const saveReferenceGenreReducer$ = detailsRequest$.map(
        reference => prevState => ({
            ...prevState,
            relatedGenres: { ...prevState.relatedGenres, reference }
        })
    );

    const saveGenResponseReducer$ = intents.gen$.map(response => prevState => ({
        ...prevState,
        genres: response.map(genre => ({ ...genre, name: genre.genre }))
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
                        Object.assign({}, s.selectedPlaylists, s.selectedGenres)
                    ).map(i => `${i}\n`)
                ),
                div('.pl', [h3('playlists'), pl]),
                div('.gen', [h3('genres'), g]),
                s.relatedGenres.reference === null
                    ? null
                    : div('.relgen', [
                          h3(`related genres to ${s.relatedGenres.reference}`),
                          rg
                          // pre(JSON.stringify(s.relatedGenres, null, 2))
                      ]),
                div('.tr', [
                    pre(
                        // JSON.stringify(s.tracks, null, 2)
                        s.tracks.map(t => `${t.artist.name} - ${t.track}\n`)
                    )
                ])
            ])
        );
}

export default function App(sources) {
    const state$ = sources.state.stream;

    const genresLens = {
        get: state => ({
            list: [...state.genres],
            selected: state.selectedGenres
        }),
        set: (state, genreState) => ({
            ...state,
            selectedGenres: genreState.selected
        })
    };
    const genres = isolate(CountList(i => i.name), { state: genresLens })(
        sources
    );

    const playlistsLens = {
        get: state => ({
            list: [...state.playlists],
            selected: state.selectedPlaylists
        }),
        set: (state, playlistsState) => ({
            ...state,
            selectedPlaylists: playlistsState.selected
        })
    };
    const playlists = isolate(CountList(i => i.id), { state: playlistsLens })(
        sources
    );

    const relatedGenresLens = {
        get: state => ({
            list: [...state.relatedGenres.genres],
            selected: state.selectedGenres,
            reference: state.reference
        }),
        set: (state, genreState) => ({
            ...state,
            relatedGenres: {
                ...state.relatedGenres,
                genres: [...genreState.list]
            }
        })
    };
    const relatedGenres = isolate(CountList(i => i.name), {
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
            playlistIds: Object.keys(state.selectedPlaylists),
            genres: Object.keys(state.selectedGenres)
        }))
        .filter(
            state => state.genres.length > 0 && state.playlistIds.length > 0
        )
        .compose(dropRepeats((x, y) => _.isEqual(x, y)))
        .map(state => {
            return {
                url: `/api/tracks?genres=${state.genres}&playlists=${
                    state.playlistIds
                }`,
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

    // state$.subscribe({ next: state => console.log({ state }) })

    return {
        DOM: view(genres.DOM, relatedGenres.DOM, playlists.DOM, state$),
        state: reducer$,
        HTTP: request$
    };
}
