<script lang="ts" setup>
import { computed, reactive, ref, unref } from 'vue'
import { Checkbox, Form, Input } from 'ant-design-vue'
import LoginFormTitle from './LoginFormTitle.vue'
import { LoginStateEnum, useFormRules, useFormValid, useLoginState } from './useLogin'
import { StrengthMeter } from '@/components/StrengthMeter'
import { CountdownInput } from '@/components/CountDown'
import { useI18n } from '@/hooks/web/useI18n'

const FormItem = Form.Item
const InputPassword = Input.Password
const { t } = useI18n()
const { handleBackLogin, getLoginState } = useLoginState()

const formRef = ref()
const loading = ref(false)

const formData = reactive({
  account: '',
  password: '',
  confirmPassword: '',
  mobile: '',
  sms: '',
  policy: false,
})

const { getFormRules } = useFormRules(formData)
const { validForm } = useFormValid(formRef)

const getShow = computed(() => unref(getLoginState) === LoginStateEnum.REGISTER)

async function handleRegister() {
  const data = await validForm()
  if (!data)
    // eslint-disable-next-line no-useless-return
    return
}
</script>

<template>
  <div v-if="getShow">
    <LoginFormTitle class="enter-x" />
    <Form ref="formRef" class="enter-x p-4" :model="formData" :rules="getFormRules">
      <FormItem name="account" class="enter-x">
        <label for="register-account" class="sr-only">{{ t('sys.login.userName') }}</label>
        <Input id="register-account" v-model:value="formData.account" class="fix-auto-fill" size="large" :placeholder="t('sys.login.userName')" />
      </FormItem>
      <FormItem name="mobile" class="enter-x">
        <label for="register-mobile" class="sr-only">{{ t('sys.login.mobile') }}</label>
        <Input id="register-mobile" v-model:value="formData.mobile" size="large" :placeholder="t('sys.login.mobile')" class="fix-auto-fill" />
      </FormItem>
      <FormItem name="sms" class="enter-x">
        <CountdownInput v-model:value="formData.sms" size="large" class="fix-auto-fill" :placeholder="t('sys.login.smsCode')" />
      </FormItem>
      <FormItem name="password" class="enter-x">
        <StrengthMeter v-model:value="formData.password" size="large" :placeholder="t('sys.login.password')" />
      </FormItem>
      <FormItem name="confirmPassword" class="enter-x">
        <label for="register-confirm-password" class="sr-only">{{ t('sys.login.confirmPassword') }}</label>
        <InputPassword
          id="register-confirm-password"
          v-model:value="formData.confirmPassword"
          size="large"
          visibility-toggle
          :placeholder="t('sys.login.confirmPassword')"
        />
      </FormItem>

      <FormItem class="enter-x" name="policy">
        <!-- No logic, you need to deal with it yourself -->
        <Checkbox v-model:checked="formData.policy" size="small">
          {{ t('sys.login.policy') }}
        </Checkbox>
      </FormItem>

      <a-button type="primary" html-type="button" class="enter-x" size="large" block :loading="loading" @click="handleRegister">
        {{ t('sys.login.registerButton') }}
      </a-button>
      <a-button html-type="button" size="large" block class="enter-x mt-4" @click="handleBackLogin">
        {{ t('sys.login.backSignIn') }}
      </a-button>
    </Form>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
