import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
        },
        {
            path: '/demos',
            name: 'demos',
            children: [
                {
                    path: 'polygon-chaos',
                    name: 'polygon_chaos',
                    component: () => import('../views/examples/2d/PolygonChaos.vue'),
                },
                // {
                //     path: 'gravity-stack',
                //     name: 'gravity_and_stack',
                //     component: () => import('../views/examples/2d/GravityAndStack.vue'),
                // },
                {
                    path: 'cloth-trellis',
                    name: 'cloth_tellis',
                    component: () => import('../views/examples/2d/ClothAndTrellis.vue'),
                },
            ],
        },
    ],
});

export default router;
