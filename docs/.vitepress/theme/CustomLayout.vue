<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import LlmsFooter from './components/LlmsFooter.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-footer-before>
      <LlmsFooter />
    </template>
  </Layout>
</template>
