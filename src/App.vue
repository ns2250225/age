<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from './stores/game'

const store = useGameStore()
onMounted(() => store.ensureLoaded())
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
