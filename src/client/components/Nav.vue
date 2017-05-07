<template>
    <nav class="light-blue lighten-1" role="navigation">
        <div class="nav-wrapper container">
            <router-link to="/" id="logo-container" class="brand-logo">Logo</router-link>
            <!-- <a id="logo-container" href="#" class="brand-logo">Logo</a> -->
            <ul class="right hide-on-med-and-down">
                <li><a href="#">Navbar Link</a></li>
                <li v-if="!loggedIn"><router-link to="/login">Login</router-link></li>
                <logout-button></logout-button>
                <li v-if="!loggedIn"><router-link to="/register">Register User</router-link></li>
                <li v-if="loggedIn"><router-link to="/profile">Your Profile</router-link></li>
                <li v-if="loggedIn"><router-link to="/library">Your Books</router-link></li>
            </ul>

            <ul id="nav-mobile" class="side-nav">
                <li><a href="#">Navbar Link</a></li>
                <li v-if="!loggedIn"><router-link to="/login">Login</router-link></li>
                <logout-button></logout-button>
                <li v-if="!loggedIn"><router-link to="/register">Register User</router-link></li>
                <li v-if="loggedIn"><router-link to="/profile">Your Profile</router-link></li>
                <li v-if="loggedIn"><router-link to="/library">Your Books</router-link></li>
            </ul>
            <a href="#" data-activates="nav-mobile" class="button-collapse"><i class="material-icons">menu</i></a>
        </div>
    </nav>
</template>

<script>
    import LogoutButton from "./LogoutButton.vue";
    export default {
        data: () => {
            return {
                message: "nav"
            };
        },
        components: {
            "logout-button": LogoutButton
        },
        computed: {
            loggedIn: function () {
                return this.$store.state.loggedIn;
            }
        }
    };
</script>

<style>
</style>