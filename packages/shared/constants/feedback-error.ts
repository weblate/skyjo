export const FeedbackError = {
  FEEDBACK_ERROR: "feedback-error",
} as const
export type FeedbackError = (typeof FeedbackError)[keyof typeof FeedbackError]