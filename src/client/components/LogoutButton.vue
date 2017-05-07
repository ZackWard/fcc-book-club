<template>
    <li v-if="loggedIn">
        <a href="#" @click.prevent="logout">Logout</a>
    </li>
</template>

<script>
export default {
    data: function () {
        return {};
    },
    computed: {
        loggedIn: function () {
            return this.$store.state.loggedIn;
        }
    },
    methods: {
        logout: function () {
            window.localStorage.removeItem('loggedIn');
            let store = this.$store;
            let router = this.$router;
            $.ajax({
                url: window.location.protocol + "//" + window.location.host + "/api/users/logout",
                method: "GET",
                dataType: "json",
                success: function (data, status, jqXHR) {
                    console.log("Ajax success");
                    console.log(data);
                    store.commit('logout');
                    router.push('/');
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