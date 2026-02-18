import { createRouter, createWebHistory } from 'vue-router'
import JoinEvent from './pages/JoinEvent.vue'
import Info from './pages/Info.vue'
import Rank from './pages/Rank.vue'
import CreateParty from './pages/CreateParty.vue'

const routes = [
  {
    path: '/',
    name: 'join',
    component: JoinEvent
  },
  {
    path: '/info',
    name: 'info',
    component: Info
  },
  {
    path: '/rank',
    name: 'rank',
    component: Rank
  },
  {
    path: '/create-party',
    name: 'party',
    component: CreateParty
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
