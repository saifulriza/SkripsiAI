export function validateEnvVariables() {
  const requiredVars = {
    VITE_OPENAI_API_KEY: 'OpenAI API Key',
    VITE_DEEPSEEK_API_KEY: 'DeepSeek API Key',
    VITE_ANTHROPIC_API_KEY: 'Anthropic API Key',
  }

  const missingVars = []
  for (const [key, name] of Object.entries(requiredVars)) {
    if (!import.meta.env[key]) {
      missingVars.push(name)
    }
  }

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`)
    return false
  }

  return true
}
