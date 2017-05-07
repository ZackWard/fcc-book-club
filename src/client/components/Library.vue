<template>
    <main id="library">
        <p v-if="error">{{error}}</p>
        <h3>Your books:</h3>
        <div v-if="numberOfBooks > 0" class="searchResults">
            <book-item v-for="book in books" v-bind:key="book.id" v-bind:book="book">
                <a href="#" @click.prevent="deleteBook(book.id)">Delete Book</a>
            </book-item>
        </div>
        <hr>
        <h3>Books you've borrowed:</h3>
        <div class="searchResults">
            <p>Blah</p>
        </div>
        <hr>
        <h3>Add book:</h3>
        <book-search></book-search>

    </main>
</template>

<script>
import Book from "./Book.vue";
import Search from "./Search.vue";
export default {
    components: {
        'book-item': Book,
        'book-search': Search
    },
    beforeMount: function () {
        if (! this.$store.state.loggedIn) {
            this.error = "You must be logged in to view your library."
            return false;
        }
        let thisComponent = this;
        let reqUrl = window.location.protocol + "//" + window.location.host + "/api/users/" + this.$store.state.loggedIn + "/books";
        console.log("Trying to get " + reqUrl);
        $.ajax({
            url: reqUrl,
            method: 'GET',
            dataType: "json",
            success: function (data, status, jqXHR) {
                console.log("Ajax Success!");
                thisComponent.books = data;
            },
            error: function (jqXHR, status, error) {}
        });
    },
    data: function () {
        return {
            books: [],
            error: false
        };
    },
    computed: {
        numberOfBooks: function () {
            return Array.isArray(this.books) ? this.books.length : 0;
        }
    },
    methods: {
        deleteBook: function (bookId) {
            console.log("Deleting book #" + bookId);
            $.ajax({
                url: window.location.protocol + "//" + window.location.host + "/api/books/" + bookId,
                method: "DELETE",
                contentType: "application/json",
                dataType: "json",
                success: function (data, status, jqXHR) {
                    console.log("Ajax success");
                    console.log(data);
                },
                error: function (xhr, status, error) {
                    console.log("Ajax error");
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