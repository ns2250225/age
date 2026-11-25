import { createRouter, createWebHashHistory } from 'vue-router'
import { useGameStore } from './stores/game'
import Home from './views/Home.vue'

// hash 路由：纯静态部署时无需服务器重写规则
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/rules', name: 'rules', component: () => import('./views/Rules.vue') },
    { path: '/game', name: 'game', component: () => import('./views/Game.vue') },
    { path: '/guess', name: 'guess', component: () => import('./views/Guess.vue') },
    { path: '/result', name: 'result', component: () => import('./views/Result.vue') },
    { path: '/admin', name: 'admin', component: () => import('./views/Admin.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

/** 对局阶段对应的页面 */
export function routeForPhase(phase: string): string {
  if (phase === 'playing') return '/game'
  if (phase === 'guessing' || phase === 'feedback') return '/guess'
  if (phase === 'result') return '/result'
  return '/'
}

// 对局页面只能在对应阶段进入，防止通过后退/改地址重复答题或重复猜测
router.beforeEach((to) => {
  if (to.name !== 'game' && to.name !== 'guess' && to.name !== 'result') return true
  const store = useGameStore()
  const expected = routeForPhase(store.phase)
  return to.path === expected ? true : expected
})
