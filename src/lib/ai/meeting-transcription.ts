/**
 * Meeting Assistant AI features
 * Transcribe meetings and extract actionable tasks
 */

export interface MeetingTranscript {
  id: string;
  meetingTitle: string;
  transcript: string;
  participants: string[];
  duration: number; // in seconds
  timestamp: string;
  keyTopics: string[];
  actionItems: MeetingActionItem[];
}

export interface MeetingActionItem {
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  context: string;
}

export interface TranscriptionResult {
  transcript: string;
  speakers: Array<{
    start: number;
    end: number;
    speaker: string;
    text: string;
  }>;
}

// Extract action items from meeting transcript
export async function extractActionItems(
  transcript: string,
  meetingTitle: string
): Promise<MeetingActionItem[]> {
  // This would typically call an AI service
  // For now, we use keyword-based extraction as fallback

  const actionVerbs = [
    'need to',
    'should',
    'must',
    'have to',
    "let's",
    "let's",
    'remember to',
    "don't forget to",
    'please',
    'could you',
    'will you',
    'would you',
    'please',
    'assign',
  ];

  const actionItems: MeetingActionItem[] = [];

  // Split into sentences
  const sentences = transcript
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 10);

  for (const sentence of sentences) {
    const isActionItem = actionVerbs.some(verb =>
      sentence.toLowerCase().includes(verb)
    );

    if (isActionItem) {
      // Clean up the sentence
      const description = sentence
        .trim()
        .replace(
          /^(need to|should|must|have to|let's|please|could you|will you|would you)/i,
          ''
        )
        .replace(/^assign\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Try to extract due dates
      let dueDate: string | undefined;
      const today = new Date();

      if (sentence.toLowerCase().includes('today')) {
        dueDate = today.toISOString().split('T')[0];
      } else if (sentence.toLowerCase().includes('tomorrow')) {
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        dueDate = tomorrow.toISOString().split('T')[0];
      } else if (
        sentence.match(/next\s+(monday|tuesday|wednesday|thursday|friday)/i)
      ) {
        const dayMatch = sentence.match(
          /next\s+(monday|tuesday|wednesday|thursday|friday)/i
        );
        if (dayMatch) {
          const dayNames = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ];
          const targetDay = dayNames.findIndex(
            d => d === dayMatch[1].toLowerCase()
          );
          const daysUntil = (targetDay - today.getDay() + 7) % 7 || 7;
          const nextDate = new Date(
            today.getTime() + daysUntil * 24 * 60 * 60 * 1000
          );
          dueDate = nextDate.toISOString().split('T')[0];
        }
      }

      // Determine priority
      let priority: 'high' | 'medium' | 'low' = 'medium';
      if (
        sentence.toLowerCase().includes('urgent') ||
        sentence.toLowerCase().includes('asap')
      ) {
        priority = 'high';
      } else if (
        sentence.toLowerCase().includes('later') ||
        sentence.toLowerCase().includes('someday')
      ) {
        priority = 'low';
      }

      actionItems.push({
        description,
        dueDate,
        priority,
        confidence: 0.7,
        context: `From: "${meetingTitle}"`,
      });
    }
  }

  return actionItems;
}

// Generate meeting summary
export interface MeetingSummary {
  title: string;
  duration: number;
  participants: string[];
  keyDecisions: string[];
  actionItemsCount: number;
  nextSteps: string[];
}

export async function generateMeetingSummary(
  transcript: string,
  title: string,
  participants: string[]
): Promise<MeetingSummary> {
  // Extract decisions (sentences with consensus words)
  const decisionKeywords = [
    'agreed',
    'decided',
    'resolved',
    'concluded',
    'confirmed',
  ];

  const decisionSentences = transcript
    .split(/[.!?]+/)
    .filter(s => decisionKeywords.some(k => s.toLowerCase().includes(k)))
    .map(s => s.trim());

  // Extract next steps
  const nextStepKeywords = ['next', 'then', 'after', 'following'];
  const nextSteps = transcript
    .split(/[.!?]+/)
    .filter(s => nextStepKeywords.some(k => s.toLowerCase().includes(k)))
    .slice(0, 3)
    .map(s => s.trim());

  return {
    title,
    duration: 0, // Would be calculated from actual meeting data
    participants,
    keyDecisions: decisionSentences,
    actionItemsCount: 0, // Would be populated from extractActionItems
    nextSteps,
  };
}

// Convert meeting action items to tasks
export async function convertActionItemsToTasks(
  actionItems: MeetingActionItem[],
  userId?: number
): Promise<
  Array<{
    name: string;
    description?: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
    assignee?: string;
  }>
> {
  return actionItems.map(item => ({
    name: item.description,
    description: item.context,
    dueDate: item.dueDate,
    priority: item.priority,
    assignee: item.assignee,
  }));
}
