<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
    <!-- Hero Section -->
    <section id="intro" class="py-20">
        <div class="container mx-auto px-6">
            <h1 class="text-4xl font-bold text-blue-600 mb-4">Animação Física Simplificada na Web</h1>
            <p class="text-lg text-gray-600">
                Este trabalho apresenta o desenvolvimento de um sistema de animação física simplificada para aplicações Web, fundamentado no método de Jakobsen
                (2001). O objetivo é investigar e demonstrar como técnicas de simulação leve podem produzir movimentos coerentes,estáveis e visualmente
                naturais, mesmo em ambientes com recursos computacionais limitados, como navegadores modernos.
            </p>

            <p class="text-gray-600 mb-4">
                Este trabalho demonstrou a viabilidade de implementar simulações físicas simplificadas diretamente no navegador, com resultados satisfatórios
                para fins didáticos e acadêmicos. Veja a metodologia e os resultados em detalhes
                <a href="https://github.com/diegomatos321/simplified-physics-animation-web/blob/main/final-paper/main.pdf" class="text-blue-600 hover:underline"
                    >clicando aqui.</a
                >
            </p>
        </div>
    </section>

    <!-- Demos -->
    <section id="demos" class="py-20">
        <div class="container mx-auto px-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-10">Experimentos</h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div class="p-6 rounded-lg shadow hover:shadow-lg transition">
                    <div class="h-24 flex items-center justify-center text-4xl text-blue-600"></div>
                    <h4 class="text-lg font-semibold mb-2">Caos de polígonos</h4>
                    <RouterLink to="/demos/polygon-chaos" class="text-blue-600 hover:underline">Executar</RouterLink>
                </div>
                <div class="p-6 rounded-lg shadow hover:shadow-lg transition">
                    <div class="h-24 flex items-center justify-center text-4xl text-blue-600"></div>
                    <h4 class="text-lg font-semibold mb-2">Gravidade e Empilhamento</h4>
                    <RouterLink to="/demos/gravity-stack" class="text-blue-600 hover:underline">Executar</RouterLink>
                </div>
                <div class="p-6 rounded-lg shadow hover:shadow-lg transition">
                    <div class="h-24 flex items-center justify-center text-4xl text-blue-600"></div>
                    <h4 class="text-lg font-semibold mb-2">Colisões Elásticas/Inelásticas</h4>
                    <RouterLink to="#" class="text-blue-600 hover:underline">Executar</RouterLink>
                </div>
                <div class="p-6 rounded-lg shadow hover:shadow-lg transition">
                    <div class="h-24 flex items-center justify-center text-4xl text-blue-600"></div>
                    <h4 class="text-lg font-semibold mb-2">Tecidos e Treliças</h4>
                    <RouterLink to="/demos/cloth-trelis" class="text-blue-600 hover:underline">Executar</RouterLink>
                </div>
            </div>
        </div>
    </section>
</template>
