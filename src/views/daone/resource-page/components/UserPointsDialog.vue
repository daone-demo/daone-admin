<script setup lang="ts">
defineProps<{
  pointsForm: { adjustAmount: number; adjustReason: string };
  currentPoints: number | string;
  adjustingPoints: boolean;
}>();

const visible = defineModel<boolean>("visible", { required: true });
// 表单值通过 update:* 事件回传父级统一写入，子组件不直接修改 prop
defineEmits<{
  confirm: [];
  "update:adjust-amount": [value: number | undefined];
  "update:adjust-reason": [value: string];
}>();
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
          :model-value="pointsForm.adjustAmount"
          :step="100"
          class="w-full"
          @update:model-value="$emit('update:adjust-amount', $event)"
        />
      </el-form-item>
      <el-form-item label="调整原因">
        <el-input
          :model-value="pointsForm.adjustReason"
          type="textarea"
          :rows="3"
          @update:model-value="$emit('update:adjust-reason', $event)"
        />
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
