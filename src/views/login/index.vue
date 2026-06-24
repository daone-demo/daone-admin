<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { getTopMenu, initRouter } from "@/router/utils";
import { adminApi } from "@/api/admin";
import { setToken } from "@/utils/auth";

defineOptions({ name: "Login" });

const router = useRouter();
const formRef = ref<FormInstance>();
const loading = ref(false);
const sending = ref(false);
const countdown = ref(0);
const accepted = ref(true);
const form = reactive({ phone: "18958012675", code: "123456" });
const rules: FormRules = {
  phone: [
    { required: true, message: "请输入手机号", trigger: "blur" },
    { pattern: /^1\d{10}$/, message: "请输入正确的手机号", trigger: "blur" }
  ],
  code: [{ required: true, message: "请输入验证码", trigger: "blur" }]
};

const sendCode = async () => {
  await formRef.value?.validateField("phone");
  sending.value = true;
  try {
    await adminApi.sendSmsCode(form.phone);
    ElMessage.success("验证码已发送");
    countdown.value = 60;
    const timer = window.setInterval(() => {
      countdown.value -= 1;
      if (countdown.value <= 0) window.clearInterval(timer);
    }, 1000);
  } catch (error: any) {
    if (error?.status === 403) {
      ElMessage.error("当前手机号没有后台登录权限，请联系系统管理员授权");
    } else {
      ElMessage.error(error?.message || "验证码发送失败，请稍后重试");
    }
  } finally {
    sending.value = false;
  }
};

const login = async () => {
  if (!accepted.value) {
    ElMessage.warning("请先同意服务协议与隐私政策");
    return;
  }
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    const data = await adminApi.smsLogin(form.phone, form.code);

    // 短信登录只证明用户身份；后台接口还要求服务端管理员权限。
    await adminApi.verifyAdminAccess(data.token);

    setToken({
      accessToken: data.token,
      refreshToken: "",
      expires: new Date(Date.now() + data.expiresInSeconds * 1000),
      avatar: data.user.avatarUrl || "",
      username: form.phone,
      nickname: data.user.nickname,
      roles: ["admin"],
      permissions: ["*:*:*"]
    });
    await initRouter();
    await router.push(getTopMenu(true).path);
    ElMessage.success("欢迎进入 Daone 运营后台");
  } catch (error: any) {
    if (error?.status === 403) {
      ElMessage.error("当前手机号没有后台管理员权限，请联系系统管理员授权");
    } else {
      ElMessage.error(error?.message || "登录失败，请稍后重试");
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <div class="brand-panel">
      <div class="brand">
        <span class="brand-mark">D</span>
        <b>DAONE</b>
      </div>
      <div class="brand-content">
        <span class="eyebrow">CREATE · OPERATE · GROW</span>
        <h1>让每一次创作<br />都有清晰的运营回响</h1>
        <p>一站式管理用户、内容、AI 模型与商业增长。</p>
        <div class="feature-list">
          <span
            ><IconifyIconOnline icon="ri:check-line" /> 创作业务全链路管理</span
          >
          <span
            ><IconifyIconOnline icon="ri:check-line" />
            实时洞察用户与订单趋势</span
          >
          <span
            ><IconifyIconOnline icon="ri:check-line" />
            灵活配置套餐和模型积分</span
          >
        </div>
      </div>
      <div class="brand-footer">© 2026 Daone. All rights reserved.</div>
    </div>
    <div class="form-panel">
      <div class="login-box">
        <div class="mobile-brand">
          <span class="brand-mark">D</span><b>DAONE</b>
        </div>
        <span class="welcome-label">WELCOME BACK</span>
        <h2>登录运营后台</h2>
        <p class="hint">使用管理员手机号验证身份</p>
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          size="large"
        >
          <el-form-item label="手机号" prop="phone">
            <el-input
              v-model="form.phone"
              maxlength="11"
              placeholder="请输入手机号"
            >
              <template #prefix
                ><IconifyIconOnline icon="ri:smartphone-line"
              /></template>
            </el-input>
          </el-form-item>
          <el-form-item label="验证码" prop="code">
            <el-input
              v-model="form.code"
              maxlength="6"
              placeholder="请输入 6 位验证码"
              @keyup.enter="login"
            >
              <template #prefix
                ><IconifyIconOnline icon="ri:shield-keyhole-line"
              /></template>
              <template #suffix>
                <el-button
                  link
                  type="primary"
                  :loading="sending"
                  :disabled="countdown > 0"
                  @click="sendCode"
                >
                  {{ countdown > 0 ? `${countdown}s 后重发` : "获取验证码" }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          <label class="agreement">
            <el-checkbox v-model="accepted" />
            <span>我已阅读并同意 <a>服务协议</a> 与 <a>隐私政策</a></span>
          </label>
          <el-button
            class="login-button"
            type="primary"
            :loading="loading"
            @click="login"
          >
            登录
            <IconifyIconOnline icon="ri:arrow-right-line" />
          </el-button>
        </el-form>
        <div class="secure-tip">
          <IconifyIconOnline icon="ri:lock-2-line" /> 企业级安全防护 ·
          登录信息加密传输
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  display: grid;
  grid-template-columns: 46% 54%;
  min-height: 100vh;
  color: #23242c;
  background: #fff;
}

.brand-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 42px 56px;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 80% 15%, rgb(255 255 255 / 15%), transparent 28%),
    linear-gradient(145deg, #5847c7 0%, #7462e3 55%, #907ff0 100%);
}

.brand-panel::after {
  position: absolute;
  right: -120px;
  bottom: -180px;
  width: 480px;
  height: 480px;
  content: "";
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 50%;
  box-shadow:
    0 0 0 80px rgb(255 255 255 / 3%),
    0 0 0 160px rgb(255 255 255 / 2%);
}

.brand {
  display: flex;
  gap: 11px;
  align-items: center;
  font-size: 18px;
  letter-spacing: 0.18em;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  font-weight: 900;
  color: #6c5ce7;
  background: #fff;
  border-radius: 11px;
}

.brand-content {
  position: relative;
  z-index: 1;
  margin: auto 0;
}

.eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.24em;
  opacity: 0.7;
}

.brand-content h1 {
  margin: 20px 0;
  font-size: clamp(34px, 3.5vw, 54px);
  line-height: 1.25;
  letter-spacing: -0.04em;
}

.brand-content > p {
  font-size: 16px;
  opacity: 0.72;
}

.feature-list {
  display: grid;
  gap: 13px;
  margin-top: 38px;
}

.feature-list span {
  display: flex;
  gap: 10px;
  align-items: center;
}

.feature-list svg {
  padding: 3px;
  color: #6c5ce7;
  background: #fff;
  border-radius: 50%;
}

.brand-footer {
  position: relative;
  z-index: 1;
  font-size: 12px;
  opacity: 0.55;
}

.form-panel {
  display: grid;
  place-items: center;
  padding: 42px;
}

.login-box {
  width: min(410px, 100%);
}

.mobile-brand {
  display: none;
}

.welcome-label {
  font-size: 10px;
  font-weight: 800;
  color: #6c5ce7;
  letter-spacing: 0.2em;
}

.login-box h2 {
  margin: 10px 0 5px;
  font-size: 30px;
}

.hint {
  margin: 0 0 34px;
  color: #92949d;
}

.login-box :deep(.el-form-item__label) {
  font-weight: 600;
  color: #454650;
}

.login-box :deep(.el-input__wrapper) {
  min-height: 48px;
  border-radius: 11px;
  box-shadow: 0 0 0 1px #dedde5 inset;
}

.agreement {
  display: flex;
  gap: 7px;
  align-items: center;
  margin-top: -3px;
  font-size: 12px;
  color: #898b94;
}

.agreement a {
  color: #6c5ce7;
  cursor: pointer;
}

.login-button {
  width: 100%;
  height: 49px;
  margin-top: 25px;
  font-weight: 700;
  background: linear-gradient(90deg, #6150d0, #7b69e7);
  border: 0;
  border-radius: 11px;
  box-shadow: 0 10px 24px rgb(97 80 208 / 24%);
}

.login-button svg {
  margin-left: 7px;
}

.secure-tip {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  font-size: 11px;
  color: #adaeb5;
}

@media (width <= 860px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    display: none;
  }

  .form-panel {
    padding: 24px;
  }

  .mobile-brand {
    display: flex;
    gap: 9px;
    align-items: center;
    margin-bottom: 48px;
    color: #272832;
    letter-spacing: 0.14em;
  }

  .mobile-brand .brand-mark {
    color: #fff;
    background: #6c5ce7;
  }
}
</style>
