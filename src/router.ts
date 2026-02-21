import {
  createRouter,
  createWebHashHistory,
  type RouteRecordRaw,
} from "vue-router";
import JoinEvent from "./pages/JoinEvent.vue";
import Info from "./pages/Info.vue";
import Rank from "./pages/Rank.vue";
import JoinTeam from "./pages/JoinTeam.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "join",
    component: JoinEvent,
  },
  {
    path: "/info",
    name: "info",
    component: Info,
  },
  {
    path: "/rank",
    name: "rank",
    component: Rank,
  },
  {
    // ปรับให้ Parameter :id เป็น Optional (?) เพื่อให้เข้าหน้า /join เฉยๆ เพื่อสร้างทีมได้
    path: "/join/:id?",
    name: "join-team",
    component: JoinTeam,
  },
  {
    path: "/admin/events",
    name: "admin-events",
    component: () => import("./pages/AdminEvent.vue"),
  },
  {
    path: "/event/:eventId/poster",
    name: "event-poster",
    component: () => import("./pages/PosterGenerate.vue"),
  },
  {
  path: "/nicotine-test",
  component: () => import("./pages/NicotineTest.vue"),
},
{
  path: "/nicotine-history",
  component: () => import("./pages/NicotineHistory.vue"),
},
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
