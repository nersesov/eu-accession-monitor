// Навантажувальний тест: 100 віртуальних користувачів, головна та сторінка напряму.
//   docker run --rm -i --network container:reform-monitor-app-1 grafana/k6 run - < tests/k6/load.js
import { check, sleep } from 'k6'
import http from 'k6/http'

const BASE = __ENV.BASE_URL || 'http://localhost:3000'

export const options = {
  stages: [
    { duration: '20s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    'http_req_duration{page:home}': ['p(95)<800'],
    'http_req_duration{page:direction}': ['p(95)<800'],
  },
}

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'direction', path: '/glava-23/sudova-reforma' },
  { name: 'home', path: '/en' },
  { name: 'direction', path: '/en/glava-24/mihratsiia-i-kordony?status=in_progress' },
]

export default function () {
  const p = PAGES[Math.floor(Math.random() * PAGES.length)]
  const res = http.get(`${BASE}${p.path}`, { tags: { page: p.name } })
  check(res, { 'status 200': (r) => r.status === 200, 'є дисклеймер': (r) => r.body.includes('demonstration project') || r.body.includes('демонстраційний проєкт') })
  sleep(1)
}
