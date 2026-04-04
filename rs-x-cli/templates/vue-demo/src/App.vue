<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import VirtualTableShell from './components/VirtualTableShell.vue';

type ThemeMode = 'light' | 'dark';

const theme = ref<ThemeMode>('dark');

onMounted(() => {
  const storedTheme = window.localStorage.getItem('rsx-theme');
  if (storedTheme === 'light' || storedTheme === 'dark') {
    theme.value = storedTheme;
  }
});

watch(
  theme,
  (nextTheme) => {
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.body.setAttribute('data-theme', nextTheme);
    window.localStorage.setItem('rsx-theme', nextTheme);
  },
  { immediate: true },
);

function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}
</script>

<template>
  <main class="app-shell">
    <section class="hero">
      <div class="container">
        <div class="heroGrid">
          <div class="heroLeft">
            <p class="app-eyebrow">RS-X Vue Demo</p>
            <h1 class="hTitle">Virtual Table</h1>
            <p class="hSubhead">
              Million-row scrolling with a fixed RS-X expression pool.
            </p>
            <p class="hSub">
              This demo keeps rendering bounded while streaming pages on demand,
              so scrolling stays smooth without growing expression memory with the
              dataset.
            </p>

            <div class="heroActions">
              <a
                class="btn btnGhost"
                href="https://www.rsxjs.com/"
                target="_blank"
                rel="noreferrer"
              >
                rs-x
              </a>
              <button
                type="button"
                class="btn btnGhost theme-toggle"
                :aria-label="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`"
                @click="toggleTheme"
              >
                {{ theme === 'dark' ? 'Light mode' : 'Dark mode' }}
              </button>
            </div>
          </div>

          <aside class="card heroNote">
            <h2 class="cardTitle">What This Shows</h2>
            <p class="cardText">
              Only a small row-model pool stays alive while pages stream in around
              the viewport. That means one million logical rows without one million
              live bindings.
            </p>
          </aside>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <section class="app-panel card">
          <VirtualTableShell />
        </section>
      </div>
    </section>
  </main>
</template>
