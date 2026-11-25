<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { init, use, type ECharts, type EChartsCoreOption } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([BarChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  distribution: number[]
  minAge: number
  guess: number
  actualAge: number | null
}>()

const el = ref<HTMLDivElement | null>(null)
let chart: ECharts | null = null
let observer: ResizeObserver | null = null

function buildOption(): EChartsCoreOption {
  const ages = props.distribution.map((_, i) => props.minAge + i)
  const inRange = (age: number | null): age is number => age !== null && ages.includes(age)
  const marks = [
    { xAxis: String(props.guess), label: { formatter: '我的猜测' }, lineStyle: { color: '#526F91' } },
    ...(inRange(props.actualAge) && props.actualAge !== props.guess
      ? [{ xAxis: String(props.actualAge), label: { formatter: '真实年龄' }, lineStyle: { color: '#6A9B79' } }]
      : []),
  ]
  return {
    animationDuration: 600,
    grid: { left: 8, right: 12, top: 30, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const p = (params as { name: string; value: number }[])[0]
        return `${p.name} 岁<br/>可能性 ${(p.value * 100).toFixed(1)}%`
      },
    },
    xAxis: {
      type: 'category',
      data: ages.map(String),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#E8E4DB' } },
      axisLabel: { color: '#888888', interval: 9, formatter: '{value}岁' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#888888', formatter: (v: number) => `${Math.round(v * 100)}%` },
      splitLine: { lineStyle: { color: '#F0ECE4' } },
    },
    series: [
      {
        type: 'bar',
        barCategoryGap: '12%',
        data: props.distribution.map((v, i) => ({
          value: v,
          itemStyle: { color: ages[i] === props.guess ? '#526F91' : '#E7B77A', borderRadius: [3, 3, 0, 0] },
        })),
        markLine: {
          symbol: 'none',
          silent: true,
          lineStyle: { type: 'dashed', width: 1.5 },
          label: { color: '#292929', fontSize: 12 },
          data: marks,
        },
      },
    ],
  }
}

onMounted(() => {
  if (!el.value) return
  chart = init(el.value)
  chart.setOption(buildOption())
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(el.value)
})

watch(
  () => [props.distribution, props.guess, props.actualAge],
  () => chart?.setOption(buildOption(), true),
)

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="el" class="chart" role="img" aria-label="各年龄可能性分布图" />
</template>

<style scoped>
.chart {
  width: 100%;
  height: 220px;
}
</style>
