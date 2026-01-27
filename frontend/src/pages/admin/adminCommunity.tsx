import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "../../utils/api";
import {
  Trash2, MessageCircle, AlertTriangle, Shield,
  RefreshCw, User, Calendar, Flag, Eye, EyeOff, CheckCircle,
  XCircle, ChevronRight, Search, FileText
} from "lucide-react";
import { toast } from "react-toastify";

type Comment = {
  _id: string;
  text: string;
  author: string;
};

type Post = {
  _id: string;
  author: string;
  text: string;
  createdAt: string;
  comments: Comment[];
  reactions: Record<string, number>;
  reportCount: number;
  reportReasons: string[];
  latestReportId?: string;
};

const AdminCommunity = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "reported" | "clean">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/community/admin/all", {}, true);
      const data = await res.json();

      if (Array.isArray(data)) {
        setPosts(data);
        if (data.length > 0 && !selectedPost) {
          setSelectedPost(data[0]);
        }
      } else {
        toast.error(data.message || "Failed to load community posts");
      }
    } catch {
      toast.error("Failed to load community posts");
    } finally {
      setIsLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Permanently delete this post and all its comments?")) return;

    setIsDeleting(true);
    try {
      await apiFetch(`/api/community/admin/post/${id}`, { method: "DELETE" }, true);
      setPosts(p => p.filter(x => x._id !== id));
      if (selectedPost?._id === id) {
        const remaining = posts.filter(p => p._id !== id);
        setSelectedPost(remaining.length > 0 ? remaining[0] : null);
      }
      toast.success("Post deleted successfully");
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    if (!confirm("Delete this comment?")) return;

    try {
      const res = await apiFetch(
        `/api/community/admin/post/${postId}/comment/${commentId}`,
        { method: "DELETE" },
        true
      );
      const data = await res.json();
      setPosts(p =>
        p.map(post => (post._id === postId ? data.post : post))
      );
      if (selectedPost?._id === postId) {
        setSelectedPost(data.post);
      }
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const resolveReport = async (postId: string) => {
    if (!postId) return;
    if (!confirm("Delete this post and mark all reports as resolved?")) return;

    try {
      const res = await apiFetch(
        `/api/community/admin/report/resolve/${postId}`,
        { method: "POST" },
        true
      );

      if (!res.ok) throw new Error("Failed to resolve report");

      toast.success("Post deleted & reports resolved");
      setPosts(p => {
        const filtered = p.filter(x => x._id !== postId);
        if (selectedPost?._id === postId) {
          setSelectedPost(filtered.length > 0 ? filtered[0] : null);
        }
        return filtered;
      });
    } catch (err) {
      toast.error("Failed to resolve report");
    }
  };

  const dismissReport = async (reportId?: string) => {
    if (!reportId) {
      toast.error("No report selected to dismiss");
      return;
    }

    if (!confirm("Dismiss this report as false? The post will remain visible.")) return;

    try {
      const res = await apiFetch(
        `/api/community/admin/report/dismiss/${reportId}`,
        { method: "DELETE" },
        true
      );

      if (!res.ok) throw new Error("Failed to dismiss report");

      toast.success("Report dismissed as false");
      loadPosts();
    } catch (err) {
      toast.error("Failed to dismiss report");
    }
  };

  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // Apply filter type
    if (filterType === "reported") {
      filtered = filtered.filter(post => post.reportCount > 0);
    } else if (filterType === "clean") {
      filtered = filtered.filter(post => post.reportCount === 0);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(post =>
        post.text.toLowerCase().includes(term) ||
        post.author.toLowerCase().includes(term) ||
        post.comments.some(comment =>
          comment.text.toLowerCase().includes(term) ||
          comment.author.toLowerCase().includes(term)
        )
      );
    }

    return filtered;
  }, [posts, filterType, searchTerm]);

  const stats = useMemo(() => ({
    totalPosts: posts.length,
    reportedPosts: posts.filter(p => p.reportCount > 0).length,
    cleanPosts: posts.filter(p => p.reportCount === 0).length,
    totalComments: posts.reduce((sum, post) => sum + post.comments.length, 0),
    totalReports: posts.reduce((sum, post) => sum + post.reportCount, 0),
  }), [posts]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  //    console.log("Selected post:", selectedPost);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Community Moderation</h1>
                <p className="text-sm text-gray-600">Manage and moderate community content</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadPosts}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/*statistics*/}
      <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reported Posts</p>
                <p className="text-2xl font-bold text-red-600">{stats.reportedPosts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clean Posts</p>
                <p className="text-2xl font-bold text-green-600">{stats.cleanPosts}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Comments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalComments}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Posts List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
              {/* Panel Header */}
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 mb-3">Community Posts</h2>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search posts, authors, comments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${filterType === "all"
                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    All ({stats.totalPosts})
                  </button>
                  <button
                    onClick={() => setFilterType("reported")}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${filterType === "reported"
                      ? "bg-red-100 text-red-700 border border-red-300"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    Reported ({stats.reportedPosts})
                  </button>
                  <button
                    onClick={() => setFilterType("clean")}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${filterType === "clean"
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    Clean ({stats.cleanPosts})
                  </button>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-700">Total Posts</span>
                    </div>
                    <p className="text-xl font-bold text-blue-900">{stats.totalPosts}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-xs text-red-700">Reports</span>
                    </div>
                    <p className="text-xl font-bold text-red-900">{stats.totalReports}</p>
                  </div>
                </div>
              </div>

              {/* Posts List */}
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="p-8 text-center">
                    <EyeOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {searchTerm ? "No matching posts found" : "No posts to display"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredPosts.map(post => (
                      <div
                        key={post._id}
                        onClick={() => setSelectedPost(post)}
                        className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${selectedPost?._id === post._id
                          ? "bg-blue-50 border-r-4 border-blue-500"
                          : ""
                          } ${post.reportCount > 0 ? "border-l-4 border-red-500" : ""}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{post.author}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(post.createdAt)}
                              </p>
                            </div>
                          </div>
                          {post.reportCount > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                              <Flag className="h-3 w-3" />
                              {post.reportCount}
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                          {post.text}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {post.comments.length} comments
                            </span>
                          </div>
                          <ChevronRight className={`h-4 w-4 ${selectedPost?._id === post._id ? "text-blue-600" : "text-gray-400"
                            }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Post Details & Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
              {selectedPost ? (
                <>
                  {/* Post Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <h2 className="font-bold text-gray-900">{selectedPost.author}</h2>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Posted {formatDate(selectedPost.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {selectedPost.reportCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full text-sm">
                              <AlertTriangle className="h-4 w-4" />
                              {selectedPost.reportCount} Report{selectedPost.reportCount > 1 ? 's' : ''}
                            </span>
                          )}
                          <span className="text-sm text-gray-600">
                            {selectedPost.comments.length} comments
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deletePost(selectedPost._id)}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        {isDeleting ? "Deleting..." : "Delete Post"}
                      </button>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="prose prose-gray max-w-none">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {selectedPost.text}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reports Section */}
                  {selectedPost.reportCount > 0 && (
                    <div className="p-6 border-b border-gray-200 bg-red-50/30">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">Reports Summary</h3>
                          <p className="text-sm text-gray-600">
                            Review reported content before taking action
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <h4 className="font-medium text-gray-700">Report Reasons:</h4>
                        <div className="space-y-2">
                          {selectedPost.reportReasons.map((reason, i) => (
                            <div key={i} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-200">
                              <div className="h-2 w-2 rounded-full bg-red-500 mt-2"></div>
                              <p className="text-gray-700">{reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => resolveReport(selectedPost._id)}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Post & Resolve Reports
                        </button>
                        <button
                          onClick={() => dismissReport(selectedPost.latestReportId)}
                          className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Dismiss Report
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Comments Section */}
                  <div className="p-6 flex-1 overflow-y-auto max-h-[calc(100vh-500px)]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="h-6 w-6 text-blue-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">Comments</h3>
                          <p className="text-sm text-gray-600">
                            {selectedPost.comments.length} comment{selectedPost.comments.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {selectedPost.comments.length > 0 ? (
                        selectedPost.comments.map(comment => (
                          <div key={comment._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-gray-600" />
                                </div>
                                <span className="font-medium text-gray-900">{comment.author}</span>
                              </div>
                              <button
                                onClick={() => deleteComment(selectedPost._id, comment._id)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Delete comment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-gray-700 ml-10">{comment.text}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No comments on this post</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Empty State for Right Panel */
                <div className="flex flex-col items-center justify-center h-full p-8">
                  <Eye className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Post</h3>
                  <p className="text-gray-500 text-center max-w-md">
                    Choose a post from the list on the left to view details, manage comments, and moderate content.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCommunity;