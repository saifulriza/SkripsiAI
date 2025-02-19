import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from 'src/boot/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const role = ref(null)
  const isSessionLoaded = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isStudent = computed(() => role.value === 'student')
  const isLecturer = computed(() => role.value === 'lecturer')

  async function getOrCreateProfile(userId, email, userRole = null) {
    try {
      // First try to get existing profile using single()
      let { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // Use maybeSingle() to handle no rows case

      // If profile exists, return it
      if (profile) {
        console.log('Found existing profile:', profile)
        return profile
      }

      if (selectError) {
        console.error('Profile select error:', selectError)
        throw selectError
      }

      // If no profile exists, create one
      console.log('Creating new profile with role:', userRole)

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            email: email,
            role: userRole || 'student',
            full_name: email.split('@')[0], // Temporary name from email
          },
        ])
        .select('*')
        .single()

      if (insertError) {
        console.error('Profile insert error:', insertError)
        throw insertError
      }

      console.log('Created new profile:', newProfile)
      return newProfile
    } catch (error) {
      console.error('Profile error:', error)
      throw error
    }
  }

  async function register(email, password, userRole) {
    try {
      if (!userRole || !['student', 'lecturer'].includes(userRole)) {
        throw new Error('Invalid role specified')
      }

      console.log('Starting registration with role:', userRole)

      // Check if email is already registered
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (existingProfile) {
        throw new Error('Email already registered')
      }

      // Attempt signup with role in metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: userRole,
          },
        },
      })

      if (error) {
        console.error('Signup error:', error)
        throw error
      }

      if (!data.user) {
        throw new Error('No user data returned from signup')
      }

      console.log('User created successfully:', data.user)

      // Create profile immediately after signup
      const profile = await getOrCreateProfile(data.user.id, email, userRole)

      // Set state after successful registration
      user.value = data.user
      role.value = profile.role
      isSessionLoaded.value = true

      console.log('Registration complete with role:', profile.role)

      return { user: data.user, role: profile.role }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  async function login(email, password) {
    try {
      console.log('Attempting login for:', email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)
        throw error
      }

      // Get profile using maybeSingle()
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        throw profileError
      }

      if (!profile) {
        throw new Error('Profile not found')
      }

      // Set state after all data is fetched
      user.value = data.user
      role.value = profile.role
      isSessionLoaded.value = true

      console.log('Login successful with role:', profile.role)

      return { user: data.user, role: profile.role }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  async function checkSession() {
    if (isSessionLoaded.value && user.value) {
      return { user: user.value, role: role.value }
    }

    try {
      console.log('Checking session...')

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw sessionError
      }

      console.log('Session data:', session)

      if (session?.user) {
        // Get profile using single()
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          throw profileError
        }

        console.log('Retrieved profile for session:', profile)

        user.value = session.user
        role.value = profile.role
      } else {
        user.value = null
        role.value = null
      }

      isSessionLoaded.value = true
      return { user: user.value, role: role.value }
    } catch (error) {
      console.error('Session check error:', error)
      isSessionLoaded.value = true
      user.value = null
      role.value = null
      return { user: null, role: null }
    }
  }

  async function logout() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      user.value = null
      role.value = null
      isSessionLoaded.value = false
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  return {
    user,
    role,
    isAuthenticated,
    isStudent,
    isLecturer,
    isSessionLoaded,
    login,
    register,
    logout,
    checkSession,
  }
})
