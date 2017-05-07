<template>
    <main>
        <div class="container">
            <form method="POST">
                <div class="row">
                </div>
                <div class="row">
                    <div class="input-field col s6">
                        <input id="username" type="text" class="validate" v-model="userName">
                        <label for="username">Username</label>
                    </div>
                    <div class="input-field col s6">
                        <input id="password" type="password" class="validate" v-model="password">
                        <label for="password">Password</label>
                    </div>
                </div>
                <div class="row">
                    <div class="input-field sol s12">
                        <button class="btn waves-effect waves-light" type="button" @click.prevent="handleClick">Login <i class="material-icons right">send</i></button>
                    </div>
                </div>
            </form>
        </div>
    </main>
</template>

<script>
module.exports = {
    data: function () {
        return {
            userName: "",
            password: ""
        };
    },
    methods: {
        handleClick: function () {
            // Keep a reference to our Vuex store and our router so that we can commit to it from our ajax callback
            let store = this.$store;
            let router = this.$router;

            let payload = {
                username: this.userName,
                password: this.password
            };
            $.ajax({
                url: window.location.protocol + "//" + window.location.host + "/api/users/login",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(payload),
                dataType: "json",
                success: function (data, status, jqXHR) {
                    console.log("Ajax success");
                    console.log(data);
                    window.localStorage.setItem('loggedIn', payload.username);
                    store.commit('login', {username: payload.username});
                    router.replace('/');
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