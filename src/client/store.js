export default {
    state: {
        message: "Refactored Vuex Store",
        loggedIn: (window.localStorage.getItem('loggedIn') ? window.localStorage.getItem('loggedIn') : false),
        searchResults: null
    },
    mutations: {
        login(state, payload) { state.loggedIn = payload.username; },
        logout(state) { state.loggedIn = false; },
        searchComplete(state, payload) {
            if (payload.results.error || payload.results.totalItems < 1) {
                state.searchResults = null;
            } else {
                state.searchResults = payload.results.items.map(function (item) {
                    return {
                        id: item.id,
                        title: item.volumeInfo.title,
                        subtitle: typeof item.volumeInfo.subtitle == 'undefined' ? null : item.volumeInfo.subtitle,
                        authors: item.volumeInfo.authors.join(', '),
                        description: item.volumeInfo.description,
                        image: item.volumeInfo.imageLinks ? item.volumeInfo.imageLinks.thumbnail : null
                    };
                });
            }
        }
    }
};