// Ініціалізує Payload одразу при старті сервера: міграції, ролі, перший адміністратор,
// демонстраційні дані та планувальник завдань не чекають першого запиту.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initPayload } = await import('./instrumentation-node')
    await initPayload()
  }
}
