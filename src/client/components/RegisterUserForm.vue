<template>
    <div class="container">
        <form method="POST">
            <div class="row">
            </div>
            <div class="row">
                <div class="input-field col s12">
                    <input id="username" type="text" class="validate" v-model="userName">
                    <label for="username">Username</label>
                </div>
            </div>
            <div class="row">
                <div class="input-field col s6">
                    <input id="password" type="password" class="validate" v-model="password">
                    <label for="password">Password</label>
                </div>
                <div class="input-field col s6">
                    <input id="password-verification" type="password" class="validate" v-model="passwordVerification">
                    <label for="password-verification">Verify Password</label>
                </div>
            </div>
            <div class="row">
                <div class="input-field sol s12">
                    <button class="btn waves-effect waves-light" type="button" @click.prevent="handleClick">Register <i class="material-icons right">send</i></button>
                    <span v-if="error">Error: {{ error }}</span>
                </div>
            </div>
        </form>
    </div>
</template>

<script>
module.exports = {
    data: function () {
        return {
            userName: "",
            password: "",
            passwordVerification: "",
            error: false
        };
    },
    methods: {
        handleClick: function () {
            console.log("Click!");
            if (this.password !== this.passwordVerification) {
                this.error = "Passwords do not match";
                return;
            } else {
                this.error = false;
            }
            console.log("Sending ajax!");
            let payload = {
                username: this.userName,
                password: this.password
            };
            let vuexStore = this.$store;
            let router = this.$router;
            $.ajax({
                url: window.location.protocol + "//" + window.location.host + "/api/users",
                method: "POST",
                contentType: "application/json",
                processData: false,
                data: JSON.stringify(payload),
                dataType: "json",
                success: function (data, status, jqXHR) {
                    window.localStorage.setItem('loggedIn', payload.username);
                    vuexStore.commit('login', { username: payload.username });
                    console.log("Ajax success");
                    console.log(data);
                    router.replace('/');
                },
                error: function (jqXHR, status, error) {
                    console.log("Ajax error");
                    console.log(status);
                    console.log(error);
                },
                complete: function (jqXHR, status) {
                    console.log("ajax complete. Status: " + status);
                }
            });
        }
    }
};
</script>

<style>
</style>