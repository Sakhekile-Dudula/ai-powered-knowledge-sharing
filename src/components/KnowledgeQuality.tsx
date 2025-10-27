import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { supabase } from '../lib/supabase';
import { 
  Clock, 
  AlertTriangle, 
  History, 
  FileText,
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  GitBranch
} from 'lucide-react';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  category: string;
  is_deprecated: boolean;
  deprecation_reason?: string;
  freshness_score: number;
  version: number;
}

interface PeerReview {
  id: string;
  knowledge_item_id: string;
  reviewer_id: string;
  reviewer_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes';
  rating: number;
  comments: string;
  created_at: string;
}

interface Version {
  id: string;
  knowledge_item_id: string;
  version_number: number;
  content: string;
  title: string;
  changed_by: string;
  change_summary: string;
  created_at: string;
}

export default function KnowledgeQuality() {
  const [activeTab, setActiveTab] = useState('browse');
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [reviews, setReviews] = useState<PeerReview[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'needs_changes'>('approved');

  useEffect(() => {
    loadCurrentUser();
    loadKnowledgeItems();
  }, []);

  useEffect(() => {
    if (selectedItem) {
      loadReviews(selectedItem.id);
      loadVersions(selectedItem.id);
    }
  }, [selectedItem]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadKnowledgeItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKnowledgeItems(data || []);
    } catch (error) {
      console.error('Error loading knowledge items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from('peer_reviews')
        .select('*')
        .eq('knowledge_item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadVersions = async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from('knowledge_versions')
        .select('*')
        .eq('knowledge_item_id', itemId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const submitReview = async () => {
    if (!selectedItem || !currentUserId) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUserId)
        .single();

      const { error } = await supabase
        .from('peer_reviews')
        .insert({
          knowledge_item_id: selectedItem.id,
          reviewer_id: currentUserId,
          reviewer_name: profile?.full_name || 'Anonymous',
          status: reviewStatus,
          rating: reviewRating,
          comments: reviewComments
        });

      if (error) throw error;

      // Reload reviews
      await loadReviews(selectedItem.id);
      
      // Reset form
      setReviewRating(5);
      setReviewComments('');
      setReviewStatus('approved');
      
      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    }
  };

  const getFreshnessColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getFreshnessLabel = (score: number) => {
    if (score >= 80) return 'Fresh';
    if (score >= 50) return 'Moderate';
    return 'Stale';
  };

  const getAverageRating = (itemId: string) => {
    const itemReviews = reviews.filter(r => r.knowledge_item_id === itemId);
    if (itemReviews.length === 0) return 0;
    const sum = itemReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / itemReviews.length).toFixed(1);
  };

  const renderBrowseTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Knowledge Base</h3>
        <Button onClick={loadKnowledgeItems} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-3">
          {knowledgeItems.map(item => (
            <Card 
              key={item.id} 
              className={`p-4 hover:shadow-lg transition-shadow cursor-pointer ${
                item.is_deprecated ? 'border-red-300 dark:border-red-700' : ''
              }`}
              onClick={() => setSelectedItem(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{item.title}</h4>
                    {item.is_deprecated && (
                      <span className="flex items-center gap-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        Deprecated
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                    {item.content}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      v{item.version}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {getAverageRating(item.id) || 'No reviews'}
                    </span>
                    <span className={`flex items-center gap-1 ${getFreshnessColor(item.freshness_score)}`}>
                      <Clock className="w-3 h-3" />
                      {getFreshnessLabel(item.freshness_score)}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {item.author_name}
                    </span>
                  </div>

                  {item.is_deprecated && item.deprecation_reason && (
                    <div className="mt-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-2 rounded">
                      <strong>Deprecation notice:</strong> {item.deprecation_reason}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderReviewTab = () => (
    <div className="space-y-4">
      {!selectedItem ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          Select a knowledge item from the Browse tab to review it
        </div>
      ) : (
        <>
          <Card className="p-4 bg-slate-50 dark:bg-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{selectedItem.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{selectedItem.content}</p>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              By {selectedItem.author_name} • Version {selectedItem.version}
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Submit Review</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Status
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={reviewStatus === 'approved' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReviewStatus('approved')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant={reviewStatus === 'needs_changes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReviewStatus('needs_changes')}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Needs Changes
                  </Button>
                  <Button
                    variant={reviewStatus === 'rejected' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReviewStatus('rejected')}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rating: {reviewRating}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Comments
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  rows={4}
                  placeholder="Provide feedback on accuracy, clarity, completeness..."
                />
              </div>

              <Button onClick={submitReview} className="w-full">
                Submit Review
              </Button>
            </div>
          </Card>

          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 dark:text-white">Previous Reviews</h4>
            {reviews.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">No reviews yet</p>
            ) : (
              reviews.map(review => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">{review.reviewer_name}</span>
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {review.rating}/10
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      review.status === 'approved' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                      review.status === 'rejected' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                      'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {review.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{review.comments}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderVersionHistoryTab = () => (
    <div className="space-y-4">
      {!selectedItem ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          Select a knowledge item from the Browse tab to view its version history
        </div>
      ) : (
        <>
          <Card className="p-4 bg-slate-50 dark:bg-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{selectedItem.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Current Version: {selectedItem.version} • Last Updated: {new Date(selectedItem.updated_at).toLocaleDateString()}
            </p>
          </Card>

          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5" />
              Version History
            </h4>
            {versions.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">No version history available</p>
            ) : (
              versions.map((version, index) => (
                <Card key={version.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                        v{version.version_number}
                      </span>
                      {index === 0 && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(version.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h5 className="font-medium text-slate-900 dark:text-white mb-2">{version.title}</h5>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-3">
                    {version.content}
                  </p>

                  {version.change_summary && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-2 rounded text-xs mb-2">
                      <strong>Changes:</strong> {version.change_summary}
                    </div>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Modified by {version.changed_by}
                  </p>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Knowledge Quality</h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <Button
          variant={activeTab === 'browse' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('browse')}
          className="rounded-b-none"
        >
          <FileText className="w-4 h-4 mr-2" />
          Browse
        </Button>
        <Button
          variant={activeTab === 'review' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('review')}
          className="rounded-b-none"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Peer Review
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('history')}
          className="rounded-b-none"
        >
          <History className="w-4 h-4 mr-2" />
          Version History
        </Button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'browse' && renderBrowseTab()}
        {activeTab === 'review' && renderReviewTab()}
        {activeTab === 'history' && renderVersionHistoryTab()}
      </div>
    </div>
  );
}
