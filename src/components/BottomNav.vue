<template>
  <nav
    class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-end px-1 pt-2 pb-safe z-40 shadow-sm overflow-x-auto"
  >
    <!-- JOIN -->
    <RouterLink
      to="/"
      class="flex flex-col items-center justify-center py-2 min-w-[70px] transition-all duration-200 nav-link relative"
      active-class="active-nav"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <span class="text-[11px] font-semibold mt-1 uppercase">Join</span>
    </RouterLink>

    <!-- INFO -->
    <RouterLink
      to="/info"
      class="flex flex-col items-center justify-center py-2 min-w-[70px] transition-all duration-200 nav-link relative"
      active-class="active-nav"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <span class="text-[11px] font-semibold mt-1 uppercase">Info</span>
    </RouterLink>

    <!-- RANK -->
    <RouterLink
      to="/rank"
      class="flex flex-col items-center justify-center py-2 min-w-[70px] transition-all duration-200 nav-link relative"
      active-class="active-nav"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
      <span class="text-[11px] font-semibold mt-1 uppercase">Rank</span>
    </RouterLink>

    <!-- PARTY -->
    <RouterLink
      to="/join"
      class="flex flex-col items-center justify-center py-2 min-w-[70px] transition-all duration-200 nav-link relative"
      active-class="active-nav"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <span class="text-[11px] font-semibold mt-1 uppercase">Party</span>
    </RouterLink>

    <!-- ADMIN EVENTS -->
    <RouterLink
      to="/admin/events"
      class="flex flex-col items-center justify-center py-2 min-w-[70px] transition-all duration-200 nav-link relative"
      active-class="active-nav"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
        viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
      </svg>
      <span class="text-[11px] font-semibold mt-1 uppercase">Admin</span>
    </RouterLink>

    <!-- NICOTINE TEST -->
    <RouterLink
      to="/nicotine-test"
      class="flex flex-col items-center justify-center py-2 min-w-[70px] transition-all duration-200 nav-link relative"
      active-class="active-nav"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
        viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 12h16"/>
        <path d="M16 8l4 4-4 4"/>
      </svg>
      <span class="text-[11px] font-semibold mt-1 uppercase">Test</span>
    </RouterLink>

    <!-- NICOTINE HISTORY -->
    <RouterLink
      to="/nicotine-history"
      class="flex flex-col items-center justify-center py-2 min-w-[70px] transition-all duration-200 nav-link relative"
      active-class="active-nav"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
        viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <span class="text-[11px] font-semibold mt-1 uppercase">History</span>
    </RouterLink>

  </nav>
</template>

<style scoped>
.nav-link {
  color: #6b7280;
  opacity: 0.85;
}

.active-nav {
  color: #111827;
  opacity: 1;
}

.active-nav::after {
  content: "";
  position: absolute;
  bottom: 0;
  width: 36%;
  height: 3px;
  background: #111827;
  border-radius: 999px;
}

.nav-link:active {
  transform: scale(0.96);
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>