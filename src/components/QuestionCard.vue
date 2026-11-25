<script setup lang="ts">
import { computed } from 'vue'
import { UNKNOWN_OPTION_ID, type Question, type QuestionType } from '@/types/question'
import AnswerOption from './AnswerOption.vue'

const props = defineProps<{
  question: Question
  picked: string | null
}>()
defineEmits<{ choose: [optionId: string] }>()

const TYPE_LABEL: Record<QuestionType, string> = {
  recognition: '你认识它吗',
  experience: '年代回忆',
  culture: '流行文化',
  school: '校园记忆',
  internet: '互联网记忆',
  knowledge: '小知识',
}

const options = computed(() => props.question.options.filter((o) => o.id !== UNKNOWN_OPTION_ID))
const unknown = computed(() => props.question.options.find((o) => o.id === UNKNOWN_OPTION_ID))
const imageUrl = computed(() => (props.question.image ? import.meta.env.BASE_URL + props.question.image : ''))
</script>

<template>
  <div class="qcard">
    <div class="qcard__body card">
      <div class="qcard__meta">
        <span class="chip">{{ question.category }}</span>
        <span class="chip chip--soft">{{ TYPE_LABEL[question.type] }}</span>
      </div>

      <figure v-if="imageUrl" class="qcard__figure">
        <img :src="imageUrl" :alt="question.thing ?? '题目配图'" width="200" height="140" />
      </figure>
      <div v-else-if="question.emoji" class="qcard__emoji" aria-hidden="true">{{ question.emoji }}</div>

      <h2 class="qcard__title">{{ question.question }}</h2>
    </div>

    <div class="qcard__options">
      <AnswerOption
        v-for="(opt, i) in options"
        :key="opt.id"
        :text="opt.text"
        :index="i"
        :selected="picked === opt.id"
        :disabled="picked !== null"
        @choose="$emit('choose', opt.id)"
      />
    </div>

    <div class="qcard__footer">
      <button
        v-if="unknown"
        type="button"
        class="unknown"
        :class="{ 'unknown--selected': picked === unknown.id }"
        :disabled="picked !== null"
        @click="$emit('choose', unknown.id)"
      >
        {{ unknown.text }}
      </button>
      <p class="muted qcard__hint">凭第一反应选就好，没有对错，也不限时间。</p>
    </div>
  </div>
</template>

<style scoped>
.qcard {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.qcard__body {
  text-align: center;
  padding: 20px 20px 24px;
}

.qcard__meta {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 14px;
}

.chip {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
}

.chip--soft {
  background: var(--accent-soft);
  color: #9a6a2c;
}

.qcard__figure {
  margin: 0 auto 14px;
  width: min(240px, 70%);
}

.qcard__figure img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
}

.qcard__emoji {
  width: 88px;
  height: 88px;
  margin: 0 auto 14px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 46px;
  line-height: 1;
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 2px rgba(231, 183, 122, 0.45);
  transform: rotate(-3deg);
}

.qcard__title {
  font-family: var(--font-serif);
  font-size: 21px;
  line-height: 1.5;
  font-weight: 700;
  text-wrap: pretty;
}

.qcard__options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qcard__footer {
  text-align: center;
  margin-top: 4px;
}

.unknown {
  min-height: 46px;
  padding: 0 22px;
  border-radius: 999px;
  color: var(--text-2);
  font-size: 15px;
  box-shadow: inset 0 0 0 1.5px var(--line);
  background: transparent;
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.unknown:hover:not(:disabled) {
  color: var(--text);
  background: var(--card);
}

.unknown--selected {
  background: var(--line);
  color: var(--text);
  opacity: 1 !important;
}

.qcard__hint {
  margin-top: 10px;
  font-size: 13px;
}

@media (min-width: 768px) {
  .qcard__title {
    font-size: 24px;
  }
}
</style>
