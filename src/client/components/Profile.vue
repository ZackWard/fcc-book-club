<template>
    <main>
        <div class="container">
            <form method="POST">
                <div class="row">
                    <div class="input-field col s6">
                        <input id="first_name" type="text" class="validate" v-model="firstName">
                        <label for="city">First Name</label>
                    </div>
                    <div class="input-field col s6">
                        <input id="last_name" type="text" class="validate" v-model="lastName">
                        <label for="state">Last Name</label>
                    </div>
                </div>
                <div class="row">
                    <div class="input-field col s6">
                        <input id="city" type="text" class="validate" v-model="city">
                        <label for="city">City</label>
                    </div>
                    <div class="input-field col s6">
                        <input id="state" type="text" class="validate" v-model="state">
                        <label for="state">State</label>
                    </div>
                </div>
                <div class="row">
                    <div class="input-field sol s12">
                        <button class="btn waves-effect waves-light" type="button" @click.prevent="handleClick">Save <i class="material-icons right">send</i></button>
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
            firstName: "",
            lastName: "",
            city: "",
            state: "",
            loading: false
        };
    },
    created: function () {
        console.log("Profile component created, fetching data.");
        this.fetchData();
    },
    updated: function () {
        // Materialize is declared globally, update text fields to prevent the labels from overlapping the text
        Materialize.updateTextFields();
    },
    methods: {
        fetchData: function () {
            let state = this;
            state.loading = true;
            $.ajax({
                url: window.location.protocol + "//" + window.location.host + "/api/users/" + this.$store.state.loggedIn,
                method: "GET",
                dataType: "json",
                success: function (data, status, jqXHR) {
                    console.log("Ajax success");
                    console.log(data);
                    state.firstName = data.firstName;
                    state.lastName = data.lastName;
                    state.city = data.city;
                    state.state = data.state;
                    state.loading = false;
                },
                error: function () {
                    console.log("Ajax error");
                }
            });
        },
        handleClick: function () {
            
            if (!this.$store.state.loggedIn) {
                console.log("You can't update the profile, you aren't logged in!");
                return;
            }

            let payload = {
                first_name: this.firstName,
                last_name: this.lastName,
                city: this.city,
                state: this.state
            };

            $.ajax({
                url: window.location.protocol + "//" + window.location.host + "/api/users/" + this.$store.state.loggedIn,
                method: "PUT",
                contentType: "application/json",
                data: JSON.stringify(payload),
                dataType: "json",
                success: function (data, status, jqXHR) {
                    console.log("Ajax success");
                    console.log(data);
                },
                error: function () {
                    console.log("Ajax error");
                }
            });
        }
    }
};
</script>

<style>
</style>