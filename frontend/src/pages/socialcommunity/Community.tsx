import { useState, useEffect, useMemo } from "react";
import Header from "../../components/Header";
import NavBar from "../../components/NavBar";
import { apiFetch } from "../../utils/api";
import { socket } from "../../utils/socket";
import {
  Heart,
  MessageCircle,
  Flag,
  Send,
  Clock,
  User,
  AlertCircle,
  Search,
  X,
  Trash2,
  ThumbsUp,
  Smile,
  Meh,
  Frown,
  Flame,
  Edit,

} from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";

/* TYPES */
type Comment = {
  _id: string;
  text: string;
  author: string;
  authorId: string;
};

type Post = {
  _id: string;
  author: string;
  authorId: string;
  text: string;
  createdAt: string;
  editedAt?: string;
  comments: Comment[];
  reactions: { [key: string]: number };
  userReactions?: { [key: string]: string };
  hashtags: string[];
};

const QUOTES = [
  "Stay aware. Stay safe. Stay strong.",
  "Your voice can save someone today.",
  "Together, we build a safer community.",
  "Speak up — your story matters.",
];

const REACTION_ICONS = {
  heart: { icon: Heart, color: "text-red-500", bg: "bg-red-50" },
  thumbsup: { icon: ThumbsUp, color: "text-blue-500", bg: "bg-blue-50" },
  smile: { icon: Smile, color: "text-yellow-500", bg: "bg-yellow-50" },
  meh: { icon: Meh, color: "text-orange-500", bg: "bg-orange-50" },
  sad: { icon: Frown, color: "text-purple-500", bg: "bg-purple-50" },
  fire: { icon: Flame, color: "text-orange-600", bg: "bg-orange-50" },
};

const REACTION_OPTIONS = Object.entries(REACTION_ICONS).map(([key, value]) => ({
  key,
  Icon: value.icon,
  color: value.color,
  bg: value.bg
}));

const SocialCommunity = ({ setPage }: { setPage: (p: string) => void }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [quote, setQuote] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editText, setEditText] = useState("");

  /* MODAL STATES */
  const [openComposer, setOpenComposer] = useState(false);
  const [openComments, setOpenComments] = useState<Post | null>(null);
  const [openReport, setOpenReport] = useState<Post | null>(null);

  /* INPUT STATES */
  const [composerText, setComposerText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [reportReason, setReportReason] = useState("");

  /* GET USER ID FROM TOKEN */
  const getUserIdFromToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id;
    } catch {
      return null;
    }
  };

  const currentUserId = getUserIdFromToken();

  /* INIT */
  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    loadPosts();
  }, []);

  /* LOAD POSTS */
  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/community");
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("Load posts failed", err);
    } finally {
      setLoading(false);
    }
  };

  /* SOCKET.IO LISTENERS */
  useEffect(() => {
    socket.on("community:newPost", (post: Post) => {
      setPosts(prev => [post, ...prev]);
    });

    socket.on("community:updatePost", (updated: Post) => {
      setPosts(prev =>
        prev.map(p => (p._id === updated._id ? updated : p))
      );

      // update open comment modal live
      if (openComments?._id === updated._id) {
        setOpenComments(updated);
      }
    });

    socket.on("community:deletePost", (postId: string) => {
      setPosts(prev => prev.filter(p => p._id !== postId));
    });

    return () => {
      socket.off("community:newPost");
      socket.off("community:updatePost");
      socket.off("community:deletePost");
    };
  }, [openComments]);


  /* HASHTAGS */
  const extractHashtags = (text: string): string[] => {
    const hashtags = text.match(/#[\w\u0590-\u05ff]+/g);
    return hashtags ? [...new Set(hashtags.map(tag => tag.toLowerCase()))] : [];
  };

  /* CREATE POST */
  const submitPost = async () => {
    if (!composerText.trim()) return;

    try {
      setIsLoading(true);
      const res = await apiFetch("/api/community", {
        method: "POST",
        body: JSON.stringify({
          text: composerText,
          hashtags: extractHashtags(composerText),
        }),
      });
      const post = await res.json();
      setPosts(prev => [post, ...prev]);
      setComposerText("");
      setOpenComposer(false);
      toast.success("Post created successfully");
    } finally {
      setIsLoading(false);
    }
  };

  /* DELETE POST */
  const deletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    await apiFetch(`/api/community/${id}`, { method: "DELETE" });
    setPosts(prev => prev.filter(p => p._id !== id));
    toast.success("Post deleted successfully");
  };

  /* REACT */
  const addReaction = async (postId: string, reactionType: string) => {
    try {
      const res = await apiFetch(`/api/community/${postId}/react`, {
        method: "POST",
        body: JSON.stringify({ reaction: reactionType }),
      });
      const updated = await res.json();
      setPosts(prev => prev.map(p => (p._id === updated._id ? updated : p)));
      setActiveReactionMenu(null);
    } catch (err) {
      console.error("React failed", err);
    }
  };

  /* COMMENT */
  const addComment = async () => {
    if (!commentText.trim() || !openComments) return;

    try {
      setIsLoading(true);
      const res = await apiFetch(
        `/api/community/${openComments._id}/comment`,
        {
          method: "POST",
          body: JSON.stringify({ text: commentText }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        toast.warning(err.message);
        return;
      }
      const updated = await res.json();

      setPosts(prev => prev.map(p => (p._id === updated._id ? updated : p)));
      setCommentText("");
      setOpenComments(updated);
    } finally {
      setIsLoading(false);
    }
  };

  /* REPORT */
  const submitReport = async () => {
    if (!reportReason.trim() || !openReport) return;
    try {
      setIsLoading(true);
      await apiFetch(`/api/community/${openReport._id}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: reportReason }),
      });
      toast.success("Report submitted for admin review. Thank you for helping keep our community safe.");
      setReportReason("");
      setOpenReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  /* EDIT POST */
  const updatePost = async () => {
    if (!editPost || !editText.trim()) return;

    try {
      setIsLoading(true);
      const res = await apiFetch(`/api/community/${editPost._id}`, {
        method: "PUT",
        body: JSON.stringify({ text: editText }),
      });

      const updated = await res.json();
      setPosts(prev => prev.map(p => (p._id === updated._id ? updated : p)));
      setEditPost(null);
      setEditText("");
      toast.success("Post updated successfully");
    } finally {
      setIsLoading(false);
    }
  };

  /* DELETE COMMENT */
  const deleteComment = async (postId: string, commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await apiFetch(
        `/api/community/${postId}/comment/${commentId}`,
        { method: "DELETE" }
      );

      setPosts(prev =>
        prev.map(post =>
          post._id === postId
            ? {
              ...post,
              comments: post.comments.filter(comment => comment._id !== commentId)
            }
            : post
        )
      );
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  /* SEARCH */
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;

    const query = searchQuery.toLowerCase();
    return posts.filter(post =>
      post.text.toLowerCase().includes(query) ||
      post.hashtags.some(tag => tag.includes(query)) ||
      post.author.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  // Get all unique hashtags from posts
  const allHashtags = useMemo(() => {
    const hashtags = new Set<string>();
    posts.forEach(post => {
      post.hashtags.forEach(tag => hashtags.add(tag));
    });
    return Array.from(hashtags);
  }, [posts]);

  // Helper function to check if post belongs to current user
  const isCurrentUsersPost = (post: Post): boolean => {
    return post.authorId === currentUserId;
  };

  // Helper function to check if comment belongs to current user
  const isCurrentUsersComment = (comment: Comment): boolean => {
    return comment.authorId === currentUserId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pt-20 pb-32">
      <ToastContainer position="top-center" />
      <Header onNavigate={(p) => setPage(p)} />

      {/* Enhanced Quote Section */}
      <div className="mx-auto max-w-2xl px-4 mt-4">
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-r-lg p-4 shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="text-red-500 mr-3 flex-shrink-0" size={20} />
            <p className="text-red-700 font-medium">{quote}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-md mx-auto px-4 mt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts, hashtags, or authors..."
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Hashtag Suggestions */}
        {searchQuery && allHashtags.some(tag => tag.includes(searchQuery.toLowerCase().replace('#', ''))) && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-2">Suggested hashtags:</p>
            <div className="flex flex-wrap gap-2">
              {allHashtags
                .filter(tag => tag.includes(searchQuery.toLowerCase().replace('#', '')))
                .map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(tag)}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm hover:bg-blue-100 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* POSTS */}
      <main className="max-w-md mx-auto px-4 mt-6 space-y-5">
        {loading && filteredPosts.length === 0 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        )}

        {!loading && filteredPosts.length === 0 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="text-gray-400 mb-3">
              <Search size={48} className="mx-auto opacity-50" />
            </div>
            <h3 className="font-semibold text-gray-600 mb-2">No posts found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery ? `No results for "${searchQuery}"` : "Be the first to share something with the community"}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={() => setOpenComposer(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Create First Post
              </button>
            )}
          </div>
        )}

        {filteredPosts.map(p => {
          const isCurrentUserPost = isCurrentUsersPost(p);

          return (
            <div key={p._id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mr-3">
                    <User size={16} className="text-red-600" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="font-semibold text-gray-800">{p.author}</span>
                      {isCurrentUserPost && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">You</span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-0.5">
                      <Clock size={12} className="mr-1" />
                      {p.createdAt}
                    </div>
                  </div>
                </div>

                {/* Post Actions Menu */}
                {isCurrentUserPost && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditPost(p);
                        setEditText(p.text);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-sm font-medium"
                      title="Edit post"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => deletePost(p._id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                      title="Delete post"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>

              {/* Post Content */}
              <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-wrap">
                {p.text.split(' ').map((word, idx) =>
                  word.startsWith('#') ? (
                    <span
                      key={idx}
                      className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      onClick={() => setSearchQuery(word.toLowerCase())}
                    >
                      {word}{' '}
                    </span>
                  ) : (
                    <span key={idx}>{word} </span>
                  )
                )}
              </p>

              {/* Hashtags */}
              {p.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {p.hashtags.map((tag, index) => (
                    <button
                      key={index}
                      onClick={() => setSearchQuery(tag)}
                      className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm hover:bg-blue-100 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Reactions */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {Object.entries(p.reactions || {}).map(([type, count]) => {
                    const reaction = REACTION_ICONS[type as keyof typeof REACTION_ICONS];
                    if (!reaction) return null;

                    const Icon = reaction.icon;
                    return (
                      <div key={type} className="flex items-center gap-1">
                        <div className={`p-1 rounded-full ${reaction.bg}`}>
                          <Icon size={16} className={reaction.color} />
                        </div>
                        <span className="text-xs text-gray-600">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Reaction Menu */}
                <div className="relative">
                  <button
                    onClick={() => setActiveReactionMenu(activeReactionMenu === p._id ? null : p._id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Smile size={18} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">React</span>
                  </button>

                  {activeReactionMenu === p._id && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-10 animate-slideUp">
                      <div className="flex gap-2">
                        {REACTION_OPTIONS.map(({ key, Icon, color, bg }) => (
                          <button
                            key={key}
                            onClick={() => addReaction(p._id, key)}
                            className={`p-2 rounded-full hover:scale-110 transition-transform ${bg} ${p.userReactions && p.userReactions[currentUserId || ''] === key ? 'ring-2 ring-offset-2 ring-gray-300' : ''
                              }`}
                            title={key}
                          >
                            <Icon size={20} className={color} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <button
                  onClick={() => setOpenComments(p)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <MessageCircle size={18} />
                  <span className="font-medium">{p.comments.length}</span>
                </button>

                <button
                  onClick={() => setOpenReport(p)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Flag size={18} />
                  <span className="font-medium">Report</span>
                </button>
              </div>
            </div>
          )
        })}
      </main>

      {/* Enhanced Floating Button */}
      <button
        onClick={() => setOpenComposer(true)}
        className="
          fixed right-6 bottom-28 
          bg-gradient-to-r from-red-500 to-red-600 
          text-white px-5 py-3 rounded-full shadow-lg z-50
          hover:from-red-600 hover:to-red-700 active:scale-95 
          transition-all duration-200 flex items-center gap-2
          shadow-red-200
        "
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Post
      </button>

      {/* Enhanced New Post Modal */}
      {openComposer && (
        <Modal onClose={() => setOpenComposer(false)} title="Create New Post">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share your thoughts with the community
            </label>
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder="What's on your mind? Use #hashtags to categorize your post..."
              className="w-full h-40 border border-gray-300 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow"
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {composerText.length}/500 characters
              </span>
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <span>ⓘ</span>
                <span>Use # for hashtags</span>
              </div>
            </div>

            {/* Hashtag Preview */}
            {extractHashtags(composerText).length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Hashtags in your post:</p>
                <div className="flex flex-wrap gap-2">
                  {extractHashtags(composerText).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Hashtags Suggestions */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Popular hashtags:</p>
              <div className="flex flex-wrap gap-2">
                {['#support', '#awareness', '#safety', '#community', '#share'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setComposerText(prev => prev + ' ' + tag)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setOpenComposer(false)}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                submitPost();
              }}
              disabled={!composerText.trim() || isLoading}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${!composerText.trim() || isLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                }`}
            >
              {isLoading ? "Posting..." : "Post to Community"}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Post Modal */}
      {editPost && (
        <Modal title="Edit Post" onClose={() => setEditPost(null)}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Edit your post
            </label>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full h-40 border border-gray-300 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow"
              placeholder="Edit your post content..."
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {editText.length}/500 characters
              </span>
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <span>ⓘ</span>
                <span>Hashtags will be updated automatically</span>
              </div>
            </div>

            {/* Hashtag Preview */}
            {extractHashtags(editText).length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Updated hashtags:</p>
                <div className="flex flex-wrap gap-2">
                  {extractHashtags(editText).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setEditPost(null)}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={updatePost}
              disabled={!editText.trim() || isLoading}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${!editText.trim() || isLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                }`}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* Enhanced Comments Modal */}
      {openComments && (
        <Modal onClose={() => setOpenComments(null)} title="Comments">
          <div className="mb-6">
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-2">
                  <User size={14} className="text-red-600" />
                </div>
                <span className="font-semibold text-sm">{openComments.author}</span>
              </div>
              <p className="text-gray-700 text-sm">{openComments.text}</p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {openComments.comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                openComments.comments.map(c => {
                  const isCurrentUserComment = isCurrentUsersComment(c);

                  return (
                    <div key={c._id} className="flex items-start gap-3 group">
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={12} className="text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs">{c.author || "Anonymous"}</span>
                            {isCurrentUserComment && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">You</span>
                            )}
                          </div>

                          {isCurrentUserComment && (
                            <button
                              onClick={async () => {
                                const res = await apiFetch(
                                  `/api/community/${openComments!._id}/comment/${c._id}`,
                                  { method: "DELETE" }
                                );

                                const updatedPost = await res.json();

                                // 🔥 UPDATE STATE IMMEDIATELY
                                setPosts(prev =>
                                  prev.map(p =>
                                    p._id === updatedPost._id ? updatedPost : p
                                  )
                                );

                                // Also update openComments modal content
                                setOpenComments(updatedPost);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1"
                              title="Delete comment"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg rounded-tl-none">
                          <p className="text-sm text-gray-700">{c.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && addComment()}
            />
            <button
              onClick={addComment}
              disabled={!commentText.trim() || isLoading}
              className={`px-4 rounded-xl transition-colors ${!commentText.trim() || isLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-500 text-white hover:bg-red-600"
                }`}
            >
              <Send size={20} />
            </button>
          </div>
        </Modal>
      )}

      {/* Enhanced Report Modal */}
      {openReport && (
        <Modal onClose={() => setOpenReport(null)} title="Report Content">
          <div className="mb-6">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
              <div className="flex items-center text-red-600 mb-2">
                <AlertCircle size={18} className="mr-2" />
                <span className="font-medium">Why are you reporting this?</span>
              </div>
              <p className="text-sm text-gray-600">
                Your report is anonymous. The admin will review this content within 24 hours.
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a reason
              </label>
              {["Harassment", "False information", "Inappropriate content", "Spam", "Other"].map(reason => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${reportReason === reason
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={reportReason.startsWith("Other") ? reportReason : ""}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please provide more details..."
                className="w-full h-32 border border-gray-300 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setOpenReport(null)}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitReport}
              disabled={!reportReason.trim() || isLoading}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${!reportReason.trim() || isLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
                }`}
            >
              {isLoading ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </Modal>
      )}

      <NavBar onNavigate={(p) => setPage(p)} />

      {/* Add animation styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

/* Enhanced Modal Component */
const Modal = ({ children, onClose, title }: any) => (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fadeIn">
    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl animate-slideUp max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  </div>
);

export default SocialCommunity;