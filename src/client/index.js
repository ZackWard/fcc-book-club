import Vue from "vue";
import Vuex from "vuex";
import VueRouter from "vue-router";
import routes from "./routes";
import store from "./store";
import App from "./components/App.vue";

Vue.use(Vuex);
Vue.use(VueRouter);

const vuexStore = new Vuex.Store(store);
const router = new VueRouter({
    routes,
    mode: "history"
});

var myApp = new Vue({
    components: {
        "app": App
    },
    store: vuexStore,
    router,
    el: "#app",
    render: (h) => h(App)
});