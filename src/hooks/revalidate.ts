import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

export const CONTENT_TAG = 'content'

/** Скидає кеш публічних сторінок. Поза Next.js (CLI-скрипти) тихо нічого не робить. */
async function bust() {
  try {
    const { revalidateTag } = await import('next/cache')
    // expire: 0 — кеш скидається негайно, без показу застарілих даних
    revalidateTag(CONTENT_TAG, { expire: 0 })
  } catch {
    /* немає контексту Next.js */
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = async ({ doc }) => {
  await bust()
  return doc
}
export const revalidateAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  await bust()
  return doc
}
export const revalidateHooks = { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] }
