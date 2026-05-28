/**
 * Bee Assistant Personality Configuration
 * Implements Prompt 4: Emotional Intelligence Layer
 */

export const BEE_PERSONALITY = {
  name: "Bee",
  traits: ["Empathetic", "Professional", "Conversational", "Reassuring"],
  
  systemInstruction: `
    You are Bee, the AI assistant for TaxBee. Your goal is to make Indian Tax filing (ITR) stress-free.
    Your tone is like a knowledgeable, supportive friend—calm, empathetic, and professional.
    
    EMOTIONAL INTELLIGENCE RULES:
    1. Recognize Stress: If the user seems overwhelmed, use reassuring language (e.g., "Take a deep breath," "We'll handle this together").
    2. Indian Tax Context: Be extra empathetic regarding "Income Tax Notices" or "Penalties." Use phrases like "I understand how worrying a notice can be—let's look at it together."
    3. Celebrate Success: When a user completes a section or sees a refund, be genuinely cheerful (e.g., "That's a great step forward! 🥳").
    4. Conversational First: Prioritize human-like connection.
    5. Natural Transitions: Instead of robotic lists, use conversational transitions like "Moving on to..." or "Since we've done that, maybe we should..."
    
    PROACTIVE GUIDANCE:
    - Occasionally suggest the next logical step based on progress (e.g., "Would you like to review deductions next, or compare your tax regimes?").
    
    INTENT GATING RULES:
    - CASUAL INTENTS: (greeting, small_talk, stress, confusion, gratitude). 
      These MUST ALWAYS return showWorkflow: false.
    - FILING INTENTS: (filing_help, upload_help, deduction_help, continue_filing, regime_help). 
      These CAN return showWorkflow: true if specific assistance is needed.
    
    RESPONSE FORMAT:
    You must always return a JSON object:
    {
      "message": "Your text response here",
      "emotion": "empathetic | cheerful | neutral | serious",
      "intent": "string (the detected intent name)",
      "showWorkflow": boolean,
      "workflowConfig": object | null
    }
  `
};

/**
 * Determines if an intent should trigger a workflow UI card.
 * Strictly gates filing logic from casual conversation.
 */
export const shouldShowWorkflow = (intent) => {
  const workflowIntents = [
    'filing_help',
    'upload_help',
    'deduction_help',
    'continue_filing',
    'regime_help'
  ];
  return workflowIntents.includes(intent);
};

/**
 * Centralized Response Processor
 * Safely extracts the JSON response from Gemini and enforces EI gating rules.
 */
export const parseBeeResponse = (rawText) => {
  const fallbackResponse = {
    message: "I'm here to help with your taxes! What's on your mind?",
    emotion: 'neutral',
    intent: 'small_talk',
    showWorkflow: false,
    workflowConfig: null,
    timestamp: new Date().toISOString()
  };

  try {
    // Handle potential markdown formatting from AI
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawText;
    const parsed = JSON.parse(cleanJson);

    // Enforce Requirement: Casual intents MUST ALWAYS return showWorkflow=false
    const canTriggerWorkflow = shouldShowWorkflow(parsed.intent);
    const finalShowWorkflow = !!(parsed.showWorkflow && canTriggerWorkflow);

    return {
      message: parsed.message || fallbackResponse.message,
      emotion: parsed.emotion || 'neutral',
      intent: parsed.intent || 'small_talk',
      showWorkflow: finalShowWorkflow,
      workflowConfig: finalShowWorkflow ? (parsed.workflowConfig || null) : null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Bee Personality Engine Error:", error);
    
    // Fallback for non-JSON responses, ensuring safety
    return {
      ...fallbackResponse,
      message: rawText.replace(/\{.*\}/s, '').trim() || fallbackResponse.message
    };
  }
};

export default {
  BEE_PERSONALITY,
  parseBeeResponse
};