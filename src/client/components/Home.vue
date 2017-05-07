<template>
    <main id="app-body">
        <div class="section no-pad-bot" id="index-banner">
            <div class="container">
                <br><br>
                <h1 class="header center orange-text">Book Lending Club</h1>
                <div class="row center">
                    <h5 class="header col s12 light">Borrow books from other users, and lend them your books.</h5>
                </div>
                <div class="row center">
                    <a href="http://materializecss.com/getting-started.html" id="download-button" class="btn-large waves-effect waves-light orange">Get Started</a>
                </div>
                <br><br>
            </div>
        </div>
        <div class="section">
            <div v-if="numberOfBooks > 0" class="container">
                <div class="section">
                    <h3>Books available:</h3>
                    <div class="searchResults">
                        <book-item v-for="book in books" v-bind:key="book.id" v-bind:book="book">
                            <a href="#" @click.prevent="requestBook(book.id)">Request Book</a>
                        </book-item>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script>
    import Search from "./Search.vue";
    import Book from "./Book.vue";
    export default {
        components: {
            "search-box": Search,
            "book-item": Book
        },
        data: function () {
            return {
                books: []
            };
        },
        computed: {
            numberOfBooks: function () {
                return Array.isArray(this.books) ? this.books.length : 0;
            }
        },
        methods: {
            requestBook: function (bookId) {
                console.log("Requesting book #" + bookId);
                let payload = {};
                $.ajax({
                    url: window.location.protocol + "//" + window.location.host + "/api/requests",
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(payload),
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
        },
        beforeMount: function () {
            let thisComponent = this;
            $.ajax({
                url: window.location.protocol + "//" + window.location.host + "/api/books/",
                method: 'GET',
                dataType: "json",
                success: function (data, status, jqXHR) {
                    console.log("Ajax Success!");
                    thisComponent.books = data;
                },
                error: function (jqXHR, status, error) {}
            });
        }
    };
</script>

<style>
</style>