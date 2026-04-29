export type XPost = {
  id: string
  text: string          // original tweet text (for display)
  cleanedText: string   // stripped of @mentions, URLs, RT prefix (for FinBERT)
  authorUsername: string | null
  authorName: string | null
  permalink: string
  likeCount: number
  replyCount: number
  retweetCount: number
  quoteCount: number
  createdAt: Date
}
