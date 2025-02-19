// This is just an example,
// so you can safely delete all default props below

export default {
  failed: 'Action failed',
  success: 'Action successful',
  loading: 'Loading...',
  app: {
    title: 'Thesis Management System',
  },
  nav: {
    title: 'Navigation',
    myThesis: 'My Theses',
    reviewTheses: 'Review Theses',
  },
  auth: {
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    fullName: 'Full Name',
    role: 'Role',
    student: 'Student',
    lecturer: 'Lecturer',
    loginSuccess: 'Login successful',
    registerSuccess: 'Registration successful',
    logoutSuccess: 'Logged out successfully',
    logoutError: 'Logout failed: {error}',
  },
  thesis: {
    title: 'Thesis Title',
    newThesis: 'Create New Thesis',
    createThesis: 'Create Thesis',
    myTheses: 'My Theses',
    actions: {
      open: 'Open Thesis',
      create: 'Create Thesis',
    },
    status: {
      draft: 'Draft',
      submitted: 'Submitted',
      reviewed: 'Reviewed',
      approved: 'Approved',
    },
    chapter: 'Chapter',
    chapters: {
      1: 'Chapter 1 - Introduction',
      2: 'Chapter 2 - Literature Review',
      3: 'Chapter 3 - Methodology',
      4: 'Chapter 4 - Results and Discussion',
      5: 'Chapter 5 - Conclusion',
    },
    content: 'Content',
    save: 'Save',
    analyze: 'Analyze with AI',
    submit: 'Submit for Review',
    feedback: {
      title: 'AI Feedback',
      noHistory: 'No feedback history yet',
      inWriteTab: 'in the Write tab to get AI feedback',
      latestFirst: 'Latest feedback first',
    },
    tabs: {
      write: 'Write',
      history: 'AI Feedback History',
    },
    warnings: {
      incomplete: 'Please complete all chapters before submitting for review.',
    },
    ai: {
      analyzing: 'Analyzing...',
      generating: 'Generating content...',
      generatingHint:
        'Please wait while the AI generates content. Content will be generated in parts to ensure quality and depth.',
      generatingIteration: 'Generating part {n}...',
      generateSuggestions: 'Generate Suggestions',
      suggestions: 'AI Suggestions',
      success: 'AI suggestions generated and saved successfully',
      write: 'AI Writing Assistant',
      contentType: 'Content Type',
      instructions: 'Writing Instructions',
      instructionsHint: 'Provide specific instructions for the section you want to write',
      contextNote: 'Content will be tailored to your research title and context',
      contentGenerated: 'Content successfully generated',
      contentContinued: 'Additional content successfully generated',
      selectTypeAndPrompt: 'Please select a content type and provide instructions',
      wordCount: {
        current: 'Words in this section: {n}',
        total: 'Total words: {n}',
        progress: 'Section {current} | Total {total} words',
      },
      error: {
        analysis: 'Failed to analyze content',
        suggestions: 'Failed to generate suggestions',
        selectChapter: 'Please select a chapter first',
        noContent: 'Please enter some content first',
        generation: 'Failed to generate content',
        continuation: 'Failed to continue content generation',
        save: 'Failed to save content',
        apiKey: 'Invalid API key. Please check your OpenAI API key configuration',
        invalidChapter: 'Invalid chapter selected',
      },
      continueGeneration: {
        title: 'Continue Writing',
        message: 'Would you like to continue generating content for this section?',
        continue: 'Continue',
        stop: 'Stop here',
        confirmMessage: 'Continue to iterate?',
        iterationProgress: 'Iteration {n}',
      },
      pagination: {
        continue: 'Continue to next part',
        stop: 'Finish here',
        progress: 'Part {current} of {total}',
      },
      iteration: {
        current: 'Currently writing part {n}',
        next: 'Proceeding to part {n}',
        complete: 'Writing complete',
      },
      prompts: {
        introduction: `This chapter should include:
- Background of the problem
- Problem formulation
- Research objectives
- Research benefits
- Scope and limitations`,
        literature: `This chapter should include:
- Relevant previous research
- Supporting theories
- Theoretical framework
- Research hypotheses (if any)`,
        methodology: `This chapter should include:
- Research type
- Population and sample
- Data collection techniques
- Data analysis methods`,
        results: `This chapter should include:
- Data collection results
- Data analysis
- Results interpretation
- Discussion of findings`,
        conclusion: `This chapter should include:
- Research conclusions
- Suggestions for future research
- Research implications`,
      },
    },
  },
  common: {
    cancel: 'Cancel',
    save: 'Save',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    loading: 'Loading...',
    required: 'Required',
  },
}
