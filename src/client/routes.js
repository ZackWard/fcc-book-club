import * as Home from "./components/Home.vue";
import * as Register from "./components/RegisterUserForm.vue";
import * as Login from "./components/LoginForm.vue";
import * as Profile from "./components/Profile.vue";
import * as Library from "./components/Library.vue";

export default [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/profile', component: Profile },
    { path: '/register', component: Register },
    { path: '/library', component: Library }
];