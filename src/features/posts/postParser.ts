import type { ParsedPost } from './post.types';

/**
 * Deterministic parser for WhatsApp-style placement messages.
 * Exclusively executes in local TypeScript without external AI API dependencies.
 */
export const postParser = {
  parse(text: string): { isMultiple: boolean; posts: ParsedPost[]; error: string | null } {
    const trimmed = text.trim();
    if (!trimmed) {
      return { isMultiple: false, posts: [], error: 'Pasted content is empty.' };
    }

    // Normalize Windows carriage returns
    const normalized = trimmed.replace(/\r\n/g, '\n');

    // Extract all URLs in the entire message
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const allUrls = normalized.match(urlRegex) || [];

    // Rule: If there is less than 2 URLs in the entire text,
    // do not split the message at all. Treat it as a single block!
    if (allUrls.length < 2) {
      const firstLine = normalized.split('\n')[0].replace(/[\*\#\_]/g, '').trim();
      const hasUrl = allUrls.length === 1;

      // Extract Company and Title if it looks like: Company - Title
      let companyName: string | undefined;
      let opportunityTitle: string = firstLine || 'Notice Update';

      const splitPatterns = [/\s+-\s+/, /\s+—\s+/, /\s+–\s+/, /\s*:\s*/];
      for (const pattern of splitPatterns) {
        const parts = firstLine.split(pattern);
        if (parts.length >= 2) {
          companyName = parts[0].trim();
          opportunityTitle = parts.slice(1).join(' - ').trim();
          break;
        }
      }

      return {
        isMultiple: false,
        posts: [
          {
            originalContent: normalized,
            postType: hasUrl ? 'opportunity' : 'announcement',
            companyName,
            opportunityTitle
          }
        ],
        error: null
      };
    }

    // Split by double newlines to segment opportunities
    const blocks = normalized.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length > 0);

    const parsedPosts: ParsedPost[] = [];
    let unconfidentSplit = false;

    for (const block of blocks) {
      const blockUrls = block.match(urlRegex) || [];
      const isOpportunity = blockUrls.length > 0;

      // First line of the block serves as the metadata source
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const firstLine = lines[0] || '';
      const cleanTitle = firstLine.replace(/[\*\#\_]/g, '').trim();

      let companyName: string | undefined;
      let opportunityTitle = cleanTitle || (isOpportunity ? 'Opportunity Notice' : 'Placement Announcement');

      // Attempt to split title on typical WhatsApp separators
      const splitPatterns = [/\s+-\s+/, /\s+—\s+/, /\s+–\s+/, /\s*:\s*/];
      let splitSuccess = false;

      for (const pattern of splitPatterns) {
        const parts = cleanTitle.split(pattern);
        if (parts.length >= 2) {
          companyName = parts[0].trim();
          opportunityTitle = parts.slice(1).join(' - ').trim();
          splitSuccess = true;
          break;
        }
      }

      // If split failed but we have a hyphen, check if we can split reasonably
      if (!splitSuccess && cleanTitle.includes('-')) {
        const parts = cleanTitle.split('-');
        if (parts[0].trim().length > 2 && parts[1].trim().length > 2) {
          companyName = parts[0].trim();
          opportunityTitle = parts.slice(1).join('-').trim();
        }
      }

      // Parser Edge Case Warning:
      // If a block is identified as an opportunity but we couldn't separate a company name,
      // it might indicate an ambiguous format. We track this to show a warning if needed.
      if (isOpportunity && !companyName) {
        unconfidentSplit = true;
      }

      parsedPosts.push({
        originalContent: block,
        postType: isOpportunity ? 'opportunity' : 'announcement',
        companyName,
        opportunityTitle
      });
    }

    // Double check: if we found opportunities, but one block has no URL and seems like a dangling line,
    // we want to ensure we don't return an empty array.
    if (parsedPosts.length === 0) {
      return {
        isMultiple: false,
        posts: [],
        error: "We couldn't confidently separate this message. Try editing the text format."
      };
    }

    return {
      isMultiple: parsedPosts.length > 1,
      posts: parsedPosts,
      error: unconfidentSplit ? 'Ambiguous blocks detected: some opportunities are missing distinct company headers.' : null
    };
  }
};
