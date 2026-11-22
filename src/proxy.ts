import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Next.js 16: proxy.ts (раніше middleware.ts) — маршрутизація мов next-intl
export default createMiddleware(routing)

export const config = {
  // Усе, крім API, адмінки, службових шляхів Next.js і файлів із розширенням
  matcher: ['/((?!api(?:/|$)|admin(?:/|$)|media/|_next|_vercel|.*\\..*).*)'],
}
