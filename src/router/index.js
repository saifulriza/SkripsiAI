import { route } from 'quasar/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'src/stores/auth/auth'
import { useThesisStore } from 'src/stores/thesis/thesis'

export default route(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    const thesisStore = useThesisStore()

    try {
      // Wait for auth state to initialize
      await authStore.checkSession()

      // Pages that don't require auth
      if (['/login', '/register', '/'].includes(to.path)) {
        if (authStore.isAuthenticated) {
          // Redirect to dashboard based on role if already logged in
          if (authStore.role === 'student') {
            next('/student')
            return
          } else if (authStore.role === 'lecturer') {
            next('/lecturer')
            return
          }
        }
        next()
        return
      }

      // Check authentication requirement
      if (!authStore.isAuthenticated) {
        next({ path: '/login', query: { redirect: to.fullPath } })
        return
      }

      // Check role requirement
      if (to.meta.role) {
        const hasRole = to.meta.role === authStore.role
        if (!hasRole) {
          next('/')
          return
        }
      }

      // Check thesis status requirements if needed
      if (to.meta.requiresThesis && authStore.role === 'student') {
        const theses = await thesisStore.fetchAllTheses()
        if (theses.length === 0) {
          next({ name: 'home' })
          return
        }

        if (to.meta.thesisStatus) {
          const thesis = theses[0]
          if (!to.meta.thesisStatus.includes(thesis.status)) {
            next({ name: 'student' })
            return
          }
        }
      }

      next()
    } catch (error) {
      console.error('Navigation error:', error)
      next('/login')
    }
  })

  return Router
})
