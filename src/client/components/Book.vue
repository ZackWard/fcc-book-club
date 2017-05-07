<template>
    <div class="card horizontal searchResultItem">
        <div class="card-image waves-effect waves-block waves-light">
            <img class="activator" v-if="book.image" v-bind:src="book.image">
        </div>
        <div class="card-stacked">
            <div class="card-content">
                <span class="card-title activator grey-text text-darken-4">{{ book.title }}<i class="material-icons right">more_vert</i></span>
                <p>{{ book.subtitle }}</p>
            </div>
            <div class="card-action">
                <slot></slot>
            </div>
        </div>
        <div class="card-reveal">
            <span class="card-title grey-text text-darken-4">{{ book.title }}<i class="material-icons right">close</i></span>
            <p>{{ book.description }}</p>
        </div>
    </div>
</template>
<script>
    export default {
        props: [ 'book' ]
    };
</script>
<style>
</style>
