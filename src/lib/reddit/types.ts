export type RedditPost = {
  id: string
  permalink: string
  subreddit: string
  author: string | null
  title: string
  body: string
  upvotes: number
  commentCount: number
  postedAt: Date
}
