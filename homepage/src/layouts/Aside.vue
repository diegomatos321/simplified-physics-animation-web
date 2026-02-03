<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
    <aside class="w-full md:w-1/4 bg-white border-b p-8 md:border-b-0 md:border-r border-slate-200">
        <div class="sticky top-0">
            <h2 class="font-display font-bold text-xl text-slate-800 mb-4">Demos</h2>
            <nav>
                <ul class="space-y-2">
                    <RouterLink
                        to="/demos/polygon-chaos"
                        class="block py-2 px-4 rounded-md hover:bg-slate-100 transition-colors"
                        active-class="block py-2 px-4 rounded-md font-semibold bg-blue-50 text-blue-600 border-l-4 border-blue-500"
                    >
                        Polygon Chaos
                    </RouterLink>

                    <RouterLink
                        to="/demos/cloth-trellis"
                        class="block py-2 px-4 rounded-md hover:bg-slate-100 transition-colors"
                        active-class="block py-2 px-4 rounded-md font-semibold bg-blue-50 text-blue-600 border-l-4 border-blue-500"
                    >
                        Tecidos e Treliça
                    </RouterLink>
                </ul>
            </nav>
        </div>
    </aside>
</template>
