<template>
    <form>
        <div class="row">
            <div class="col s8">
                Search for books: 
                <div class="input-field inline">
                    <input id="query" type="text" class="validate" v-model="query">
                    <label for="query" data-error="wrong" data-success="right">Search:</label>
                </div>
            </div>
            <div class="col s4">
                <button @click.prevent="handleSearch">Search</button>
            </div>
        </div>
        <div v-if="numberOfResults > 0" class="searchResults">
            <book-item v-for="book in searchResults" v-bind:book="book" v-bind:key="book.id">
                <a href="#" @click.prevent="addBook(book)">Add Book</a>
            </book-item>
        </div>
    </form>
</template>
<script>
    import Book from "./Book.vue";
    export default {
        data: () => {
            return {
                query: ""
            };
        },
        components: {
            'book-item': Book
        },
        computed: {
            numberOfResults: function () {
                return (this.$store.state.searchResults == null) ? 0 : this.$store.state.searchResults.length;
            },
            searchResults: function () {
                return this.$store.state.searchResults;
            }
        },
        methods: {
            addBook: function (book) {
                console.log("Adding " + book.title + "!");

                $.ajax({
                    url: window.location.protocol + "//" + window.location.host + "/api/books",
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(book),
                    dataType: "json",
                    success: function (data, status, jqXHR) {
                        console.log("Ajax Success!");
                        console.log(data);
                    },
                    error: function (jqXHR, status, error) {
                        console.log("Ajax Error!");
                        console.log(status);
                        console.log(error);
                    }
                });
            },
            handleSearch: function () {
                let store = this.$store;
                $.ajax({
                    url: "https://www.googleapis.com/books/v1/volumes",
                    crossDomain: true,
                    data: {
                        q: this.query
                    },
                    dataType: "jsonp",
                    success: function (data, status, jqXHR) {
                        console.log("Ajax Success!");
                        console.log(data);
                        store.commit('searchComplete', { results: data });
                    },
                    error: function (jqXHR, status, error) {
                        console.log("Ajax Error!");
                        console.log(status);
                        console.log(error);
                    }
                });
            }
        }
    };
</script>
<style>
</style>