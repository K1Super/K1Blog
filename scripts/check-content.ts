import { getAllPosts, getAllTags } from '../features/content/loader';

try {
  const posts = getAllPosts();
  if (posts.length === 0) {
    throw new Error('content/posts 下没有可发布的文章');
  }
  const tags = getAllTags();
  console.log(`content ok: ${posts.length} posts, ${tags.length} tags`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
