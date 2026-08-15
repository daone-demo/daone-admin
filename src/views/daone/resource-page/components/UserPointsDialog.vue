<script setup lang="ts">
defineProps<{
  pointsForm: { adjustAmount: number; adjustReason: string };
  currentPoints: number | string;
  adjustingPoints: boolean;
}>();

const visible = defineModel<boolean>("visible", { required: true });
defineEmits<{ confirm: [] }>();
</script>

<template>
  <el-dialog v-model="visible" title="调整用户积分" width="460px">
    <el-alert
      :title="`当前可用积分：${Number(currentPoints || 0).toLocaleString()}`"
      type="info"
      :closable="false"
    />
    <el-form label-position="top" class="points-form">
      <el-form-item label="调整数量（正数增加，负数扣减）">
        <el-input-number
          v-model="pointsForm.adjustAmount"
          :step="100"
          class="w-full"
        />
      </el-form-item>
      <el-form-item label="调整原因">
        <el-input v-model="pointsForm.adjustReason" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="adjustingPoints"
        :disabled="adjustingPoints"
        @click="$emit('confirm')"
      >
        确认调整
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.points-form {
  margin-top: 18px;
}

.w-full {
  width: 100%;
}
</style>
