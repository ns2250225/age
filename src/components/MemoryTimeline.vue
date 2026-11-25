<script setup lang="ts">
import { computed } from 'vue'
import type { Stratum } from '@/types/result'

const props = defineProps<{ strata: Stratum[] }>()

const maxStrength = computed(() => Math.max(1, ...props.strata.map((s) => s.strength)))
const LEVEL_LABEL: Record<number, string> = { 3: '亲身经历', 2: '有过接触', 1: '只是听说' }
</script>

<template>
  <div v-if="strata.length" class="timeline">
    <div v-for="s in strata" :key="s.decade" class="layer">
      <div class="layer__axis" aria-hidden="true">
        <span class="layer__dot" :style="{ opacity: 0.35 + 0.65 * (s.strength / maxStrength) }" />
      </div>
      <div class="layer__body">
        <div class="layer__head">
          <strong class="layer__decade">{{ s.decade }} 年代</strong>
          <span class="layer__phase">{{ s.phase }}</span>
        </div>
        <div class="layer__bar" aria-hidden="true">
          <span :style="{ width: `${Math.max(8, (s.strength / maxStrength) * 100)}%` }" />
        </div>
        <ul class="layer__items">
          <li
            v-for="item in s.items.slice(0, 6)"
            :key="item.thing"
            class="tag"
            :class="`tag--l${item.level}`"
            :title="LEVEL_LABEL[item.level]"
          >
            {{ item.thing }}
            <span v-if="item.level === 1" class="tag__note">听说</span>
          </li>
        </ul>
      </div>
    </div>
    <p class="muted legend">
      <span class="tag tag--l3">亲身经历</span>
      <span class="tag tag--l2">有过接触</span>
      <span class="tag tag--l1">只是听说</span>
    </p>
  </div>
  <p v-else class="muted">这次你有印象的事物太少，暂时堆不出记忆的地层。</p>
</template>

<style scoped>
.timeline {
  position: relative;
}

.layer {
  display: flex;
  gap: 12px;
}

.layer__axis {
  position: relative;
  flex: none;
  width: 16px;
  display: flex;
  justify-content: center;
}

.layer__axis::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--line);
}

.layer__dot {
  position: relative;
  margin-top: 6px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 3px var(--card);
}

.layer__body {
  flex: 1;
  min-width: 0;
  padding-bottom: 18px;
}

.layer__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.layer__decade {
  font-family: var(--font-serif);
  font-size: 17px;
}

.layer__phase {
  font-size: 13px;
  color: var(--text-2);
}

.layer__bar {
  height: 6px;
  margin: 6px 0 8px;
  border-radius: 999px;
  background: var(--primary-soft);
  overflow: hidden;
}

.layer__bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--primary));
}

.layer__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 13px;
  line-height: 1.5;
  max-width: 100%;
}

.tag--l3 {
  background: var(--primary);
  color: #fff;
}

.tag--l2 {
  background: var(--primary-soft);
  color: var(--primary-dark);
}

.tag--l1 {
  background: transparent;
  color: var(--text-2);
  box-shadow: inset 0 0 0 1px var(--line);
}

.tag__note {
  font-size: 11px;
  opacity: 0.8;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}
</style>
