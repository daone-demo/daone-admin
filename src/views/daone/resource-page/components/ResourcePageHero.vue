<script setup lang="ts">
import type { ResourceConfig } from "../../resourceData";

defineProps<{ config: ResourceConfig }>();
defineEmits<{ create: [] }>();
</script>

<template>
  <section class="page-hero" :style="{ '--accent': config.color }">
    <div class="hero-icon">
      <IconifyIconOnline :icon="config.icon" />
    </div>
    <div class="hero-copy">
      <h1>{{ config.title }}</h1>
      <p>{{ config.description }}</p>
    </div>
    <el-button
      v-if="config.fields.length && config.allowCreate !== false"
      class="create-button"
      type="primary"
      @click="$emit('create')"
    >
      <IconifyIconOnline icon="ri:add-line" />
      {{ config.createText || "新增记录" }}
    </el-button>
  </section>
</template>

<style scoped lang="scss">
.page-hero {
  position: relative;
  display: flex;
  gap: 18px;
  align-items: center;
  min-height: 138px;
  padding: 26px 30px;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 88% 10%,
      color-mix(in srgb, var(--accent) 18%, transparent),
      transparent 34%
    ),
    linear-gradient(135deg, #fff 0%, #fbfaff 100%);
  border: 1px solid #ebeaf2;
  border-radius: 18px;
  box-shadow: 0 10px 36px rgb(34 31 52 / 5%);
}

.hero-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 58px;
  height: 58px;
  font-size: 26px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, white);
  border-radius: 17px;
}

.hero-copy {
  flex: 1;

  h1 {
    margin: 0;
    font-size: 26px;
    line-height: 1.25;
  }

  p {
    margin: 7px 0 0;
    color: #7a7d8b;
  }
}

.create-button {
  height: 42px;
  padding: 0 18px;
  border: 0;
  border-radius: 11px;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 25%, transparent);
}

@media (width <= 760px) {
  .page-hero {
    align-items: flex-start;
    padding: 20px;
  }

  .hero-icon {
    display: none;
  }

  .create-button {
    position: absolute;
    right: 18px;
    bottom: 18px;
  }
}
</style>
