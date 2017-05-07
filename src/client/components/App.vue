<template>
    <div id="app-div">
        <app-nav></app-nav>
        <router-view></router-view>
        <app-footer></app-footer>
    </div>
</template>

<script>
    import Nav from "./Nav.vue";
    import Footer from "./Footer.vue";

    export default {
        components: {
            "app-nav": Nav,
            "app-footer": Footer
        },
        data: () => {
            return {
                message: "Test"
            };
        }
    };
</script>

<style>
</style>