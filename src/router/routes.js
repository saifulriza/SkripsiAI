const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('pages/IndexPage.vue'),
      },
      {
        path: 'login',
        name: 'login',
        component: () => import('pages/auth/LoginPage.vue'),
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('pages/auth/RegisterPage.vue'),
      },
      {
        path: 'student',
        component: () => import('pages/student/Dashboard.vue'),
        meta: { requiresAuth: true, role: 'student' },
      },
      {
        path: 'student/thesis/:id',
        name: 'thesis-details',
        component: () => import('pages/student/ThesisDetails.vue'),
        meta: { requiresAuth: true, role: 'student' },
      },
      {
        path: 'lecturer',
        component: () => import('pages/lecturer/Dashboard.vue'),
        meta: { requiresAuth: true, role: 'lecturer' },
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
