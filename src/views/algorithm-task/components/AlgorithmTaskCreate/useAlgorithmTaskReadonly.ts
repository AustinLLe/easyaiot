import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue';

export const ALGORITHM_TASK_READONLY_KEY: InjectionKey<ComputedRef<boolean>> = Symbol('algorithmTaskReadonly');

export function provideAlgorithmTaskReadonly(readonly: ComputedRef<boolean>) {
  provide(ALGORITHM_TASK_READONLY_KEY, readonly);
}

export function useAlgorithmTaskReadonly() {
  return inject(ALGORITHM_TASK_READONLY_KEY, computed(() => false));
}
